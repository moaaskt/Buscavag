import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  cleanJobTitle,
  isTechJob,
  matchesBlacklist,
  matchesWhitelist,
} from '../src/config/jobFilters';
import {
  assertMutationAuthorized,
  computeJobsSnapshot,
  createVerifiedBackupAndRestoreTest,
  getJobFkReferenceCounts,
  getTableColumnNames,
  HygieneScriptOptions,
  JobsSnapshot,
  parseHygieneCliArgs,
  resolveHygieneTargetPath,
  VerifiedBackupResult,
  verifySqliteIntegrityAndFk,
} from '../src/scripts/deduplicate-jobs';

export interface SanitizationCandidate {
  id: string;
  title: string;
  company: string;
  platform: string;
  currentStatus: string | null;
  currentIsTech: number | null;
  proposedAction: 'flag_non_tech';
  reason: string;
  savedRefs: number;
  hiddenRefs: number;
}

export interface PreservedDevJobSample {
  id: string;
  title: string;
  company: string;
  platform: string;
  currentStatus: string | null;
  matchedTerms: string[];
  whitelistRule: string;
}

export interface SanitizationReport {
  mode: 'dry-run' | 'apply';
  dbPath: string;
  totalExamined: number;
  keptCount: number;
  candidateCount: number;
  alreadyArchivedNonTechCount: number;
  archivedCount: number;
  reactivatedTechFlagCount: number;
  candidates: SanitizationCandidate[];
  alreadyArchivedCandidates: SanitizationCandidate[];
  borderlinePreservedJobs: PreservedDevJobSample[];
  sampleStandardPreservedJobs: PreservedDevJobSample[];
  backupResult?: VerifiedBackupResult;
  preSnapshot?: JobsSnapshot;
  postSnapshot?: JobsSnapshot;
}

interface SanitizationJobRow {
  id: string;
  title: string;
  company: string;
  platform: string;
  is_tech_software: number | null;
  is_junior_fullstack: number | null;
  status: string | null;
}

const BORDERLINE_DEV_KEYWORD_REGEX =
  /\b(vendas?|comercial|negocios?|marketing|design(?:er)?|produtos?|dados|suporte|rh|lead|qa|ops)\b/gi;

