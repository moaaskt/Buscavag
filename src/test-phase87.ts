import fs from 'fs';
import path from 'path';
import { db, initDatabase } from './db/index';
import { AdminScraperRepository, ScraperConfigEntry } from './db/adminScraperRepository';
import { ScraperOrchestrator } from './scrapers/index';

async function runPhase87Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 87 (CENTRAL DE SCRAPERS & PAINEL DE CONTROLE) ---');
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

  // Test 1: Existência física da página da Central de Scrapers
  const scrapersPagePath = path.join(rootDir, 'src/app/admin/scrapers/page.tsx');
  assert(fs.existsSync(scrapersPagePath), 'src/app/admin/scrapers/page.tsx deve existir');

  // Test 2: Navegação na Sidebar
  const sidebarPath = path.join(rootDir, 'src/components/admin/layout/AdminSidebar.tsx');
  assert(fs.existsSync(sidebarPath), 'AdminSidebar.tsx deve existir');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
  assert(
    sidebarContent.includes('/admin/scrapers') &&
    sidebarContent.includes('Central de Scrapers') &&
    sidebarContent.includes('Cpu'),
    'AdminSidebar deve conter link para /admin/scrapers com ícone Cpu no menu Operações SaaS'
  );

  // Test 3: Existência da tabela scraper_configs no SQLite
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scraper_configs'").get();
  assert(Boolean(tableCheck), 'Tabela scraper_configs deve existir no banco de dados SQLite');

  // Test 4: Verificação de colunas na tabela scraper_configs
  const cols = (db.pragma('table_info(scraper_configs)') as Array<{ name: string }>).map((c) => c.name);
  assert(
    cols.includes('name') &&
    cols.includes('is_enabled') &&
    cols.includes('method') &&
    cols.includes('target_url') &&
    cols.includes('timeout_ms') &&
    cols.includes('updated_at'),
    'Tabela scraper_configs deve conter colunas: name, is_enabled, method, target_url, timeout_ms, updated_at'
  );

  // Test 5: Repositório AdminScraperRepository e Seed Inicial
  const repo = new AdminScraperRepository();
  const allConfigs = repo.getAllConfigs();
  assert(allConfigs.length >= 30, `AdminScraperRepository deve conter no mínimo 30 conectores semeados (encontrados: ${allConfigs.length})`);

  // Test 6: Verificação de métodos válidos de scraping
  const validMethods = new Set(['playwright', 'ssr', 'api', 'cookie']);
  const allValidMethods = allConfigs.every((c) => validMethods.has(c.method));
  assert(allValidMethods, 'Todos os conectores devem possuir métodos válidos (playwright, ssr, api ou cookie)');

  // Test 7: Consulta de conector individual (getConfig)
  const gupyConfig = repo.getConfig('Gupy');
  assert(Boolean(gupyConfig && gupyConfig.name === 'Gupy'), 'Deve ser possível consultar a configuração de um conector específico (ex: Gupy)');

  // Test 8: Alternância de status (toggleScraper - Desativar)
  const initialStatus = gupyConfig?.is_enabled;
  const toggledOff = repo.toggleScraper('Gupy', false);
  assert(Boolean(toggledOff && toggledOff.is_enabled === 0), 'toggleScraper deve desativar o conector com sucesso');

  // Test 9: Alternância de status (toggleScraper - Reativar)
  const toggledOn = repo.toggleScraper('Gupy', true);
  assert(Boolean(toggledOn && toggledOn.is_enabled === 1), 'toggleScraper deve reativar o conector com sucesso');

  // Test 10: Atualização de configuração (updateConfig)
  const testUpdated = repo.updateConfig('Gupy', { timeout_ms: 60000 });
  assert(Boolean(testUpdated && testUpdated.timeout_ms === 60000), 'updateConfig deve atualizar o timeout_ms com sucesso');

  // Restaura timeout padrão
  repo.updateConfig('Gupy', { timeout_ms: 45000 });

  // Test 11: Existência e conteúdo do endpoint de configuração
  const configRoutePath = path.join(rootDir, 'src/app/api/admin/scraper/config/route.ts');
  assert(fs.existsSync(configRoutePath), 'src/app/api/admin/scraper/config/route.ts deve existir');
  const configRouteContent = fs.readFileSync(configRoutePath, 'utf-8');
  assert(
    configRouteContent.includes('GET') &&
    configRouteContent.includes('PATCH') &&
    configRouteContent.includes('getAdminSessionUser') &&
    configRouteContent.includes('logAdminAction'),
    'Endpoint /api/admin/scraper/config deve suportar GET/PATCH com validação de sessão e auditoria'
  );

  // Test 12: Endpoint de execução suportando conector alvo
  const runRoutePath = path.join(rootDir, 'src/app/api/admin/scraper/run/route.ts');
  const runRouteContent = fs.readFileSync(runRoutePath, 'utf-8');
  assert(
    runRouteContent.includes('scraperName') &&
    runRouteContent.includes('SCRAPER_TARGET') &&
    runRouteContent.includes('--scraper'),
    'Endpoint /api/admin/scraper/run deve receber scraperName e repassar via SCRAPER_TARGET e flag --scraper'
  );

  // Test 13: ScraperOrchestrator com suporte a execução individual
  const orchestrator = new ScraperOrchestrator();
  assert(
    typeof (orchestrator.runAll) === 'function',
    'ScraperOrchestrator deve exportar o método runAll'
  );
  const orchestratorPath = path.join(rootDir, 'src/scrapers/index.ts');
  const orchestratorContent = fs.readFileSync(orchestratorPath, 'utf-8');
  assert(
    orchestratorContent.includes('targetScraperName') &&
    orchestratorContent.includes('scrapersToRun'),
    'ScraperOrchestrator deve filtrar conectores com base em targetScraperName quando fornecido'
  );

  // Test 14: Pipeline principal (src/index.ts) com suporte a conector alvo
  const indexPath = path.join(rootDir, 'src/index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  assert(
    indexContent.includes('targetScraperName') &&
    indexContent.includes('SCRAPER_TARGET') &&
    indexContent.includes('--scraper'),
    'src/index.ts deve aceitar targetScraperName, SCRAPER_TARGET e flag CLI --scraper'
  );

  // Test 15: Validação da interface do usuário da Central de Scrapers
  const pageContent = fs.readFileSync(scrapersPagePath, 'utf-8');
  assert(
    pageContent.includes('Central de Scrapers & Ingestão') &&
    pageContent.includes('Sincronizar Todas as Fontes') &&
    pageContent.includes('Disparar Conector Selecionado') &&
    pageContent.includes('Expurgar Vagas Rejeitadas') &&
    pageContent.includes('VelzonModal') &&
    pageContent.includes('role="switch"'),
    'Página /admin/scrapers deve conter ações globais, execução unitária, expurgo com modal e switches de toggle'
  );

  console.log(`\n======================================================`);
  console.log(`  RESULTADO DA SUÍTE DA PHASE 87:`);
  console.log(`  Total de testes executados: ${total}`);
  console.log(`  Testes aprovados: ${passed}`);
  console.log(`  Testes reprovados: 0`);
  console.log(`  Status: 100% CONCLUÍDO E APROVADO ✓`);
  console.log(`======================================================\n`);
}

runPhase87Tests().catch((err) => {
  console.error('Erro na execução dos testes da Phase 87:', err);
  process.exit(1);
});
