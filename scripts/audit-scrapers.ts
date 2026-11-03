import dotenv from 'dotenv';
dotenv.config();

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { PythonBridgeClient } from '../src/services/pythonBridge.js';

import { JobScraper } from '../src/scrapers/base.js';
import { GupyScraper } from '../src/scrapers/gupy.js';
import { LinkedInScraper } from '../src/scrapers/linkedin.js';
import { IndeedScraper } from '../src/scrapers/indeed.js';
import { GoogleJobsScraper } from '../src/scrapers/googleJobs.js';
import { TelegramScraper } from '../src/scrapers/telegram.js';
import { ProgramathorScraper } from '../src/scrapers/programathor.js';
import { RemotarScraper } from '../src/scrapers/remotar.js';
import { CathoScraper } from '../src/scrapers/catho.js';
import { GlassdoorScraper } from '../src/scrapers/glassdoor.js';
// Regionais SC
import { SaoJoseScraper } from '../src/scrapers/saoJose.js';
import { VagasScScraper } from '../src/scrapers/vagasSc.js';
import { VagasFloripaScraper } from '../src/scrapers/vagasFloripa.js';
import { EmpregaPalhocaScraper } from '../src/scrapers/empregaPalhoca.js';
import { NerdinScraper } from '../src/scrapers/nerdin.js';
// Nacionais
import { InfojobsScraper } from '../src/scrapers/infojobs.js';
import { ChaworkScraper } from '../src/scrapers/chawork.js';
import { TrabalhaBrasilScraper } from '../src/scrapers/trabalhaBrasil.js';
import { BneScraper } from '../src/scrapers/bne.js';
import { EmpregosScraper } from '../src/scrapers/empregos.js';
import { RecrutaSimplesScraper } from '../src/scrapers/recrutaSimples.js';
// ATSs
import { RecruteiEmpregosScraper } from '../src/scrapers/recruteiEmpregos.js';
import { QuickinScraper } from '../src/scrapers/quickin.js';
import { RecruteiJobsScraper } from '../src/scrapers/recruteiJobs.js';
import { PandapeScraper } from '../src/scrapers/pandape.js';
// Tech Especializadas
import { GeekHunterScraper } from '../src/scrapers/geekhunter.js';
import { ReveloScraper } from '../src/scrapers/revelo.js';
import { NoventaENoveJobsScraper } from '../src/scrapers/noventaENoveJobs.js';
import { SolidesScraper } from '../src/scrapers/solides.js';
import { RunTalentScraper } from '../src/scrapers/runTalent.js';
import { EmpregareScraper } from '../src/scrapers/empregare.js';
import { TramposScraper } from '../src/scrapers/trampos.js';
// Freelance
import { Freelas99Scraper } from '../src/scrapers/99freelas.js';
import { WorkanaScraper } from '../src/scrapers/workana.js';
import { LinkedInPostsScraper } from '../src/scrapers/linkedinPosts.js';
import { FacebookGroupsScraper } from '../src/scrapers/facebookGroups.js';

import { runWithConcurrencyLimit, withTimeout } from '../src/utils/concurrency.js';

type AuditStatus = 'SUCCESS' | 'WARNING' | 'FAILED';

interface ScraperAuditResult {
  source: string;
  status: AuditStatus;
  jobsCount: number;
  durationSeconds: number;
  error?: string;
}

const CONCURRENCY_LIMIT = 3;
const SCRAPER_TIMEOUT_MS = 45000;

let pythonProcess: ChildProcess | null = null;
const pythonBridge = new PythonBridgeClient();

async function ensurePythonBridge(): Promise<void> {
  if (await pythonBridge.isAvailable()) return;

  const venvPythonWin = path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe');
  const pythonBin = fs.existsSync(venvPythonWin) ? venvPythonWin : 'python';

  try {
    pythonProcess = spawn(
      pythonBin,
      ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'src/services/scrapling-engine', '--port', '8001', '--host', '127.0.0.1'],
      { cwd: process.cwd(), stdio: 'ignore', detached: false }
    );

    for (let i = 0; i < 8; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (await pythonBridge.isAvailable()) return;
    }
  } catch {}
}

function getAllScrapers(): JobScraper[] {
  return [
    new GupyScraper(),
    new LinkedInScraper(),
    new IndeedScraper(),
    new GoogleJobsScraper(),
    new TelegramScraper(),
    new ProgramathorScraper(),
    new RemotarScraper(),
    new CathoScraper(),
    new GlassdoorScraper(),
    // Regionais SC
    new SaoJoseScraper(),
    new VagasScScraper(),
    new VagasFloripaScraper(),
    new EmpregaPalhocaScraper(),
    new NerdinScraper(),
    // Nacionais
    new InfojobsScraper(),
    new ChaworkScraper(),
    new TrabalhaBrasilScraper(),
    new BneScraper(),
    new EmpregosScraper(),
    new RecrutaSimplesScraper(),
    // ATSs
    new RecruteiEmpregosScraper(),
    new QuickinScraper(),
    new RecruteiJobsScraper(),
    new PandapeScraper(),
    // Tech Especializadas
    new GeekHunterScraper(),
    new ReveloScraper(),
    new NoventaENoveJobsScraper(),
    new SolidesScraper(),
    new RunTalentScraper(),
    new EmpregareScraper(),
    new TramposScraper(),
    // Freelance
    new Freelas99Scraper(),
    new WorkanaScraper(),
    new LinkedInPostsScraper(),
    new FacebookGroupsScraper(),
  ];
}

