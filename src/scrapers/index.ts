export type { JobScraper } from './base.js';
export { GupyScraper } from './gupy.js';
export { LinkedInScraper } from './linkedin.js';
export { IndeedScraper } from './indeed.js';
export { GoogleJobsScraper } from './googleJobs.js';
export { TelegramScraper } from './telegram.js';
export { ProgramathorScraper } from './programathor.js';
export { RemotarScraper } from './remotar.js';
export { CathoScraper } from './catho.js';
export { GlassdoorScraper } from './glassdoor.js';
// Regionais SC
export { SaoJoseScraper } from './saoJose.js';
export { VagasScScraper } from './vagasSc.js';
export { VagasFloripaScraper } from './vagasFloripa.js';
export { EmpregaPalhocaScraper } from './empregaPalhoca.js';
// Nacionais
export { InfojobsScraper } from './infojobs.js';
export { ChaworkScraper } from './chawork.js';
export { TrabalhaBrasilScraper } from './trabalhaBrasil.js';
export { BneScraper } from './bne.js';
export { BebeeScraper } from './bebee.js';
export { EmpregosScraper } from './empregos.js';
export { RecrutaSimplesScraper } from './recrutaSimples.js';
// ATSs
export { RecruteiEmpregosScraper } from './recruteiEmpregos.js';
export { QuickinScraper } from './quickin.js';
export { RecruteiJobsScraper } from './recruteiJobs.js';
export { PandapeScraper } from './pandape.js';
// Freelance & Projetos
export { Freelas99Scraper } from './99freelas.js';
export { WorkanaScraper } from './workana.js';
// Novas Fontes Tech
export { GeekHunterScraper } from './geekhunter.js';
export { NerdinScraper } from './nerdin.js';
export { ReveloScraper } from './revelo.js';
export { NoventaENoveJobsScraper } from './noventaENoveJobs.js';
export { SolidesScraper } from './solides.js';
export { RunTalentScraper } from './runTalent.js';
export { EmpregareScraper } from './empregare.js';
export { TramposScraper } from './trampos.js';
export { FacebookGroupsScraper } from './facebookGroups.js';
export { LinkedInPostsScraper } from './linkedinPosts.js';

import { JobScraper } from './base.js';
import { GupyScraper } from './gupy.js';
import { LinkedInScraper } from './linkedin.js';
import { IndeedScraper } from './indeed.js';
import { GoogleJobsScraper } from './googleJobs.js';
import { TelegramScraper } from './telegram.js';
import { ProgramathorScraper } from './programathor.js';
import { RemotarScraper } from './remotar.js';
import { CathoScraper } from './catho.js';
import { GlassdoorScraper } from './glassdoor.js';
import { SaoJoseScraper } from './saoJose.js';
import { VagasScScraper } from './vagasSc.js';
import { VagasFloripaScraper } from './vagasFloripa.js';
import { EmpregaPalhocaScraper } from './empregaPalhoca.js';
import { InfojobsScraper } from './infojobs.js';
import { ChaworkScraper } from './chawork.js';
import { TrabalhaBrasilScraper } from './trabalhaBrasil.js';
import { BneScraper } from './bne.js';
import { BebeeScraper } from './bebee.js';
import { EmpregosScraper } from './empregos.js';
import { RecrutaSimplesScraper } from './recrutaSimples.js';
import { RecruteiEmpregosScraper } from './recruteiEmpregos.js';
import { QuickinScraper } from './quickin.js';
import { RecruteiJobsScraper } from './recruteiJobs.js';
import { PandapeScraper } from './pandape.js';
import { Freelas99Scraper } from './99freelas.js';
import { WorkanaScraper } from './workana.js';
import { GeekHunterScraper } from './geekhunter.js';
import { NerdinScraper } from './nerdin.js';
import { ReveloScraper } from './revelo.js';
import { NoventaENoveJobsScraper } from './noventaENoveJobs.js';
import { SolidesScraper } from './solides.js';
import { RunTalentScraper } from './runTalent.js';
import { EmpregareScraper } from './empregare.js';
import { TramposScraper } from './trampos.js';
import { FacebookGroupsScraper } from './facebookGroups.js';
import { LinkedInPostsScraper } from './linkedinPosts.js';

import { RawJob } from '../types/job.js';
import { TelegramNotifier } from '../services/telegramNotifier.js';
import { runWithConcurrencyLimit, withTimeout } from '../utils/concurrency.js';
import { ScraperLogger } from '../services/scraperLogger.js';
import { PythonBridgeClient } from '../services/pythonBridge.js';

export interface OrchestratorOptions {
  concurrency?: number;
  timeoutPerScraperMs?: number;
  logger?: ScraperLogger;
  pythonBridge?: PythonBridgeClient;
}

export interface ScraperExecutionMetric {
  name: string;
  durationMs: number;
  jobsFound: number;
  success: boolean;
  error?: string;
  engine?: 'node' | 'python';
}

export class ScraperOrchestrator {
  private scrapers: JobScraper[];
  private notifier: TelegramNotifier;
  private concurrency: number;
  private timeoutPerScraperMs: number;
  private logger: ScraperLogger;
  private pythonBridge: PythonBridgeClient;

