import { PythonBridgeClient } from './services/pythonBridge.js';
import {
  GupyScraper,
  LinkedInScraper,
  IndeedScraper,
  GoogleJobsScraper,
  TelegramScraper,
  ProgramathorScraper,
  RemotarScraper,
  CathoScraper,
  GlassdoorScraper,
  SaoJoseScraper,
  VagasScScraper,
  VagasFloripaScraper,
  EmpregaPalhocaScraper,
  NerdinScraper,
  InfojobsScraper,
  ChaworkScraper,
  TrabalhaBrasilScraper,
  BneScraper,
  EmpregosScraper,
  RecrutaSimplesScraper,
  RecruteiEmpregosScraper,
  QuickinScraper,
  RecruteiJobsScraper,
  PandapeScraper,
  GeekHunterScraper,
  ReveloScraper,
  NoventaENoveJobsScraper,
  SolidesScraper,
  RunTalentScraper,
  EmpregareScraper,
  TramposScraper,
  Freelas99Scraper,
  WorkanaScraper,
} from './scrapers/index.js';
import { JobScraper } from './scrapers/base.js';
import { withTimeout } from './utils/concurrency.js';

interface AuditResult {
  index: number;
  name: string;
  engine: 'NODE' | 'PYTHON';
  status: 'OK' | 'EMPTY' | 'ERROR';
  durationMs: number;
  jobsCount: number;
  sample?: string;
  error?: string;
}

