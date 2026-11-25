import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCanonicalLocation } from '../utils/geoParser';
import { generateJobFingerprint } from '../utils/fingerprint';
import {
  assertMutationAuthorized,
  computeJobsSnapshot,
  createVerifiedBackupAndRestoreTest,
  getTableColumnNames,
  HygieneScriptOptions,
  JobsSnapshot,
  parseHygieneCliArgs,
  resolveHygieneTargetPath,
  VerifiedBackupResult,
  verifySqliteIntegrityAndFk,
} from './deduplicate-jobs';

export interface LocationNormalizationCandidate {
  id: string;
  title: string;
  company: string;
  platform: string;
  currentLocation: string | null;
  proposedLocation: string | null;
  currentCity: string | null;
  proposedCity: string | null;
  currentState: string | null;
  proposedState: string | null;
  currentFingerprint: string | null;
  proposedFingerprint: string;
  reason: string;
}

export interface NormalizationStats {
  mode: 'dry-run' | 'apply';
  dbPath: string;
  totalAnalyzed: number;
  candidateCount: number;
  updatedCount: number;
  withCity: number;
  withState: number;
  remoteCount: number;
  fingerprintsToUpdate: number;
  fingerprintsUpdated: number;
  candidates: LocationNormalizationCandidate[];
  backupResult?: VerifiedBackupResult;
  preSnapshot?: JobsSnapshot;
  postSnapshot?: JobsSnapshot;
}

interface NormalizationJobRow {
  id: string;
  title: string;
  company: string;
  platform: string;
  location: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  fingerprint: string | null;
}

function analyzeLocationCandidates(db: Database.Database): {
  totalAnalyzed: number;
  withCity: number;
  withState: number;
  remoteCount: number;
  fingerprintsToUpdate: number;
  candidates: LocationNormalizationCandidate[];
} {
  const jobCols = getTableColumnNames(db, 'jobs');
  const selectCols = [
    'id',
    'title',
    'company',
    'platform',
    jobCols.has('location') ? 'location' : 'NULL AS location',
    jobCols.has('description') ? 'description' : 'NULL AS description',
    jobCols.has('city') ? 'city' : 'NULL AS city',
    jobCols.has('state') ? 'state' : 'NULL AS state',
    jobCols.has('fingerprint') ? 'fingerprint' : 'NULL AS fingerprint',
  ];

  const rows = db
    .prepare(`SELECT ${selectCols.join(', ')} FROM jobs ORDER BY id ASC`)
    .all() as NormalizationJobRow[];

  let withCity = 0;
  let withState = 0;
  let remoteCount = 0;
  let fingerprintsToUpdate = 0;
  const candidates: LocationNormalizationCandidate[] = [];

  for (const row of rows) {
    const canonical = parseCanonicalLocation(
      row.location,
      row.platform,
      row.title,
      row.description ?? undefined
    );

    const targetCity = canonical.city || null;
    const targetState = canonical.state || null;
    const targetLocation = canonical.canonicalLocation || row.location || null;
    const newFingerprint = generateJobFingerprint(row.title, row.company, targetLocation);

    if (targetCity) withCity++;
    if (targetState) withState++;
    if (canonical.isRemote) remoteCount++;

    const reasons: string[] = [];
    if ((row.city ?? null) !== targetCity) {
      reasons.push(`city: ${JSON.stringify(row.city ?? null)} -> ${JSON.stringify(targetCity)}`);
    }
    if ((row.state ?? null) !== targetState) {
      reasons.push(`state: ${JSON.stringify(row.state ?? null)} -> ${JSON.stringify(targetState)}`);
    }
    if ((row.location ?? null) !== targetLocation) {
      reasons.push(
        `location: ${JSON.stringify(row.location ?? null)} -> ${JSON.stringify(targetLocation)}`
      );
    }
    if ((row.fingerprint ?? null) !== newFingerprint) {
      fingerprintsToUpdate++;
      reasons.push(
        row.fingerprint
          ? `fingerprint legado (${row.fingerprint.slice(0, 8)} -> ${newFingerprint.slice(0, 8)})`
          : `fingerprint ausente (-> ${newFingerprint.slice(0, 8)})`
      );
    }

    if (reasons.length > 0) {
      candidates.push({
        id: row.id,
        title: row.title,
        company: row.company,
        platform: row.platform,
        currentLocation: row.location ?? null,
        proposedLocation: targetLocation,
        currentCity: row.city ?? null,
        proposedCity: targetCity,
        currentState: row.state ?? null,
        proposedState: targetState,
        currentFingerprint: row.fingerprint ?? null,
        proposedFingerprint: newFingerprint,
        reason: reasons.join('; '),
      });
    }
  }

  return {
    totalAnalyzed: rows.length,
    withCity,
    withState,
    remoteCount,
    fingerprintsToUpdate,
    candidates,
  };
}

/**
 * Executa diagnóstico read-only (--dry-run padrão) ou normalização geográfica (--apply --confirm-reviewed).
 */