  constructor(notifier?: TelegramNotifier, options?: OrchestratorOptions) {
    this.pythonBridge = options?.pythonBridge || new PythonBridgeClient();
    this.scrapers = [

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
      new BebeeScraper(),
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
      // Comunidades & Redes Sociais
      new FacebookGroupsScraper(),
      new LinkedInPostsScraper(),
    ];


    this.notifier = notifier || new TelegramNotifier();
    this.concurrency = options?.concurrency || 5;
    this.timeoutPerScraperMs = options?.timeoutPerScraperMs || 45000;
    this.logger = options?.logger || new ScraperLogger('Orchestrator');
  }

  async runAll(targetScraperName?: string): Promise<RawJob[]> {
    const scrapersToRun = targetScraperName
      ? this.scrapers.filter(
          (s) =>
            s.name.toLowerCase() === targetScraperName.toLowerCase() ||
            s.name.toLowerCase().includes(targetScraperName.toLowerCase())
        )
      : this.scrapers;

    if (scrapersToRun.length === 0) {
      this.logger.warn(`Nenhum conector encontrado com o nome "${targetScraperName}".`, {
        step: 'PROGRESS',
        data: { target: targetScraperName },
      });
      return [];
    }

    // Checagem de disponibilidade do microserviço Python Scrapling Engine
    const isPythonAvailable = await this.pythonBridge.isAvailable();
    if (isPythonAvailable) {
      this.logger.info('🐍 Microserviço Scrapling Engine (Python) está ONLINE e operacional.', {
        step: 'PROGRESS',
        data: { pythonEngine: 'healthy' },
      });
    } else {
      this.logger.warn('⚠️ Microserviço Scrapling Engine (Python) OFFLINE. Usando fallback TypeScript nativo para fontes elegíveis.', {
        step: 'PROGRESS',
        data: { pythonEngine: 'unreachable' },
      });
    }

    this.logger.info(
      targetScraperName
        ? `Iniciando execução individual do conector "${scrapersToRun[0].name}"...`
        : `Iniciando execução paralela de ${scrapersToRun.length} scrapers (Concorrência: ${this.concurrency}, Timeout: ${this.timeoutPerScraperMs / 1000}s)...`,
      {
        step: 'START',
        data: { totalScrapers: scrapersToRun.length, concurrency: this.concurrency, pythonEngineOnline: isPythonAvailable },
      }
    );

    const startTime = Date.now();
    const metrics: ScraperExecutionMetric[] = [];
    const allJobs: RawJob[] = [];

    const results = await runWithConcurrencyLimit(scrapersToRun, this.concurrency, async (scraper) => {
      const scraperLogger = this.logger.forScraper(scraper.name);
      const scraperStart = Date.now();
      
      const shouldUsePython = Boolean(scraper.requiresPython && isPythonAvailable);
      const engineName = shouldUsePython ? 'python' : 'node';

      scraperLogger.info(`Buscando vagas em ${scraper.name} (Motor: ${engineName.toUpperCase()})...`, {
        step: 'START',
        data: { scraper: scraper.name, engine: engineName },
      });

      try {
        let scrapePromise: Promise<RawJob[]>;

        if (shouldUsePython) {
          const pythonSource = scraper.pythonSourceName || scraper.name.toLowerCase();
          scrapePromise = this.pythonBridge.scrape(pythonSource);
        } else {
          scrapePromise = scraper.scrape();
        }

        const jobs = await withTimeout(
          scrapePromise,
          this.timeoutPerScraperMs,
          `Tempo limite excedido (${this.timeoutPerScraperMs / 1000}s)`
        );

        const durationMs = Date.now() - scraperStart;
        scraperLogger.info(`Finalizado em ${(durationMs / 1000).toFixed(1)}s com ${jobs.length} vagas encontradas via ${engineName.toUpperCase()}.`, {
          step: 'FINISH',
          data: { scraper: scraper.name, durationMs, jobsFound: jobs.length, engine: engineName },
        });

        metrics.push({
          name: scraper.name,
          durationMs,
          jobsFound: jobs.length,
          success: true,
          engine: engineName,
        });

        return jobs;
      } catch (err) {
        const durationMs = Date.now() - scraperStart;
        const errorMsg = (err as Error).message || String(err);
        
        // Log estruturado com level ERROR e stack trace
        scraperLogger.error(`Falha no scraper ${scraper.name} (${engineName.toUpperCase()}) após ${(durationMs / 1000).toFixed(1)}s: ${errorMsg}`, err, {
          data: { scraper: scraper.name, durationMs, engine: engineName },
        });

        metrics.push({
          name: scraper.name,
          durationMs,
          jobsFound: 0,
          success: false,
          error: errorMsg,
          engine: engineName,
        });

        // Enviar alerta não bloqueante no Telegram
        const alertText = `⚠️ [ALERTA] O scraper ${scraper.name} (${engineName}) falhou: ${errorMsg}`;
        this.notifier.sendAlert(alertText).catch((telegramErr) => {
          console.warn(`[ScraperOrchestrator] Erro ao enviar alerta Telegram:`, (telegramErr as Error).message);
        });

        return [] as RawJob[];
      }
    });


    for (const jobBatch of results) {
      allJobs.push(...jobBatch);
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const successCount = metrics.filter((m) => m.success).length;
    const errorCount = metrics.filter((m) => !m.success).length;

    this.logger.info(`Coleta concluída em ${totalDuration}s. Total de ${allJobs.length} vagas de ${successCount} fontes (${errorCount} falhas).`, {
      step: 'FINISH',
      data: { totalJobs: allJobs.length, successCount, errorCount, durationSeconds: Number(totalDuration) },
    });

    return allJobs;
  }
}
