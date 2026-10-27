import { WorkanaScraper } from '../src/scrapers/workana.js';
import { BebeeScraper } from '../src/scrapers/bebee.js';
import { ChaworkScraper } from '../src/scrapers/chawork.js';
import { ReveloScraper } from '../src/scrapers/revelo.js';
import { NoventaENoveJobsScraper } from '../src/scrapers/noventaENoveJobs.js';
import { RunTalentScraper } from '../src/scrapers/runTalent.js';
import { EmpregareScraper } from '../src/scrapers/empregare.js';
import { withTimeout } from '../src/utils/concurrency.js';

async function testPipelineFixes() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           VALIDAÇÃO DOS SCRAPERS CORRIGIDOS E OTIMIZADOS                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const scrapers = [
    { name: 'Workana (Stealth Playwright)', instance: new WorkanaScraper(), timeout: 35000 },
    { name: 'beBee (Novo Endpoint)', instance: new BebeeScraper(), timeout: 25000 },
    { name: 'Chawork (Rota Limpa)', instance: new ChaworkScraper(), timeout: 25000 },
    { name: 'Revelo (SPA Direct Playwright)', instance: new ReveloScraper(), timeout: 35000 },
    { name: '99jobs (SPA Direct Playwright)', instance: new NoventaENoveJobsScraper(), timeout: 35000 },
    { name: 'RunTalent (SPA Direct Playwright)', instance: new RunTalentScraper(), timeout: 35000 },
    { name: 'Empregare (SPA Direct Playwright)', instance: new EmpregareScraper(), timeout: 35000 },
  ];

  const results: Array<{ name: string; jobs: number; durationMs: number; status: string; sample?: string }> = [];

  for (const s of scrapers) {
    const start = Date.now();
    process.stdout.write(`• Testando ${s.name.padEnd(35, ' ')} ... `);
    try {
      const jobs = await withTimeout(s.instance.scrape(), s.timeout, `Timeout de ${s.timeout / 1000}s`);
      const durationMs = Date.now() - start;
      const status = jobs.length > 0 ? 'OK' : 'EMPTY';
      const sample = jobs.length > 0 ? `"${jobs[0].title.slice(0, 35)}" (${jobs[0].company})` : undefined;

      results.push({ name: s.name, jobs: jobs.length, durationMs, status, sample });
      console.log(`✅ ${status} (${(durationMs / 1000).toFixed(1)}s) -> ${jobs.length} vagas`);
      if (sample) {
        console.log(`   └─ Exemplo: ${sample}`);
      }
    } catch (err) {
      const durationMs = Date.now() - start;
      const errMsg = (err as Error).message || String(err);
      results.push({ name: s.name, jobs: 0, durationMs, status: 'ERROR' });
      console.log(`❌ ERRO (${(durationMs / 1000).toFixed(1)}s): ${errMsg}`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────────────────────');
  console.log('RESUMO DA VALIDAÇÃO:');
  for (const r of results) {
    console.log(` • ${r.name.padEnd(35, ' ')} : ${r.status === 'OK' ? '✅' : r.status === 'EMPTY' ? '⚪' : '❌'} ${r.jobs} vagas (${(r.durationMs / 1000).toFixed(1)}s)`);
  }
  console.log('─────────────────────────────────────────────────────────────────────────────\n');
}

testPipelineFixes().catch((err) => {
  console.error('Erro na validação:', err);
  process.exit(1);
});
