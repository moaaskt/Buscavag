import Database from 'better-sqlite3';
import path from 'path';
import { isTechJob } from '../src/config/jobFilters.js';

async function main() {
  const dbPath = path.resolve(process.cwd(), 'buscavag.db');
  console.log('Abrindo banco de dados:', dbPath);
  const db = new Database(dbPath);

  const allJobs = db.prepare('SELECT id, title, company, platform, is_tech_software, status FROM jobs').all() as Array<{
    id: string;
    title: string;
    company: string;
    platform: string;
    is_tech_software: number | null;
    status: string | null;
  }>;

  console.log(`Total de vagas no banco: ${allJobs.length}`);

  let keptCount = 0;
  let archivedCount = 0;
  const archivedSamples: Array<{ title: string; company: string; platform: string }> = [];

  const updateNonDevStmt = db.prepare(`
    UPDATE jobs
    SET is_tech_software = 0,
        is_junior_fullstack = 0,
        status = 'archived'
    WHERE id = ?
  `);

  const updateDevStmt = db.prepare(`
    UPDATE jobs
    SET is_tech_software = 1
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    for (const job of allJobs) {
      const isProgramming = isTechJob(job.title);
      if (!isProgramming) {
        updateNonDevStmt.run(job.id);
        archivedCount++;
        if (archivedSamples.length < 25) {
          archivedSamples.push({
            title: job.title,
            company: job.company,
            platform: job.platform,
          });
        }
      } else {
        updateDevStmt.run(job.id);
        keptCount++;
      }
    }
  });

  tx();

  console.log('\n======================================================');
  console.log('  RELATÓRIO DE HIGIENIZAÇÃO DO BANCO DE DADOS');
  console.log('======================================================');
  console.log(`✅ Vagas genuínas de programação mantidas ativas: ${keptCount}`);
  console.log(`🗑️ Vagas não-programação arquivadas/bloqueadas:    ${archivedCount}`);
  console.log('\nAmostra de vagas não-programação arquivadas com sucesso:');
  console.table(archivedSamples);

  // Validação final de visibilidade ativa
  const activeCount = db.prepare("SELECT count(*) as c FROM jobs WHERE status = 'active' AND is_tech_software = 1").get() as { c: number };
  console.log(`\n📌 Total de vagas de programação ativas agora visíveis no Buscavag: ${activeCount.c}`);
}

main().catch(console.error);