function normalizeAscii(text: string): string {
  return cleanJobTitle(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findMatchedBorderlineTerms(title: string): string[] {
  const normalized = normalizeAscii(title);
  const matches = normalized.match(BORDERLINE_DEV_KEYWORD_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

function analyzeSanitization(db: Database.Database): {
  totalExamined: number;
  keptCount: number;
  candidates: SanitizationCandidate[];
  alreadyArchivedCandidates: SanitizationCandidate[];
  borderlinePreservedJobs: PreservedDevJobSample[];
  sampleStandardPreservedJobs: PreservedDevJobSample[];
  techIdsNeedingFlagUpdate: string[];
} {
  const jobCols = getTableColumnNames(db, 'jobs');
  const selectCols = [
    'id',
    'title',
    'company',
    'platform',
    jobCols.has('is_tech_software') ? 'is_tech_software' : '1 AS is_tech_software',
    jobCols.has('is_junior_fullstack') ? 'is_junior_fullstack' : '0 AS is_junior_fullstack',
    jobCols.has('status') ? 'status' : "'active' AS status",
  ];

  const rows = db
    .prepare(`SELECT ${selectCols.join(', ')} FROM jobs ORDER BY id ASC`)
    .all() as SanitizationJobRow[];

  const { savedCounts, hiddenCounts } = getJobFkReferenceCounts(db);

  let keptCount = 0;
  const candidates: SanitizationCandidate[] = [];
  const alreadyArchivedCandidates: SanitizationCandidate[] = [];
  const borderlinePreservedJobs: PreservedDevJobSample[] = [];
  const sampleStandardPreservedJobs: PreservedDevJobSample[] = [];
  const techIdsNeedingFlagUpdate: string[] = [];

  for (const job of rows) {
    const blacklist = matchesBlacklist(job.title);
    const whitelist = matchesWhitelist(job.title);
    const isProgramming = isTechJob(job.title);

    if (!isProgramming) {
      const reason = blacklist.matched
        ? `Blacklist: ${blacklist.term}`
        : 'Sem correspondência na whitelist técnica (não-programação)';

      const candidate: SanitizationCandidate = {
        id: job.id,
        title: job.title,
        company: job.company,
        platform: job.platform,
        currentStatus: job.status ?? null,
        currentIsTech: job.is_tech_software ?? null,
        proposedAction: 'flag_non_tech',
        reason,
        savedRefs: savedCounts.get(job.id) ?? 0,
        hiddenRefs: hiddenCounts.get(job.id) ?? 0,
      };

      const alreadySanitized =
        job.status === 'archived' && Number(job.is_tech_software ?? 0) === 0;
      if (alreadySanitized) {
        alreadyArchivedCandidates.push(candidate);
      } else {
        candidates.push(candidate);
      }
    } else {
      keptCount++;
      if (Number(job.is_tech_software ?? 0) !== 1) {
        techIdsNeedingFlagUpdate.push(job.id);
      }

      const matchedTerms = findMatchedBorderlineTerms(job.title);
      const sample: PreservedDevJobSample = {
        id: job.id,
        title: job.title,
        company: job.company,
        platform: job.platform,
        currentStatus: job.status ?? null,
        matchedTerms,
        whitelistRule: whitelist.term || 'TECH_WHITELIST',
      };

      if (matchedTerms.length > 0) {
        borderlinePreservedJobs.push(sample);
      } else if (sampleStandardPreservedJobs.length < 15 && job.status === 'active') {
        sampleStandardPreservedJobs.push(sample);
      }
    }
  }

  return {
    totalExamined: rows.length,
    keptCount,
    candidates,
    alreadyArchivedCandidates,
    borderlinePreservedJobs,
    sampleStandardPreservedJobs,
    techIdsNeedingFlagUpdate,
  };
}

/**
 * Executa diagnóstico read-only (--dry-run padrão) ou higienização (--apply --confirm-reviewed).
 */
export async function sanitizeDatabase(
  options: HygieneScriptOptions = {}
): Promise<SanitizationReport> {
  const apply = Boolean(options.apply);
  const confirmReviewed = Boolean(options.confirmReviewed);
  const targetPath = resolveHygieneTargetPath(options.dbPath);

  assertMutationAuthorized(apply, confirmReviewed, 'sanitize-db-programming.ts');

  if (!fs.existsSync(targetPath)) {
    throw new Error(`[SANITIZE ERROR] Banco SQLite não encontrado: ${targetPath}`);
  }

  if (!apply) {
    const roDb = new Database(targetPath, { readonly: true, fileMustExist: true });
    try {
      const analysis = analyzeSanitization(roDb);
      return {
        mode: 'dry-run',
        dbPath: targetPath,
        totalExamined: analysis.totalExamined,
        keptCount: analysis.keptCount,
        candidateCount: analysis.candidates.length,
        alreadyArchivedNonTechCount: analysis.alreadyArchivedCandidates.length,
        archivedCount: 0,
        reactivatedTechFlagCount: 0,
        candidates: analysis.candidates,
        alreadyArchivedCandidates: analysis.alreadyArchivedCandidates,
        borderlinePreservedJobs: analysis.borderlinePreservedJobs,
        sampleStandardPreservedJobs: analysis.sampleStandardPreservedJobs,
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
    const analysis = analyzeSanitization(rwDb);
    const jobCols = getTableColumnNames(rwDb, 'jobs');

    const updateNonDevSql = jobCols.has('is_junior_fullstack')
      ? "UPDATE jobs SET is_tech_software = 0, is_junior_fullstack = 0, status = 'archived' WHERE id = ?"
      : "UPDATE jobs SET is_tech_software = 0, status = 'archived' WHERE id = ?";

    const updateNonDevStmt = rwDb.prepare(updateNonDevSql);
    const updateDevStmt = rwDb.prepare('UPDATE jobs SET is_tech_software = 1 WHERE id = ?');

    let archivedCount = 0;
    let reactivatedTechFlagCount = 0;

    const tx = rwDb.transaction(() => {
      for (const candidate of analysis.candidates) {
        const res = updateNonDevStmt.run(candidate.id);
        archivedCount += res.changes;
      }

      for (const techId of analysis.techIdsNeedingFlagUpdate) {
        const res = updateDevStmt.run(techId);
        reactivatedTechFlagCount += res.changes;
      }
    });

    tx();

    verifySqliteIntegrityAndFk(rwDb, 'post-apply sanitizeDatabase');
    const postSnapshot = computeJobsSnapshot(rwDb);

    if (
      postSnapshot.totalJobs !== preSnapshot.totalJobs ||
      JSON.stringify(postSnapshot.primaryKeys) !== JSON.stringify(preSnapshot.primaryKeys)
    ) {
      throw new Error(
        `[POST-APPLY AUDIT FAILED] Conjunto de vagas alterado inesperadamente em sanitize-db-programming.ts (pré=${preSnapshot.totalJobs}, pós=${postSnapshot.totalJobs}).`
      );
    }

    return {
      mode: 'apply',
      dbPath: targetPath,
      totalExamined: analysis.totalExamined,
      keptCount: analysis.keptCount,
      candidateCount: analysis.candidates.length,
      alreadyArchivedNonTechCount: analysis.alreadyArchivedCandidates.length,
      archivedCount,
      reactivatedTechFlagCount,
      candidates: analysis.candidates,
      alreadyArchivedCandidates: analysis.alreadyArchivedCandidates,
      borderlinePreservedJobs: analysis.borderlinePreservedJobs,
      sampleStandardPreservedJobs: analysis.sampleStandardPreservedJobs,
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
  const report = await sanitizeDatabase(cli);

  console.log(`\n=== DIAGNÓSTICO & HIGIENIZAÇÃO TECH (${report.mode.toUpperCase()}) ===`);
  console.log(`- Banco alvo: ${report.dbPath}`);
  console.log(`- Total de vagas examinadas: ${report.totalExamined}`);
  console.log(`- Vagas genuínas de programação preservadas (isTechJob=true): ${report.keptCount}`);
  console.log(`- Candidatas ativas/ativas-tech sinalizadas para revisão (!isTechJob): ${report.candidateCount}`);
  console.log(`- Já arquivadas historicamente como não-tech: ${report.alreadyArchivedNonTechCount}`);
  console.log(`- Vagas dev limítrofes preservadas (borderline review): ${report.borderlinePreservedJobs.length}`);

  if (report.mode === 'dry-run') {
    console.log('- Ação no banco: 0 escritas (conexão SQLite { readonly: true })');
  } else {
    console.log(`- Backup verificado: ${report.backupResult?.backupPath}`);
    console.log(`- Vagas arquivadas neste apply: ${report.archivedCount}`);
    console.log(`- Vagas tech ajustadas para is_tech_software=1: ${report.reactivatedTechFlagCount}`);
    console.log(`- SHA-256 pré-apply:  ${report.preSnapshot?.sha256}`);
    console.log(`- SHA-256 pós-apply:  ${report.postSnapshot?.sha256}`);
  }

  if (report.candidates.length > 0) {
    console.log('\nCandidatas sinalizadas (ativas/não-arquivadas):');
    for (const c of report.candidates) {
      console.log(
        `  - ${c.id.slice(0, 12)} | "${c.title}" (${c.company} / ${c.platform}) | status=${c.currentStatus} | savedRefs=${c.savedRefs} hiddenRefs=${c.hiddenRefs} | motivo: ${c.reason}`
      );
    }
  }

  if (report.borderlinePreservedJobs.length > 0) {
    console.log('\nAmostra de vagas dev limítrofes preservadas (máx. 25):');
    for (const b of report.borderlinePreservedJobs.slice(0, 25)) {
      console.log(
        `  - ${b.id.slice(0, 12)} | "${b.title}" (${b.company} / ${b.platform}) | termos=[${b.matchedTerms.join(', ')}]`
      );
    }
  }

  console.log('\n=== CONCLUÍDO ===');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[sanitize-db-programming ERROR]:', err);
    process.exit(1);
  });
}
