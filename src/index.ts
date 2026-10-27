import dotenv from 'dotenv';
import { ScraperOrchestrator } from './scrapers/index.js';
import { JobRepository } from './db/repository.js';
import { HermesEvaluator } from './services/hermesEvaluator.js';
import { TelegramNotifier } from './services/telegramNotifier.js';
import { isOlderThanDays } from './utils/date.js';
import { matchesBlacklist, matchesWhitelist } from './config/jobFilters.js';
import { ScraperLogger } from './services/scraperLogger.js';

dotenv.config();

export async function runPipeline(customLogger?: ScraperLogger, targetScraperName?: string) {
  const target = targetScraperName || process.env.SCRAPER_TARGET || undefined;
  const logger = customLogger || new ScraperLogger(target || 'Pipeline');
  logger.info(
    target
      ? `Iniciando execução individual do conector "${target}"...`
      : 'Iniciando pipeline autônomo de monitoramento de vagas...',
    { step: 'START', data: { target: target || 'ALL' } }
  );

  console.log(`\n======================================================`);
  console.log(`  BUSCAVAG - PIPELINE AUTÔNOMO DE MONITORAMENTO DE VAGAS`);
  if (target) {
    console.log(`  Alvo Selecionado: ${target}`);
  }
  console.log(`  Executado em: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`======================================================\n`);

  const notifier = new TelegramNotifier();
  const orchestrator = new ScraperOrchestrator(notifier, { logger: logger.forScraper('Orchestrator') });
  const repo = new JobRepository();
  const evaluator = new HermesEvaluator();

  // 1. Coleta de vagas
  console.log(target ? `[1/4] Coletando vagas do conector ${target}...` : '[1/4] Coletando vagas dos conectores...');
  logger.info(
    target ? `[1/4] Coletando vagas do conector ${target}...` : '[1/4] Coletando vagas dos 24+ conectores...',
    { step: 'PROGRESS', data: { target: target || 'ALL' } }
  );
  const rawJobs = await orchestrator.runAll(target);
  console.log(`-> Total de vagas coletadas: ${rawJobs.length}`);

  // 2. Filtragem de duplicadas, limiar de data (5 dias) e filtros não-tech
  console.log('\n[2/4] Filtrando vagas duplicadas, limiar de 5 dias e filtros não-tech...');
  logger.info('[2/4] Aplicando filtros de duplicidade, recência e termos não-tech...', { step: 'PROGRESS' });
  let newJobsCount = 0;
  let evaluatedCount = 0;
  let approvedCount = 0;
  let blacklistFilteredCount = 0;
  let whitelistFilteredCount = 0;
  let duplicateFilteredCount = 0;
  let discardedNonTechCount = 0;

  for (const job of rawJobs) {
    if (isOlderThanDays(job.publishedAt, 5)) {
      continue;
    }

    // Filtro 1: Blacklist de títulos operacionais/não-tech
    const blacklistCheck = matchesBlacklist(job.title);
    if (blacklistCheck.matched) {
      blacklistFilteredCount++;
      const msg = `[FILTRO BLACKLIST] Vaga descartada: "${job.title}" | Termo: "${blacklistCheck.term}" | ${job.company}`;
      console.log(`   ${msg}`);
      logger.warn(msg, {
        step: 'PROGRESS',
        data: { title: job.title, company: job.company, filter: 'blacklist', term: blacklistCheck.term },
      });
      continue;
    }

    // Filtro 2: Whitelist obrigatória de termos tech
    const whitelistCheck = matchesWhitelist(job.title);
    if (!whitelistCheck.matched) {
      whitelistFilteredCount++;
      const msg = `[FILTRO WHITELIST] Vaga descartada (sem termo tech no título): "${job.title}" | ${job.company}`;
      console.log(`   ${msg}`);
      logger.warn(msg, {
        step: 'PROGRESS',
        data: { title: job.title, company: job.company, filter: 'whitelist' },
      });
      continue;
    }

    // Filtro 3: Deduplicação Multi-Fonte via Fingerprint & URL
    if (repo.exists(job.url, job.company, job.title, job.platform, job.location)) {
      duplicateFilteredCount++;
      const msg = `[DEDUPLICAÇÃO FINGERPRINT] Vaga já cadastrada via outra fonte ou URL: "${job.title}" (${job.company})`;
      console.log(`   ${msg}`);
      logger.info(msg, {
        step: 'PROGRESS',
        data: { title: job.title, company: job.company, filter: 'duplicate' },
      });
      continue;
    }

    newJobsCount++;

    // 3. Avaliação semântica via Hermes Agent / IA
    console.log(` -> Avaliando vaga: "${job.title}" | ${job.company}`);
    const evalResult = await evaluator.evaluate(job);
    evaluatedCount++;

    // REGRA DE INGESTÃO MULTI-TENANT (Fases 68 & 91):
    // Descartar apenas se NÃO for vaga de tecnologia/software ou se for classificada como 'Other' ou 'Não-Tech'
    if (!evalResult.isTechSoftware || evalResult.category === 'Other' || evalResult.category === 'Não-Tech') {
      discardedNonTechCount++;
      const msg = `[INGESTÃO DESCARTADA (NÃO-TECH)] "${job.title}" (${job.company}) - Categoria: ${evalResult.category} | ${evalResult.reasoning}`;
      console.log(`   ${msg}`);
      logger.info(msg, {
        step: 'PROGRESS',
        data: { title: job.title, company: job.company, filter: 'non_tech', category: evalResult.category },
      });
      continue;
    }

    approvedCount++;
    const topStacks = evalResult.techStack && evalResult.techStack.length > 0 ? evalResult.techStack.slice(0, 3).join(', ') : 'Gerais';
    const msg = `[INGESTÃO APROVADA TECH] "${job.title}" (${job.company}) Nível: ${evalResult.requiredSeniority || 'Não especificado'} | Stacks: ${topStacks}`;
    console.log(`   ${msg} [${evalResult.category}] | ${evalResult.reasoning}`);
    logger.info(msg, {
      step: 'PROGRESS',
      data: { title: job.title, company: job.company, seniority: evalResult.requiredSeniority || 'Não especificado', category: evalResult.category },
    });

    // Inserir no banco de dados com análise enriquecida neutra
    repo.insert(job, evalResult);
  }

  const statsMsg = `Estatísticas do ciclo: ${rawJobs.length} coletadas, ${blacklistFilteredCount + whitelistFilteredCount} pré-filtradas, ${duplicateFilteredCount} duplicadas descartadas, ${evaluatedCount} avaliadas, ${discardedNonTechCount} descartadas por não-tech, ${approvedCount} aprovadas no DB.`;
  console.log(`\nEstatísticas do ciclo:`);
  console.log(`- Vagas totais coletadas: ${rawJobs.length}`);
  console.log(`- Descartadas por blacklist de cargo: ${blacklistFilteredCount}`);
  console.log(`- Descartadas por falta de termo tech: ${whitelistFilteredCount}`);
  console.log(`- Descartadas por duplicidade (Fingerprint/URL): ${duplicateFilteredCount}`);
  console.log(`- Vagas novas avaliadas pela IA: ${evaluatedCount}`);
  console.log(`- Vagas descartadas por não serem de TI: ${discardedNonTechCount}`);
  console.log(`- Vagas técnicas armazenadas no banco: ${approvedCount}`);
  logger.info(statsMsg, {
    step: 'PROGRESS',
    data: {
      totalCollected: rawJobs.length,
      blacklistFiltered: blacklistFilteredCount,
      whitelistFiltered: whitelistFilteredCount,
      duplicateFiltered: duplicateFilteredCount,
      evaluated: evaluatedCount,
      discardedNonTech: discardedNonTechCount,
      approved: approvedCount,
    },
  });

  // 4. Envio de Notificações pendentes via Telegram
  console.log('\n[3/4] Buscando vagas aprovadas pendentes de notificação...');
  logger.info('[3/4] Verificando vagas aprovadas para envio de notificações...', { step: 'PROGRESS' });
  const pendingNotifications = repo.getPendingNotifications();
  console.log(`-> Vagas pendentes para envio: ${pendingNotifications.length}`);

  if (pendingNotifications.length > 0) {
    console.log('[4/4] Disparando notificações no Telegram (com delay de 800ms anti-ETIMEDOUT)...');
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const job of pendingNotifications) {
      const sent = await notifier.sendNotification(job);
      if (sent) {
        repo.markAsNotified(job.id);
        console.log(`  ✓ Notificada: "${job.title}" (${job.company})`);
        logger.info(`Notificação enviada: "${job.title}" (${job.company})`, {
          step: 'PROGRESS',
          data: { title: job.title, company: job.company },
        });
      }
      await delay(800); // Aguarda 800ms entre disparos
    }
  } else {
    console.log('[4/4] Nenhuma nova notificação pendente.');
  }

  logger.info(`Pipeline finalizado com sucesso! ${approvedCount} novas vagas adicionadas ao inbox.`, {
    step: 'FINISH',
    data: { approvedCount, evaluatedCount, totalCollected: rawJobs.length },
  });

  console.log(`\n======================================================`);
  console.log(`  PIPELINE FINALIZADO COM SUCESSO`);
  console.log(`======================================================\n`);
}

// Execução direta quando rodado como script principal
const isDirectRun = process.argv[1]?.includes('index');
if (isDirectRun) {
  const args = process.argv.slice(2);
  const scraperArgIdx = args.indexOf('--scraper');
  const cliTarget = scraperArgIdx !== -1 && args[scraperArgIdx + 1] ? args[scraperArgIdx + 1] : process.env.SCRAPER_TARGET;
  const notifier = new TelegramNotifier();
  runPipeline(undefined, cliTarget).catch(async (err) => {
    console.error('[ERRO CRÍTICO NO PIPELINE]:', err);
    const errorMsg = (err as Error).message || String(err);
    await notifier.sendAlert(`🚨 [ERRO CRÍTICO] O pipeline principal falhou: ${errorMsg}`);
    process.exit(1);
  });
}