async function auditSingleScraper(scraper: JobScraper): Promise<ScraperAuditResult> {
  const startTime = Date.now();
  try {
    const jobs = await withTimeout(
      scraper.scrape(),
      SCRAPER_TIMEOUT_MS,
      `Timeout após ${SCRAPER_TIMEOUT_MS / 1000}s`
    );
    const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
    const count = Array.isArray(jobs) ? jobs.length : 0;

    return {
      source: scraper.name,
      status: count > 0 ? 'SUCCESS' : 'WARNING',
      jobsCount: count,
      durationSeconds,
    };
  } catch (err) {
    const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
    const rawError = (err as Error).message || String(err);
    const cleanError = rawError.replace(/\n+/g, ' ').substring(0, 100);

    return {
      source: scraper.name,
      status: 'FAILED',
      jobsCount: 0,
      durationSeconds,
      error: cleanError,
    };
  }
}

async function runAudit() {
  await ensurePythonBridge();

  const scrapers = getAllScrapers();
  const total = scrapers.length;

  console.log(`\n======================================================`);
  console.log(` 🔍 AUDITORIA DE SCRAPERS - BUSCAVAG (${total} FONTES ATIVAS)`);
  console.log(` ⚙️  Concorrência: ${CONCURRENCY_LIMIT} | Timeout: ${SCRAPER_TIMEOUT_MS / 1000}s`);
  console.log(` 🚫 Fonte beBee: DESATIVADA (Pago/Descartada)`);
  console.log(`======================================================\n`);

  const results: ScraperAuditResult[] = [];
  let completed = 0;

  const auditStart = Date.now();
  await runWithConcurrencyLimit(scrapers, CONCURRENCY_LIMIT, async (scraper) => {
    const result = await auditSingleScraper(scraper);
    results.push(result);
    completed++;

    const icon = result.status === 'SUCCESS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    const num = String(completed).padStart(2, '0');
    const name = scraper.name.padEnd(25, ' ');
    const count = String(result.jobsCount).padStart(3, ' ');
    const dur = `${result.durationSeconds}s`.padStart(6, ' ');
    const errInfo = result.error ? ` (${result.error})` : '';

    console.log(`[${num}/${total}] ${icon} ${name} -> ${result.status.padEnd(7, ' ')} | ${count} vagas | ${dur}${errInfo}`);
    return result;
  });
  const auditDuration = ((Date.now() - auditStart) / 1000).toFixed(2);

  const successful = results.filter((r) => r.status === 'SUCCESS');
  const warning = results.filter((r) => r.status === 'WARNING');
  const failed = results.filter((r) => r.status === 'FAILED');
  const totalJobs = results.reduce((acc, curr) => acc + curr.jobsCount, 0);

  console.log(`\n📊 TABELA DETALHADA DE RESULTADOS:`);
  console.table(
    results.map((r) => ({
      Fonte: r.source,
      Status: r.status === 'SUCCESS' ? 'SUCCESS ✅' : r.status === 'WARNING' ? 'WARNING ⚠️' : 'FAILED ❌',
      Vagas: r.jobsCount,
      'Tempo (s)': r.durationSeconds,
      Erro: r.error || '-',
    }))
  );

  console.log(`\n======================================================`);
  console.log(` 📋 PAINEL DE RESUMO DA AUDITORIA`);
  console.log(`======================================================`);
  console.log(` • Total de Fontes Auditadas : ${total}`);
  console.log(` • Ativas com Sucesso (✅)   : ${successful.length} (${((successful.length / total) * 100).toFixed(1)}%)`);
  console.log(` • Fontes Zeradas (⚠️)       : ${warning.length}`);
  console.log(` • Fontes com Falha (❌)     : ${failed.length}`);
  console.log(` • Total Geral de Vagas      : ${totalJobs} vagas capturadas`);
  console.log(` • Tempo Total de Auditoria  : ${auditDuration}s`);
  console.log(`======================================================\n`);

  if (pythonProcess && !pythonProcess.killed) {
    try { pythonProcess.kill(); } catch {}
  }
}

runAudit().catch((err) => {
  console.error('Erro crítico na auditoria:', err);
  if (pythonProcess && !pythonProcess.killed) {
    try { pythonProcess.kill(); } catch {}
  }
  process.exit(1);
});
