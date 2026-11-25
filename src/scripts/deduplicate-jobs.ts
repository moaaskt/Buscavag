import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateJobFingerprint } from '../utils/fingerprint';
import { parseCanonicalLocation } from '../utils/geoParser';

export interface HygieneScriptOptions {
  dbPath?: string;
  apply?: boolean;
  confirmReviewed?: boolean;
}

export interface JobsSnapshot {
  totalJobs: number;
  primaryKeys: string[];
  sha256: string;
  tableCounts: Record<string, number>;
}

export interface VerifiedBackupResult {
  backupPath: string;
  restoredCheckPassed: boolean;
  snapshot: JobsSnapshot;
}

export interface DuplicateCloneDiagnostic {
  id: string;
  title: string;
  company: string;
  platform: string;
  status: string | null;
  currentFingerprint: string | null;
  canonicalFingerprint: string;
  savedRefs: number;
  hiddenRefs: number;
}

export interface DuplicateGroupDiagnostic {
  canonicalKey: string;
  matchBasis: 'existing_fingerprint' | 'canonical_fingerprint';
  primaryId: string;
  primaryTitle: string;
  primaryCompany: string;
  primaryPlatform: string;
  primaryStatus: string | null;
  primaryEngagementCount: number;
  winnerReason: string;
  clones: DuplicateCloneDiagnostic[];
  totalSavedRefsImpacted: number;
  totalHiddenRefsImpacted: number;
}

export interface DeduplicationReport {
  mode: 'dry-run' | 'apply';
  dbPath: string;
  totalExamined: number;
  fingerprintsToUpdate: number;
  fingerprintsUpdated: number;
  duplicateGroupsFound: number;
  duplicatesIdentified: number;
  duplicatesDeleted: number;
  uniqueJobsRemaining: number;
  referencingFkTables: string[];
  groups: DuplicateGroupDiagnostic[];
  backupResult?: VerifiedBackupResult;
  preSnapshot?: JobsSnapshot;
  postSnapshot?: JobsSnapshot;
}

interface JobCandidateRow {
  id: string;
  title: string;
  company: string;
  platform: string;
  location: string | null;
  description: string | null;
  status: string | null;
  is_junior_fullstack: number | null;
  overall_score: number | null;
  published_at: string | null;
  created_at: string | null;
  fingerprint: string | null;
}

interface EnrichedCandidate extends JobCandidateRow {
  canonicalLocation: string | null;
  canonicalFingerprint: string;
  savedRefs: number;
  hiddenRefs: number;
  engagementCount: number;
}

const SUPPORTED_JOBS_FK_TABLES = new Set(['user_saved_jobs', 'user_hidden_jobs']);

const SNAPSHOT_JOB_COLUMNS = [
  'id',
  'url',
  'title',
  'company',
  'platform',
  'location',
  'city',
  'state',
  'status',
  'is_tech_software',
  'is_junior_fullstack',
  'overall_score',
  'fingerprint',
  'published_at',
  'created_at',
] as const;

export function parseHygieneCliArgs(argv: string[]): Required<Pick<HygieneScriptOptions, 'apply' | 'confirmReviewed'>> & Pick<HygieneScriptOptions, 'dbPath'> {
  let dbPath: string | undefined;
  let apply = false;
  let confirmReviewed = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      apply = false;
    } else if (arg === '--apply') {
      apply = true;
    } else if (arg === '--confirm-reviewed') {
      confirmReviewed = true;
    } else if (arg === '--db') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Flag --db requer um caminho de arquivo válido.');
      }
      dbPath = path.resolve(next);
      i++;
    } else if (arg.startsWith('--db=')) {
      const val = arg.slice('--db='.length).trim();
      if (!val) {
        throw new Error('Flag --db= requer um caminho de arquivo válido.');
      }
      dbPath = path.resolve(val);
    }
  }

  return { dbPath, apply, confirmReviewed };
}

export function resolveHygieneTargetPath(explicitDbPath?: string): string {
  if (explicitDbPath && explicitDbPath.trim()) {
    return path.resolve(explicitDbPath);
  }
  if (process.env.DATABASE_PATH && process.env.DATABASE_PATH.trim()) {
    return path.resolve(process.env.DATABASE_PATH);
  }
  return path.resolve(process.cwd(), 'buscavag.db');
}