export async function normalizeDatabaseLocations(
  options: HygieneScriptOptions = {}
): Promise<NormalizationStats> {
  const apply = Boolean(options.apply);
  const confirmReviewed = Boolean(options.confirmReviewed);
  const targetPath = resolveHygieneTargetPath(options.dbPath);

  assertMutationAuthorized(apply, confirmReviewed, 'normalize-locations.ts');

  if (!fs.existsSync(targetPath)) {
    throw new Error(`[NORMALIZE ERROR] Banco SQLite não encontrado: ${targetPath}`);
  }

  if (!apply) {
    const roDb = new Database(targetPath, { readonly: true, fileMustExist: true });
    try {
      const analysis = analyzeLocationCandidates(roDb);
      return {
        mode: 'dry-run',
        dbPath: targetPath,
        totalAnalyzed: analysis.totalAnalyzed,
        candidateCount: analysis.candidates.length,
        updatedCount: 0,
        withCity: analysis.withCity,
        withState: analysis.withState,
        remoteCount: analysis.remoteCount,
        fingerprintsToUpdate: analysis.fingerprintsToUpdate,
        fingerprintsUpdated: 0,
        candidates: analysis.candidates,
      };
    } finally {
      roDb.close();
    }
  }

  const backupResult = await createVerifiedBackupAndRestoreTest(targetPath);

  const rwDb = new Database(targetPath, { fileMustExist: true, timeout: 10000 });
  try {
    rwDb.pragma('foreign_keys = ON');
    const preSnapshot = computeJobsSnapshot(rwDb);
    const analysis = analyzeLocationCandidates(rwDb);

    const updateStmt = rwDb.prepare(`
      UPDATE jobs
      SET city = ?, state = ?, location = ?, fingerprint = ?
      WHERE id = ?
    `);

    let updatedCount = 0;
    const runUpdates = rwDb.transaction(() => {
      for (const candidate of analysis.candidates) {
        const res = updateStmt.run(
          candidate.proposedCity,
          candidate.proposedState,
          candidate.proposedLocation,
          candidate.proposedFingerprint,
          candidate.id
        );
        updatedCount += res.changes;
      }
    });

    runUpdates();

    verifySqliteIntegrityAndFk(rwDb, 'post-apply normalizeDatabaseLocations');
    const postSnapshot = computeJobsSnapshot(rwDb);

    if (
      postSnapshot.totalJobs !== preSnapshot.totalJobs ||
      JSON.stringify(postSnapshot.primaryKeys) !== JSON.stringify(preSnapshot.primaryKeys)
    ) {
      throw new Error(
        `[POST-APPLY AUDIT FAILED] Conjunto de vagas alterado inesperadamente em normalize-locations.ts (pré=${preSnapshot.totalJobs}, pós=${postSnapshot.totalJobs}).`
      );
    }

    return {
      mode: 'apply',
      dbPath: targetPath,
      totalAnalyzed: analysis.totalAnalyzed,
      candidateCount: analysis.candidates.length,
      updatedCount,
      withCity: analysis.withCity,
      withState: analysis.withState,
      remoteCount: analysis.remoteCount,
      fingerprintsToUpdate: analysis.fingerprintsToUpdate,
      fingerprintsUpdated: analysis.fingerprintsToUpdate,
      candidates: analysis.candidates,
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
  const stats = await normalizeDatabaseLocations(cli);

  console.log(`\n=== NORMALIZAÇÃO GEOGRÁFICA CANÔNICA (${stats.mode.toUpperCase()}) ===`);
  console.log(`- Banco alvo: ${stats.dbPath}`);
  console.log(`- Total de vagas analisadas: ${stats.totalAnalyzed}`);
  console.log(`- Candidatas a normalização: ${stats.candidateCount}`);
  console.log(`- Vagas com Cidade canônica: ${stats.withCity}`);
  console.log(`- Vagas com Estado (UF): ${stats.withState}`);
  console.log(`- Vagas com modalidade Remota: ${stats.remoteCount}`);
  console.log(`- Fingerprints divergentes/ausentes: ${stats.fingerprintsToUpdate}`);
  if (stats.mode === 'dry-run') {
    console.log('- Ação no banco: 0 escritas (conexão SQLite { readonly: true })');
  } else {
    console.log(`- Backup verificado: ${stats.backupResult?.backupPath}`);
    console.log(`- Vagas atualizadas: ${stats.updatedCount}`);
    console.log(`- SHA-256 pré-apply:  ${stats.preSnapshot?.sha256}`);
    console.log(`- SHA-256 pós-apply:  ${stats.postSnapshot?.sha256}`);
  }

  if (stats.candidates.length > 0) {
    console.log('\nAmostra de candidatas (máx. 25):');
    for (const c of stats.candidates.slice(0, 25)) {
      console.log(`  - ${c.id.slice(0, 12)} | "${c.title}" (${c.company}) -> ${c.reason}`);
    }
  }
  console.log('\n=== CONCLUÍDO ===');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[normalize-locations ERROR]:', err);
    process.exit(1);
  });
}
