import { db, initDatabase } from '../db/index';
import { matchesBlacklist, isTechJob } from '../config/jobFilters';
import { HermesEvaluator } from '../services/hermesEvaluator';
import { RawJob } from '../types/job';

export interface SanitizeReport {
  totalExamined: number;
  deletedCount: number;
  reclassifiedCount: number;
  remainingValidCount: number;
  deletedDetails: Array<{ id: string; title: string; reason: string }>;
}

export function sanitizeDatabase(): SanitizeReport {
  initDatabase();
  const evaluator = new HermesEvaluator();

  const allJobs = db.prepare('SELECT * FROM jobs').all() as any[];
  const report: SanitizeReport = {
    totalExamined: allJobs.length,
    deletedCount: 0,
    reclassifiedCount: 0,
    remainingValidCount: 0,
    deletedDetails: [],
  };

  const deleteJobStmt = db.prepare('DELETE FROM jobs WHERE id = ?');
  const deleteSavedStmt = db.prepare('DELETE FROM user_saved_jobs WHERE job_id = ?');
  const updateCategoryStmt = db.prepare('UPDATE jobs SET category = ? WHERE id = ?');

  const fullstackRegex = /full\s*stack|fullstack|full-stack/i;

  for (const job of allJobs) {
    const rawJob: RawJob = {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description || '',
      url: job.url,
      platform: job.platform,
      publishedAt: job.created_at ? new Date(job.created_at) : new Date(),
    };

    const blacklistCheck = matchesBlacklist(job.title);
    const evalResult = evaluator.evaluateHeuristic(rawJob);

    // Identifica se a vaga é não-tech
    const isNonTech = blacklistCheck.matched || !evalResult.isTechSoftware || evalResult.category === 'Não-Tech';

    if (isNonTech) {
      const reason = blacklistCheck.matched
        ? `Blacklist match: ${blacklistCheck.term}`
        : evalResult.reasoning;

      deleteSavedStmt.run(job.id);
      deleteJobStmt.run(job.id);

      report.deletedCount++;
      report.deletedDetails.push({ id: job.id, title: job.title, reason });
      continue;
    }

    // Se é tech, verifica se estava indevidamente categorizada como Full Stack
    if (job.category === 'Full Stack') {
      const text = `${job.title} ${job.description || ''}`;
      const isExplicitFullstack = fullstackRegex.test(text) || (/frontend/i.test(text) && /backend/i.test(text));

      if (!isExplicitFullstack) {
        updateCategoryStmt.run('Software Geral', job.id);
        report.reclassifiedCount++;
      }
    }

    report.remainingValidCount++;
  }

  return report;
}

// Execução direta via CLI se chamado diretamente
if (process.argv[1]?.endsWith('sanitize-nontech-jobs.ts')) {
  console.log('--- INICIANDO HIGIENIZAÇÃO DE VAGAS NÃO-TECH (PHASE 91) ---');
  const result = sanitizeDatabase();
  console.log(`Vagas examinadas: ${result.totalExamined}`);
  console.log(`Vagas não-tech expurgadas (Hard Delete): ${result.deletedCount}`);
  console.log(`Vagas reclassificadas de "Full Stack" para "Software Geral": ${result.reclassifiedCount}`);
  console.log(`Vagas técnicas válidas restantes: ${result.remainingValidCount}`);

  if (result.deletedDetails.length > 0) {
    console.log('\nExemplos de vagas expurgadas:');
    result.deletedDetails.slice(0, 10).forEach((d) => {
      console.log(` - [${d.id.slice(0, 8)}] "${d.title}" -> ${d.reason}`);
    });
  }
}