export function assertMutationAuthorized(apply: boolean, confirmReviewed: boolean, scriptLabel: string): void {
  if (apply && !confirmReviewed) {
    throw new Error(
      `[DATA-SAFETY] Recusado em ${scriptLabel}: --apply exige confirmação explícita via --confirm-reviewed após revisão humana do relatório --dry-run.`
    );
  }
}

export function getExistingTableNames(db: Database.Database): Set<string> {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC")
    .all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

export function getTableColumnNames(db: Database.Database, tableName: string): Set<string> {
  const escaped = tableName.replace(/"/g, '""');
  const cols = db.pragma(`table_info("${escaped}")`) as Array<{ name: string }>;
  return new Set(cols.map((c) => c.name));
}

export function inspectJobsReferencingTables(db: Database.Database): string[] {
  const tables = getExistingTableNames(db);
  const referencing: string[] = [];

  for (const table of tables) {
    if (table === 'jobs') continue;
    const escaped = table.replace(/"/g, '""');
    const fkList = db.pragma(`foreign_key_list("${escaped}")`) as Array<{
      table: string;
      from: string;
      to: string;
    }>;

    for (const fk of fkList) {
      if (fk.table === 'jobs') {
        if (!SUPPORTED_JOBS_FK_TABLES.has(table)) {
          throw new Error(
            `[DATA-SAFETY] Tabela "${table}" possui Foreign Key (${fk.from} -> jobs.${fk.to}) sem handler seguro de reatribuição.`
          );
        }
        if (!referencing.includes(table)) {
          referencing.push(table);
        }
      }
    }
  }

  return referencing.sort();
}

export function getJobFkReferenceCounts(db: Database.Database): {
  savedCounts: Map<string, number>;
  hiddenCounts: Map<string, number>;
} {
  const tables = getExistingTableNames(db);
  const savedCounts = new Map<string, number>();
  const hiddenCounts = new Map<string, number>();

  if (tables.has('user_saved_jobs')) {
    const rows = db
      .prepare('SELECT job_id, COUNT(*) AS cnt FROM user_saved_jobs GROUP BY job_id')
      .all() as Array<{ job_id: string; cnt: number }>;
    for (const r of rows) {
      savedCounts.set(r.job_id, Number(r.cnt));
    }
  }

  if (tables.has('user_hidden_jobs')) {
    const rows = db
      .prepare('SELECT job_id, COUNT(*) AS cnt FROM user_hidden_jobs GROUP BY job_id')
      .all() as Array<{ job_id: string; cnt: number }>;
    for (const r of rows) {
      hiddenCounts.set(r.job_id, Number(r.cnt));
    }
  }

  return { savedCounts, hiddenCounts };
}

export function verifySqliteIntegrityAndFk(db: Database.Database, contextLabel: string): void {
  const integrityRows = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
  const integrityOk =
    integrityRows.length === 1 && integrityRows[0]?.integrity_check === 'ok';
  if (!integrityOk) {
    throw new Error(
      `[INTEGRITY ERROR] PRAGMA integrity_check falhou em ${contextLabel}: ${JSON.stringify(integrityRows)}`
    );
  }

  const fkRows = db.pragma('foreign_key_check') as Array<Record<string, unknown>>;
  if (fkRows.length > 0) {
    throw new Error(
      `[FK ERROR] PRAGMA foreign_key_check detectou violações em ${contextLabel}: ${JSON.stringify(fkRows)}`
    );
  }
}

export function computeJobsSnapshot(db: Database.Database): JobsSnapshot {
  const tables = [...getExistingTableNames(db)].sort();
  const tableCounts: Record<string, number> = {};

  for (const table of tables) {
    const escaped = table.replace(/"/g, '""');
    const row = db.prepare(`SELECT COUNT(*) AS cnt FROM "${escaped}"`).get() as { cnt: number };
    tableCounts[table] = Number(row.cnt);
  }

  let jobsRows: Array<Record<string, unknown>> = [];
  if (tables.includes('jobs')) {
    const jobCols = getTableColumnNames(db, 'jobs');
    const selectedCols = SNAPSHOT_JOB_COLUMNS.filter((c) => jobCols.has(c));
    if (selectedCols.length > 0) {
      jobsRows = db
        .prepare(`SELECT ${selectedCols.join(', ')} FROM jobs ORDER BY id ASC`)
        .all() as Array<Record<string, unknown>>;
    }
  }

  const savedJobsRows = tables.includes('user_saved_jobs')
    ? (db
        .prepare('SELECT user_id, job_id, status, created_at FROM user_saved_jobs ORDER BY user_id ASC, job_id ASC')
        .all() as Array<Record<string, unknown>>)
    : [];

  const hiddenJobsRows = tables.includes('user_hidden_jobs')
    ? (db
        .prepare('SELECT user_id, job_id, created_at FROM user_hidden_jobs ORDER BY user_id ASC, job_id ASC')
        .all() as Array<Record<string, unknown>>)
    : [];

  const primaryKeys = jobsRows.map((row) => String(row.id));
  const payload = JSON.stringify({
    tableCounts,
    jobs: jobsRows,
    savedJobs: savedJobsRows,
    hiddenJobs: hiddenJobsRows,
  });
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');

  return {
    totalJobs: jobsRows.length,
    primaryKeys,
    sha256,
    tableCounts,
  };
}

export async function createVerifiedBackupAndRestoreTest(sourcePath: string): Promise<VerifiedBackupResult> {
  const resolvedSource = path.resolve(sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`[BACKUP ERROR] Banco de origem não encontrado: ${resolvedSource}`);
  }

  const backupPath = `${resolvedSource}.backup-${Date.now()}-${process.pid}.db`;
  let sourceSnapshot: JobsSnapshot;

  const sourceDb = new Database(resolvedSource, { readonly: true, fileMustExist: true });
  try {
    sourceSnapshot = computeJobsSnapshot(sourceDb);
    await sourceDb.backup(backupPath);
  } finally {
    sourceDb.close();
  }

  const backupDb = new Database(backupPath, { readonly: true, fileMustExist: true });
  try {
    verifySqliteIntegrityAndFk(backupDb, 'verified-backup');
  } finally {
    backupDb.close();
  }

  const restoreTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buscavag-restore-verify-'));
  const restorePath = path.join(restoreTempDir, 'restored.db');

  try {
    const backupReader = new Database(backupPath, { readonly: true, fileMustExist: true });
    try {
      await backupReader.backup(restorePath);
    } finally {
      backupReader.close();
    }

    const restoredDb = new Database(restorePath, { readonly: true, fileMustExist: true });
    try {
      verifySqliteIntegrityAndFk(restoredDb, 'temp-restore-verification');
      const restoredSnapshot = computeJobsSnapshot(restoredDb);

      if (JSON.stringify(restoredSnapshot.tableCounts) !== JSON.stringify(sourceSnapshot.tableCounts)) {
        throw new Error(
          `[RESTORE VERIFICATION FAILED] Contagem por tabela divergente: origem=${JSON.stringify(sourceSnapshot.tableCounts)} restaurado=${JSON.stringify(restoredSnapshot.tableCounts)}`
        );
      }

      if (restoredSnapshot.sha256 !== sourceSnapshot.sha256) {
        throw new Error(
          `[RESTORE VERIFICATION FAILED] Digest SHA-256 divergente: origem=${sourceSnapshot.sha256} restaurado=${restoredSnapshot.sha256}`
        );
      }

      if (JSON.stringify(restoredSnapshot.primaryKeys) !== JSON.stringify(sourceSnapshot.primaryKeys)) {
        throw new Error('[RESTORE VERIFICATION FAILED] Conjunto de Primary Keys divergente após restauração.');
      }
    } finally {
      restoredDb.close();
    }
  } finally {
    fs.rmSync(restoreTempDir, { recursive: true, force: true });
  }

  return {
    backupPath,
    restoredCheckPassed: true,
    snapshot: sourceSnapshot,
  };
}

function parseTimestampMs(raw?: string | null): number {
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function compareWinnerPriority(a: EnrichedCandidate, b: EnrichedCandidate): number {
  if (b.engagementCount !== a.engagementCount) {
    return b.engagementCount - a.engagementCount;
  }

  const aActive = a.status === 'active' ? 1 : 0;
  const bActive = b.status === 'active' ? 1 : 0;
  if (bActive !== aActive) {
    return bActive - aActive;
  }

  const aJr = Number(a.is_junior_fullstack ?? 0);
  const bJr = Number(b.is_junior_fullstack ?? 0);
  if (bJr !== aJr) {
    return bJr - aJr;
  }

  const aScore = Number(a.overall_score ?? 0);
  const bScore = Number(b.overall_score ?? 0);
  if (bScore !== aScore) {
    return bScore - aScore;
  }

  const aPub = parseTimestampMs(a.published_at);
  const bPub = parseTimestampMs(b.published_at);
  if (bPub !== aPub) {
    return bPub - aPub;
  }

  const aCreated = parseTimestampMs(a.created_at);
  const bCreated = parseTimestampMs(b.created_at);
  if (aCreated !== bCreated) {
    return aCreated - bCreated;
  }

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function explainWinnerReason(winner: EnrichedCandidate, runnerUp: EnrichedCandidate): string {
  if (winner.engagementCount !== runnerUp.engagementCount) {
    return `Maior engajamento de usuário (${winner.engagementCount} refs: ${winner.savedRefs} saved, ${winner.hiddenRefs} hidden vs ${runnerUp.engagementCount})`;
  }
  if ((winner.status === 'active') !== (runnerUp.status === 'active')) {
    return `Status ativo ("${winner.status}" vs "${runnerUp.status}")`;
  }
  if (Number(winner.is_junior_fullstack ?? 0) !== Number(runnerUp.is_junior_fullstack ?? 0)) {
    return `Prioridade is_junior_fullstack (${winner.is_junior_fullstack ?? 0} vs ${runnerUp.is_junior_fullstack ?? 0})`;
  }
  if (Number(winner.overall_score ?? 0) !== Number(runnerUp.overall_score ?? 0)) {
    return `Maior overall_score (${winner.overall_score ?? 0} vs ${runnerUp.overall_score ?? 0})`;
  }
  if (parseTimestampMs(winner.published_at) !== parseTimestampMs(runnerUp.published_at)) {
    return `Publicação mais recente (${winner.published_at} vs ${runnerUp.published_at})`;
  }
  if (parseTimestampMs(winner.created_at) !== parseTimestampMs(runnerUp.created_at)) {
    return `Registro original mais antigo (${winner.created_at} vs ${runnerUp.created_at})`;
  }
  return `Desempate determinístico por id ASC (${winner.id})`;
}

function findDuplicateGroups(db: Database.Database): {
  totalExamined: number;
  fingerprintsToUpdate: number;
  referencingFkTables: string[];
  groups: DuplicateGroupDiagnostic[];
  missingFingerprintRows: Array<{ id: string; canonicalFingerprint: string }>;
} {
  const referencingFkTables = inspectJobsReferencingTables(db);
  const jobCols = getTableColumnNames(db, 'jobs');

  const selectCols = [
    'id',
    'title',
    'company',
    'platform',
    jobCols.has('location') ? 'location' : 'NULL AS location',
    jobCols.has('description') ? 'description' : 'NULL AS description',
    jobCols.has('status') ? 'status' : "'active' AS status",
    jobCols.has('is_junior_fullstack') ? 'is_junior_fullstack' : '0 AS is_junior_fullstack',
    jobCols.has('overall_score') ? 'overall_score' : '0 AS overall_score',
    jobCols.has('published_at') ? 'published_at' : 'NULL AS published_at',
    jobCols.has('created_at') ? 'created_at' : 'NULL AS created_at',
    jobCols.has('fingerprint') ? 'fingerprint' : 'NULL AS fingerprint',
  ];

  const rows = db
    .prepare(`SELECT ${selectCols.join(', ')} FROM jobs ORDER BY id ASC`)
    .all() as JobCandidateRow[];

  const { savedCounts, hiddenCounts } = getJobFkReferenceCounts(db);

  const enriched: EnrichedCandidate[] = [];
  const missingFingerprintRows: Array<{ id: string; canonicalFingerprint: string }> = [];

  for (const row of rows) {
    const geo = parseCanonicalLocation(
      row.location,
      row.platform,
      row.title,
      row.description ?? undefined
    );
    const canonicalLocation = geo.canonicalLocation || row.location || null;
    const canonicalFingerprint = generateJobFingerprint(row.title, row.company, canonicalLocation);
    const storedFp = row.fingerprint?.trim() || null;

    if (!storedFp) {
      missingFingerprintRows.push({ id: row.id, canonicalFingerprint });
    }

    const savedRefs = savedCounts.get(row.id) ?? 0;
    const hiddenRefs = hiddenCounts.get(row.id) ?? 0;

    enriched.push({
      ...row,
      fingerprint: storedFp,
      canonicalLocation,
      canonicalFingerprint,
      savedRefs,
      hiddenRefs,
      engagementCount: savedRefs + hiddenRefs,
    });
  }

  // Union-Find para agrupar tanto colisões por fingerprint já persistido quanto colisões canônicas
  const parent = enriched.map((_, idx) => idx);
  const find = (x: number): number => {
    let curr = x;
    while (parent[curr] !== curr) {
      parent[curr] = parent[parent[curr]];
      curr = parent[curr];
    }
    return curr;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent[rb] = ra;
    }
  };

  const byStoredFp = new Map<string, number>();
  const byCanonicalFp = new Map<string, number>();

  for (let i = 0; i < enriched.length; i++) {
    const item = enriched[i];
    if (item.fingerprint) {
      const prev = byStoredFp.get(item.fingerprint);
      if (prev !== undefined) {
        union(prev, i);
      } else {
        byStoredFp.set(item.fingerprint, i);
      }
    }

    if (item.title.trim() && item.company.trim()) {
      const prevCanon = byCanonicalFp.get(item.canonicalFingerprint);
      if (prevCanon !== undefined) {
        union(prevCanon, i);
      } else {
        byCanonicalFp.set(item.canonicalFingerprint, i);
      }
    }
  }

  const components = new Map<number, EnrichedCandidate[]>();
  for (let i = 0; i < enriched.length; i++) {
    const root = find(i);
    const list = components.get(root);
    if (list) {
      list.push(enriched[i]);
    } else {
      components.set(root, [enriched[i]]);
    }
  }

  const groups: DuplicateGroupDiagnostic[] = [];

  for (const members of components.values()) {
    if (members.length <= 1) continue;

    const sorted = [...members].sort(compareWinnerPriority);
    const [primary, ...clones] = sorted;

    const storedFpSet = new Set(members.map((m) => m.fingerprint).filter(Boolean));
    const matchBasis: 'existing_fingerprint' | 'canonical_fingerprint' =
      storedFpSet.size === 1 && primary.fingerprint
        ? 'existing_fingerprint'
        : 'canonical_fingerprint';

    const canonicalKey =
      matchBasis === 'existing_fingerprint' && primary.fingerprint
        ? primary.fingerprint
        : primary.canonicalFingerprint;

    const cloneDiagnostics: DuplicateCloneDiagnostic[] = clones.map((clone) => ({
      id: clone.id,
      title: clone.title,
      company: clone.company,
      platform: clone.platform,
      status: clone.status,
      currentFingerprint: clone.fingerprint,
      canonicalFingerprint: clone.canonicalFingerprint,
      savedRefs: clone.savedRefs,
      hiddenRefs: clone.hiddenRefs,
    }));

    groups.push({
      canonicalKey,
      matchBasis,
      primaryId: primary.id,
      primaryTitle: primary.title,
      primaryCompany: primary.company,
      primaryPlatform: primary.platform,
      primaryStatus: primary.status,
      primaryEngagementCount: primary.engagementCount,
      winnerReason: explainWinnerReason(primary, clones[0]),
      clones: cloneDiagnostics,
      totalSavedRefsImpacted: cloneDiagnostics.reduce((acc, c) => acc + c.savedRefs, 0),
      totalHiddenRefsImpacted: cloneDiagnostics.reduce((acc, c) => acc + c.hiddenRefs, 0),
    });
  }

  return {
    totalExamined: enriched.length,
    fingerprintsToUpdate: missingFingerprintRows.length,
    referencingFkTables,
    groups,
    missingFingerprintRows,
  };
}

/**
 * Executa diagnóstico read-only (--dry-run padrão) ou deduplicação transacional (--apply --confirm-reviewed).
 */
export async function deduplicateDatabase(
  options: HygieneScriptOptions = {}
): Promise<DeduplicationReport> {
  const apply = Boolean(options.apply);
  const confirmReviewed = Boolean(options.confirmReviewed);
  const targetPath = resolveHygieneTargetPath(options.dbPath);

  assertMutationAuthorized(apply, confirmReviewed, 'deduplicate-jobs.ts');

  if (!fs.existsSync(targetPath)) {
    throw new Error(`[DEDUP ERROR] Banco SQLite não encontrado: ${targetPath}`);
  }

  // Modo padrão: estritamente somente leitura (--dry-run)
  if (!apply) {
    const roDb = new Database(targetPath, { readonly: true, fileMustExist: true });
    try {
      const analysis = findDuplicateGroups(roDb);
      const duplicatesIdentified = analysis.groups.reduce((acc, g) => acc + g.clones.length, 0);

      return {
        mode: 'dry-run',
        dbPath: targetPath,
        totalExamined: analysis.totalExamined,
        fingerprintsToUpdate: analysis.fingerprintsToUpdate,
        fingerprintsUpdated: 0,
        duplicateGroupsFound: analysis.groups.length,
        duplicatesIdentified,
        duplicatesDeleted: 0,
        uniqueJobsRemaining: analysis.totalExamined - duplicatesIdentified,
        referencingFkTables: analysis.referencingFkTables,
        groups: analysis.groups,
      };
    } finally {
      roDb.close();
    }
  }

  // Modo explícito de aplicação (--apply --confirm-reviewed): backup + restore test + snapshot diff
  const backupResult = await createVerifiedBackupAndRestoreTest(targetPath);

  const rwDb = new Database(targetPath, { fileMustExist: true, timeout: 10000 });
  try {
    rwDb.pragma('foreign_keys = ON');
    const preSnapshot = computeJobsSnapshot(rwDb);
    const analysis = findDuplicateGroups(rwDb);
    const tables = getExistingTableNames(rwDb);
    const hasSavedTable = tables.has('user_saved_jobs');
    const hasHiddenTable = tables.has('user_hidden_jobs');

    const cloneIdsToDelete = new Set<string>();
    for (const group of analysis.groups) {
      for (const clone of group.clones) {
        cloneIdsToDelete.add(clone.id);
      }
    }

    const selectSavedStmt = hasSavedTable
      ? rwDb.prepare('SELECT user_id, status, created_at FROM user_saved_jobs WHERE job_id = ?')
      : null;
    const insertSavedStmt = hasSavedTable
      ? rwDb.prepare(
          'INSERT OR IGNORE INTO user_saved_jobs (user_id, job_id, status, created_at) VALUES (?, ?, ?, ?)'
        )
      : null;

    const selectHiddenStmt = hasHiddenTable
      ? rwDb.prepare('SELECT user_id, created_at FROM user_hidden_jobs WHERE job_id = ?')
      : null;
    const insertHiddenStmt = hasHiddenTable
      ? rwDb.prepare(
          'INSERT OR IGNORE INTO user_hidden_jobs (user_id, job_id, created_at) VALUES (?, ?, ?)'
        )
      : null;

    const deleteJobStmt = rwDb.prepare('DELETE FROM jobs WHERE id = ?');
    const updateFpStmt = rwDb.prepare('UPDATE jobs SET fingerprint = ? WHERE id = ?');

    let duplicatesDeleted = 0;
    let fingerprintsUpdated = 0;

    const runApply = rwDb.transaction(() => {
      for (const group of analysis.groups) {
        for (const clone of group.clones) {
          if (selectSavedStmt && insertSavedStmt) {
            const savedRows = selectSavedStmt.all(clone.id) as Array<{
              user_id: string;
              status: string | null;
              created_at: string;
            }>;
            for (const saved of savedRows) {
              insertSavedStmt.run(
                saved.user_id,
                group.primaryId,
                saved.status ?? 'saved',
                saved.created_at
              );
            }
          }

          if (selectHiddenStmt && insertHiddenStmt) {
            const hiddenRows = selectHiddenStmt.all(clone.id) as Array<{
              user_id: string;
              created_at: string;
            }>;
            for (const hidden of hiddenRows) {
              insertHiddenStmt.run(hidden.user_id, group.primaryId, hidden.created_at);
            }
          }

          const res = deleteJobStmt.run(clone.id);
          duplicatesDeleted += res.changes;
        }
      }

      for (const missing of analysis.missingFingerprintRows) {
        if (!cloneIdsToDelete.has(missing.id)) {
          const res = updateFpStmt.run(missing.canonicalFingerprint, missing.id);
          fingerprintsUpdated += res.changes;
        }
      }
    });

    runApply();

    verifySqliteIntegrityAndFk(rwDb, 'post-apply deduplicateDatabase');
    const postSnapshot = computeJobsSnapshot(rwDb);

    if (postSnapshot.totalJobs !== preSnapshot.totalJobs - duplicatesDeleted) {
      throw new Error(
        `[POST-APPLY AUDIT FAILED] Contagem pós-deduplicação inconsistente: esperado=${preSnapshot.totalJobs - duplicatesDeleted}, obtido=${postSnapshot.totalJobs}`
      );
    }

    const expectedRemainingPks = preSnapshot.primaryKeys.filter((pk) => !cloneIdsToDelete.has(pk));
    if (JSON.stringify(postSnapshot.primaryKeys) !== JSON.stringify(expectedRemainingPks)) {
      throw new Error(
        '[POST-APPLY AUDIT FAILED] Conjunto de Primary Keys restantes diverge dos clones selecionados.'
      );
    }

    return {
      mode: 'apply',
      dbPath: targetPath,
      totalExamined: analysis.totalExamined,
      fingerprintsToUpdate: analysis.fingerprintsToUpdate,
      fingerprintsUpdated,
      duplicateGroupsFound: analysis.groups.length,
      duplicatesIdentified: cloneIdsToDelete.size,
      duplicatesDeleted,
      uniqueJobsRemaining: postSnapshot.totalJobs,
      referencingFkTables: analysis.referencingFkTables,
      groups: analysis.groups,
      backupResult,
      preSnapshot,
      postSnapshot,
    };
  } finally {
    rwDb.close();
  }
}

async function main(): Promise<void> {
  const cli = parseHygieneCliArgs(process.argv.slice(2));
  const report = await deduplicateDatabase(cli);

  console.log(`\n=== DEDUPLICAÇÃO DE VAGAS (${report.mode.toUpperCase()}) ===`);
  console.log(`- Banco alvo: ${report.dbPath}`);
  console.log(`- Tabelas FK vinculadas a jobs: ${report.referencingFkTables.join(', ') || 'nenhuma'}`);
  console.log(`- Total de vagas examinadas: ${report.totalExamined}`);
  console.log(`- Fingerprints ausentes a preencher: ${report.fingerprintsToUpdate}`);
  console.log(`- Grupos de duplicatas identificados: ${report.duplicateGroupsFound}`);
  console.log(`- Clones redundantes identificados: ${report.duplicatesIdentified}`);
  if (report.mode === 'dry-run') {
    console.log('- Ação no banco: 0 escritas (conexão SQLite { readonly: true })');
  } else {
    console.log(`- Backup verificado: ${report.backupResult?.backupPath}`);
    console.log(`- Cópias duplicadas removidas: ${report.duplicatesDeleted}`);
    console.log(`- Fingerprints atualizados: ${report.fingerprintsUpdated}`);
    console.log(`- SHA-256 pré-apply:  ${report.preSnapshot?.sha256}`);
    console.log(`- SHA-256 pós-apply:  ${report.postSnapshot?.sha256}`);
  }
  console.log(`- Vagas únicas projetadas/consolidadas: ${report.uniqueJobsRemaining}`);

  for (const group of report.groups) {
    console.log(
      `\n  [Grupo ${group.canonicalKey.slice(0, 12)} | ${group.matchBasis}] Sobrevivente: ${group.primaryId.slice(0, 12)} ("${group.primaryTitle}" @ ${group.primaryCompany} via ${group.primaryPlatform})`
    );
    console.log(`    Critério vencedor: ${group.winnerReason}`);
    console.log(
      `    Impacto FK dos clones: user_saved_jobs=${group.totalSavedRefsImpacted}, user_hidden_jobs=${group.totalHiddenRefsImpacted}`
    );
    for (const clone of group.clones) {
      console.log(
        `    - Clone candidato: ${clone.id.slice(0, 12)} | status=${clone.status} | savedRefs=${clone.savedRefs} | hiddenRefs=${clone.hiddenRefs}`
      );
    }
  }
  console.log('\n=== CONCLUÍDO ===');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[deduplicate-jobs ERROR]:', err);
    process.exit(1);
  });
}
