import { db, initDatabase } from '../db/index';
import { generateJobFingerprint } from '../utils/fingerprint';

export interface DeduplicationReport {
  totalExamined: number;
  fingerprintsUpdated: number;
  duplicateGroupsFound: number;
  duplicatesDeleted: number;
  uniqueJobsRemaining: number;
}

/**
 * Rotina que percorre o banco SQLite:
 * 1. Calcula e preenche a coluna fingerprint para vagas onde estiver ausente.
 * 2. Identifica grupos de vagas com o mesmo fingerprint (multi-fonte ou testes).
 * 3. Preserva a vaga primária de melhor score/mais antiga e remove os clones redundantes via Hard Delete.
 */
export function deduplicateDatabase(): DeduplicationReport {
  initDatabase();

  // 1. Atualizar fingerprints em lote para vagas sem fingerprint
  const jobsWithoutFp = db
    .prepare("SELECT id, title, company, location FROM jobs WHERE fingerprint IS NULL OR fingerprint = ''")
    .all() as Array<{ id: string; title: string; company: string; location: string | null }>;

  const updateStmt = db.prepare('UPDATE jobs SET fingerprint = ? WHERE id = ?');
  const updateMany = db.transaction((jobs: typeof jobsWithoutFp) => {
    let count = 0;
    for (const job of jobs) {
      const fp = generateJobFingerprint(job.title, job.company, job.location);
      updateStmt.run(fp, job.id);
      count++;
    }
    return count;
  });

  const fingerprintsUpdated = updateMany(jobsWithoutFp);

  // 2. Identificar grupos de duplicatas pelo fingerprint
  const duplicateGroups = db
    .prepare(`
      SELECT fingerprint, COUNT(*) as count 
      FROM jobs 
      WHERE fingerprint IS NOT NULL AND fingerprint != ''
      GROUP BY fingerprint 
      HAVING count > 1
    `)
    .all() as Array<{ fingerprint: string; count: number }>;

  let duplicatesDeleted = 0;

  const deleteStmt = db.prepare('DELETE FROM jobs WHERE id = ?');

  for (const group of duplicateGroups) {
    const jobsInGroup = db
      .prepare(`
        SELECT id, title, company, platform, overall_score, is_junior_fullstack, created_at, published_at
        FROM jobs 
        WHERE fingerprint = ?
        ORDER BY 
          is_junior_fullstack DESC,
          overall_score DESC,
          created_at ASC
      `)
      .all(group.fingerprint) as Array<{
        id: string;
        title: string;
        company: string;
        platform: string;
        overall_score: number;
        is_junior_fullstack: number;
        created_at: string;
        published_at: string;
      }>;

    // Preserva o primeiro (melhor score / mais antigo) e deleta os excedentes
    const [primary, ...clones] = jobsInGroup;

    for (const clone of clones) {
      deleteStmt.run(clone.id);
      duplicatesDeleted++;
    }
  }

  // 3. Contagem final consolidada
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number };
  const totalExamined = (db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number }).count + duplicatesDeleted;

  return {
    totalExamined,
    fingerprintsUpdated,
    duplicateGroupsFound: duplicateGroups.length,
    duplicatesDeleted,
    uniqueJobsRemaining: totalRow.count,
  };
}

// Execução direta via CLI se chamado diretamente
if (process.argv[1]?.endsWith('deduplicate-jobs.ts')) {
  console.log('--- EXECUTANDO DEDUPLICAÇÃO E MIGRAÇÃO RETROATIVA DE FINGERPRINTS ---');
  const report = deduplicateDatabase();
  console.log(`- Total de vagas examinadas: ${report.totalExamined}`);
  console.log(`- Fingerprints calculados/atualizados: ${report.fingerprintsUpdated}`);
  console.log(`- Grupos de duplicatas identificados: ${report.duplicateGroupsFound}`);
  console.log(`- Cópias duplicadas expurgadas: ${report.duplicatesDeleted}`);
  console.log(`- Vagas únicas consolidadas no banco: ${report.uniqueJobsRemaining}`);
  console.log('--- CONCLUÍDO COM SUCESSO ---');
}
