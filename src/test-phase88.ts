import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, initDatabase } from './db/index';
import { AdminScraperRepository, ScraperMonitoringItem } from './db/adminScraperRepository';

async function runPhase88Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 88 (TABELA DE MONITORAMENTO & MÉTRICAS EM TEMPO REAL) ---');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (!condition) {
      console.error(`❌ [TEST ${total}] FALHOU: ${testName}`);
      process.exit(1);
    }
    passed++;
    console.log(`✅ [TEST ${total}] PASSOU: ${testName}`);
  }

  const rootDir = process.cwd();
  initDatabase();

  // Test 1: Existência física da rota de métricas
  const metricsRoutePath = path.join(rootDir, 'src/app/api/admin/scraper/metrics/route.ts');
  assert(fs.existsSync(metricsRoutePath), 'src/app/api/admin/scraper/metrics/route.ts deve existir');

  // Test 2: Segurança e estrutura do endpoint de métricas
  const metricsRouteContent = fs.readFileSync(metricsRoutePath, 'utf-8');
  assert(
    metricsRouteContent.includes('getAdminSessionUser') &&
    metricsRouteContent.includes('getMonitoringMetrics') &&
    metricsRouteContent.includes('getConnectorLogs'),
    'Endpoint /api/admin/scraper/metrics deve exigir sessão de administrador e expor métricas e logs de conectores'
  );

  // Test 3: Repositório AdminScraperRepository instanciado com getMonitoringMetrics
  const repo = new AdminScraperRepository();
  const metrics = repo.getMonitoringMetrics();
  assert(Boolean(metrics && Array.isArray(metrics.items)), 'getMonitoringMetrics deve retornar array items');
  assert(Boolean(metrics && typeof metrics.summary === 'object'), 'getMonitoringMetrics deve retornar objeto summary');

  // Test 4: Quantidade mínima de conectores monitorados
  assert(metrics.items.length >= 30, `Deve monitorar no mínimo 30 conectores (encontrados: ${metrics.items.length})`);

  // Test 5: Integridade estrutural de cada item de monitoramento
  const validStatuses = new Set(['running', 'success', 'failed', 'idle', 'disabled']);
  const allItemsValid = metrics.items.every(
    (item) =>
      typeof item.name === 'string' &&
      typeof item.is_enabled === 'number' &&
      typeof item.method === 'string' &&
      typeof item.timeout_ms === 'number' &&
      validStatuses.has(item.status) &&
      typeof item.last_jobs_found === 'number' &&
      typeof item.total_jobs_stored === 'number'
  );
  assert(allItemsValid, 'Todos os itens de monitoramento devem conter as propriedades estritas e status válido');

  // Test 6: Validação do resumo estatístico (summary)
  const { summary } = metrics;
  assert(summary.total === metrics.items.length, 'summary.total deve coincidir com a contagem de items');
  assert(summary.active + summary.disabled === summary.total, 'summary.active + summary.disabled deve ser igual a summary.total');
  assert(typeof summary.avgLatencyMs === 'number', 'summary.avgLatencyMs deve ser numérico');
  assert(typeof summary.totalJobsStored === 'number' && summary.totalJobsStored >= 0, 'summary.totalJobsStored deve ser numérico não-negativo');

  // Test 7: Diagnóstico individual de conector (getConnectorLogs)
  const gupyLogs = repo.getConnectorLogs('Gupy', 10);
  assert(Array.isArray(gupyLogs), 'getConnectorLogs deve retornar um array de logs');

  // Test 8: Simulação de status 'running' via log recente de início
  const testRunId = `test_run_${Date.now()}`;
  const testScraperName = 'SimulatedRunningScraper';
  const now = new Date().toISOString();

  // Insere configuração de teste
  db.prepare(`
    INSERT OR REPLACE INTO scraper_configs (name, is_enabled, method, target_url, timeout_ms, updated_at)
    VALUES (?, 1, 'ssr', 'https://teste.com', 45000, ?)
  `).run(testScraperName, now);

  // Insere log de início
  db.prepare(`
    INSERT INTO scraper_logs (id, run_id, scraper_name, level, message, details, created_at)
    VALUES (?, ?, ?, 'INFO', ?, null, ?)
  `).run(crypto.randomUUID(), testRunId, testScraperName, `Buscando vagas em ${testScraperName} (Motor: NODE)...`, now);

  const metricsAfterRunning = repo.getMonitoringMetrics();
  const runningItem = metricsAfterRunning.items.find((i) => i.name === testScraperName);
  assert(Boolean(runningItem && runningItem.status === 'running'), 'Conector com log de início nos últimos 3 min sem término deve ter status "running"');

  // Test 9: Simulação de status 'failed' via log de erro
  const failNow = new Date().toISOString();
  db.prepare(`
    INSERT INTO scraper_logs (id, run_id, scraper_name, level, message, details, created_at)
    VALUES (?, ?, ?, 'ERROR', ?, null, ?)
  `).run(crypto.randomUUID(), testRunId, testScraperName, `Falha no scraper ${testScraperName} (NODE) após 3.5s: Timeout 403 Forbidden`, failNow);

  const metricsAfterFail = repo.getMonitoringMetrics();
  const failedItem = metricsAfterFail.items.find((i) => i.name === testScraperName);
  assert(
    Boolean(failedItem && failedItem.status === 'failed' && failedItem.last_error?.includes('403 Forbidden')),
    'Conector com log de erro deve ter status "failed" e registrar last_error'
  );

  // Test 10: Simulação de status 'success' via log de finalização
  const successNow = new Date().toISOString();
  db.prepare(`
    INSERT INTO scraper_logs (id, run_id, scraper_name, level, message, details, created_at)
    VALUES (?, ?, ?, 'INFO', ?, null, ?)
  `).run(crypto.randomUUID(), testRunId, testScraperName, `Finalizado em 2.4s com 15 vagas encontradas via NODE.`, successNow);

  const metricsAfterSuccess = repo.getMonitoringMetrics();
  const successItem = metricsAfterSuccess.items.find((i) => i.name === testScraperName);
  assert(
    Boolean(successItem && successItem.status === 'success' && successItem.last_latency_ms === 2400 && successItem.last_jobs_found === 15),
    'Conector com log de finalização deve ter status "success", latência calculada (2400ms) e vagas identificadas (15)'
  );

  // Limpeza dos dados simulados
  db.prepare('DELETE FROM scraper_logs WHERE scraper_name = ?').run(testScraperName);
  db.prepare('DELETE FROM scraper_configs WHERE name = ?').run(testScraperName);

  // Test 11: Validação do frontend (/admin/scrapers/page.tsx)
  const pagePath = path.join(rootDir, 'src/app/admin/scrapers/page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');
  assert(
    pageContent.includes('Auto-Refresh (10s)') &&
    pageContent.includes('/api/admin/scraper/metrics') &&
    pageContent.includes('formatLatency') &&
    pageContent.includes('formatRelativeTime') &&
    pageContent.includes('openDiagnosisModal') &&
    pageContent.includes('Diagnóstico de Conector'),
    'Página /admin/scrapers deve implementar auto-refresh de 10s, telemetria ao vivo, formatação de latência e modal de diagnóstico'
  );

  console.log(`\n======================================================`);
  console.log(`  RESULTADO DA SUÍTE DA PHASE 88:`);
  console.log(`  Total de testes executados: ${total}`);
  console.log(`  Testes aprovados: ${passed}`);
  console.log(`  Testes reprovados: 0`);
  console.log(`  Status: 100% CONCLUÍDO E APROVADO ✓`);
  console.log(`======================================================\n`);
}

runPhase88Tests().catch((err) => {
  console.error('Erro na execução dos testes da Phase 88:', err);
  process.exit(1);
});