async function runAudit() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║        AUDITORIA GERAL DE SCRAPERS (BUSCAVAG - MOTOR HÍBRIDO v9.0)        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const bridge = new PythonBridgeClient();
  const isPythonOnline = await bridge.isAvailable();

  console.log(`[STATUS DO MOTOR] Microserviço Scrapling Engine: ${isPythonOnline ? '🟢 ONLINE (FastAPI :8000)' : '🟡 OFFLINE (Fallback Node)'}\n`);

  const scrapers: JobScraper[] = [
    new GupyScraper(),
    new LinkedInScraper(),
    new IndeedScraper(),
    new GoogleJobsScraper(bridge),
    new TelegramScraper(),
    new ProgramathorScraper(),
    new RemotarScraper(bridge),
    new CathoScraper(bridge),
    new GlassdoorScraper(bridge),
    new SaoJoseScraper(),
    new VagasScScraper(),
    new VagasFloripaScraper(),
    new EmpregaPalhocaScraper(),
    new NerdinScraper(),
    new InfojobsScraper(bridge),
    new ChaworkScraper(),
    new TrabalhaBrasilScraper(bridge),
    new BneScraper(),
    new EmpregosScraper(),
    new RecrutaSimplesScraper(),
    new RecruteiEmpregosScraper(),
    new QuickinScraper(),
    new RecruteiJobsScraper(),
    new PandapeScraper(),
    new GeekHunterScraper(bridge),
    new ReveloScraper(),
    new NoventaENoveJobsScraper(),
    new SolidesScraper(),
    new RunTalentScraper(),
    new EmpregareScraper(),
    new TramposScraper(bridge),
    new Freelas99Scraper(),
    new WorkanaScraper(),
  ];

  console.log(`Auditando sequencialmente ${scrapers.length} fontes cadastradas...\n`);

  const results: AuditResult[] = [];
  const TIMEOUT_PER_SCRAPER = 30000;

  for (let i = 0; i < scrapers.length; i++) {
    const scraper = scrapers[i];
    const isPython = Boolean(scraper.requiresPython && isPythonOnline);
    const engine: 'NODE' | 'PYTHON' = isPython ? 'PYTHON' : 'NODE';
    const start = Date.now();

    process.stdout.write(` [${String(i + 1).padStart(2, '0')}/${scrapers.length}] ${scraper.name.padEnd(20, ' ')} (${engine.padEnd(6, ' ')}) ... `);

    try {
      const jobs = await withTimeout(
        scraper.scrape(),
        TIMEOUT_PER_SCRAPER,
        `Timeout de ${TIMEOUT_PER_SCRAPER / 1000}s excedido`
      );
      const durationMs = Date.now() - start;

      const sampleTitle = jobs.length > 0 ? `"${jobs[0].title.slice(0, 35)}" (${jobs[0].company})` : undefined;
      const status: 'OK' | 'EMPTY' = jobs.length > 0 ? 'OK' : 'EMPTY';

      results.push({
        index: i + 1,
        name: scraper.name,
        engine,
        status,
        durationMs,
        jobsCount: jobs.length,
        sample: sampleTitle,
      });

      if (status === 'OK') {
        console.log(`✅ OK (${(durationMs / 1000).toFixed(1)}s) -> ${jobs.length} vagas`);
      } else {
        console.log(`⚪ 0 vagas (${(durationMs / 1000).toFixed(1)}s)`);
      }
    } catch (err) {
      const durationMs = Date.now() - start;
      const errMsg = (err as Error).message || String(err);

      results.push({
        index: i + 1,
        name: scraper.name,
        engine,
        status: 'ERROR',
        durationMs,
        jobsCount: 0,
        error: errMsg,
      });

      console.log(`❌ ERRO (${(durationMs / 1000).toFixed(1)}s): ${errMsg.slice(0, 50)}`);
    }
  }

  // Resumo tabular
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                      RELATÓRIO CONSOLIDADO                                            ║');
  console.log('╠════╤══════════════════════╤═════════╤═════════╤═════════╤════════════════════════════════════════════════╣');
  console.log('║ #  │ FONTE                │ MOTOR   │ STATUS  │ VAGAS   │ TEMPO   │ EXEMPLO / MOTIVO                     ║');
  console.log('╟────┼──────────────────────┼─────────┼─────────┼─────────┼─────────┼──────────────────────────────────────╢');

  for (const r of results) {
    const statusIcon = r.status === 'OK' ? '✅ OK   ' : r.status === 'EMPTY' ? '⚪ VAZIO' : '❌ ERRO ';
    const example = r.sample || r.error?.slice(0, 36) || '-';
    console.log(
      `║ ${String(r.index).padStart(2, '0')} │ ${r.name.padEnd(20, ' ')} │ ${r.engine.padEnd(7, ' ')} │ ${statusIcon} │ ${String(r.jobsCount).padStart(7, ' ')} │ ${(r.durationMs / 1000).toFixed(1).padStart(5, ' ')}s │ ${example.padEnd(36, ' ').slice(0, 36)} ║`
    );
  }
  console.log('╚════╧══════════════════════╧═════════╧═════════╧═════════╧═════════╧══════════════════════════════════════╝\n');

  const totalScrapers = results.length;
  const nonErrorCount = results.filter((r) => r.status !== 'ERROR').length;
  const okCount = results.filter((r) => r.status === 'OK').length;
  const totalJobs = results.reduce((acc, r) => acc + r.jobsCount, 0);
  const totalTimeSec = (results.reduce((acc, r) => acc + r.durationMs, 0) / 1000).toFixed(1);
  const successRate = ((nonErrorCount / totalScrapers) * 100).toFixed(1);

  console.log('📊 RESUMO ESTATÍSTICO:');
  console.log(` • Fontes Auditadas:       ${totalScrapers}`);
  console.log(` • Fontes com Vagas:       ${okCount}/${totalScrapers}`);
  console.log(` • Fontes sem Erro Crítico:${nonErrorCount}/${totalScrapers} (${successRate}% de disponibilidade)`);
  console.log(` • Total Vagas Coletadas:  ${totalJobs}`);
  console.log(` • Tempo Total de Varredura: ${totalTimeSec}s`);
  console.log('\n--- AUDITORIA CONCLUÍDA COM SUCESSO ---');
}

runAudit().catch((err) => {
  console.error('Falha crítica na auditoria:', err);
  process.exit(1);
});
