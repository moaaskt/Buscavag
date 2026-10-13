import fs from 'fs';
import path from 'path';
import { db, initDatabase } from './db/index';
import { AdminScraperRepository, ScraperConfigEntry } from './db/adminScraperRepository';

async function runPhase94Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 94 (REESTRUTURAÇÃO DA CENTRAL DE SCRAPERS & SUB-NAVEGAÇÃO POR ABAS) ---');
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

  initDatabase();
  const repo = new AdminScraperRepository();

  // ====================================================
  // 1. EXISTÊNCIA FÍSICA DOS ARQUIVOS E COMPONENTES
  // ====================================================

  const subTabsPath = path.resolve(process.cwd(), 'src/components/admin/ui/VelzonSubTabs.tsx');
  assert(fs.existsSync(subTabsPath), 'Componente VelzonSubTabs.tsx deve existir em src/components/admin/ui');

  const mainPagePath = path.resolve(process.cwd(), 'src/app/admin/scrapers/page.tsx');
  assert(fs.existsSync(mainPagePath), 'Página principal /admin/scrapers/page.tsx deve existir');

  const terminalPagePath = path.resolve(process.cwd(), 'src/app/admin/scrapers/terminal/page.tsx');
  assert(fs.existsSync(terminalPagePath), 'Página dedicada /admin/scrapers/terminal/page.tsx deve existir');

  const configPagePath = path.resolve(process.cwd(), 'src/app/admin/scrapers/config/page.tsx');
  assert(fs.existsSync(configPagePath), 'Página dedicada /admin/scrapers/config/page.tsx deve existir');

  // ====================================================
  // 2. EXPORTAÇÃO EM src/components/admin/ui/index.ts
  // ====================================================

  const uiIndexPath = path.resolve(process.cwd(), 'src/components/admin/ui/index.ts');
  const uiIndexContent = fs.readFileSync(uiIndexPath, 'utf-8');
  assert(
    uiIndexContent.includes("export * from './VelzonSubTabs'"),
    'src/components/admin/ui/index.ts deve exportar VelzonSubTabs'
  );

  // ====================================================
  // 3. AUDITORIA DA PÁGINA PRINCIPAL /admin/scrapers/page.tsx
  // ====================================================

  const mainPageContent = fs.readFileSync(mainPagePath, 'utf-8');

  assert(
    !mainPageContent.includes('<ScraperLiveTerminal'),
    'Página principal /admin/scrapers/page.tsx NÃO deve renderizar ScraperLiveTerminal inline'
  );

  assert(
    !mainPageContent.includes("from '@/components/admin/scrapers/ScraperLiveTerminal'"),
    'Página principal /admin/scrapers/page.tsx NÃO deve importar ScraperLiveTerminal'
  );

  assert(
    mainPageContent.includes('VelzonSubTabs') && mainPageContent.includes('<VelzonSubTabs'),
    'Página principal /admin/scrapers/page.tsx DEVE importar e renderizar VelzonSubTabs'
  );

  assert(
    mainPageContent.includes('/admin/scrapers/terminal'),
    'Página principal /admin/scrapers/page.tsx DEVE conter link/CTA para /admin/scrapers/terminal'
  );

  assert(
    mainPageContent.includes('/admin/scrapers/config'),
    'Página principal /admin/scrapers/page.tsx DEVE conter link para /admin/scrapers/config nas abas'
  );

  // ====================================================
  // 4. AUDITORIA DA PÁGINA DEDICADA DO TERMINAL (/admin/scrapers/terminal/page.tsx)
  // ====================================================

  const terminalPageContent = fs.readFileSync(terminalPagePath, 'utf-8');

  assert(
    terminalPageContent.includes('ScraperLiveTerminal') && terminalPageContent.includes('<ScraperLiveTerminal'),
    'Página /admin/scrapers/terminal/page.tsx DEVE importar e renderizar ScraperLiveTerminal'
  );

  assert(
    terminalPageContent.includes('VelzonSubTabs') && terminalPageContent.includes('<VelzonSubTabs'),
    'Página /admin/scrapers/terminal/page.tsx DEVE conter VelzonSubTabs'
  );

  assert(
    terminalPageContent.includes('/admin/scrapers'),
    'Página /admin/scrapers/terminal/page.tsx DEVE conter link de retorno para a central'
  );

  // ====================================================
  // 5. AUDITORIA DA PÁGINA DEDICADA DE CONFIGURAÇÃO (/admin/scrapers/config/page.tsx)
  // ====================================================

  const configPageContent = fs.readFileSync(configPagePath, 'utf-8');

  assert(
    configPageContent.includes('VelzonSubTabs') && configPageContent.includes('<VelzonSubTabs'),
    'Página /admin/scrapers/config/page.tsx DEVE conter VelzonSubTabs'
  );

  assert(
    configPageContent.includes('/api/admin/scraper/config'),
    'Página /admin/scrapers/config/page.tsx DEVE consumir a API /api/admin/scraper/config'
  );

  assert(
    configPageContent.includes('handleToggle') && configPageContent.includes('role="switch"'),
    'Página /admin/scrapers/config/page.tsx DEVE conter controle switch para toggle de ativação'
  );

  assert(
    configPageContent.includes('openEditModal') && configPageContent.includes('timeout_ms'),
    'Página /admin/scrapers/config/page.tsx DEVE conter suporte a edição de timeout e método'
  );

  // ====================================================
  // 6. DESTAQUE CONTÍNUO DO SIDEBAR EM SUB-ROTAS
  // ====================================================

  const sidebarPath = path.resolve(process.cwd(), 'src/components/admin/layout/AdminSidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');

  assert(
    sidebarContent.includes('pathname.startsWith(`${item.href}/`)'),
    'AdminSidebar DEVE manter isActive verdadeiro para sub-rotas como /admin/scrapers/terminal e /admin/scrapers/config'
  );

  // ====================================================
  // 7. GOVERNANÇA E PERSISTÊNCIA NO REPOSITÓRIO E BANCO
  // ====================================================

  const configs = repo.getAllConfigs();
  assert(configs.length >= 25, `AdminScraperRepository deve retornar todos os conectores (retornou: ${configs.length})`);

  // Testar toggle de ativação
  const targetScraper = configs[0];
  const originalState = targetScraper.is_enabled === 1;

  // Inverter estado
  const updatedToggle = repo.toggleScraper(targetScraper.name, !originalState);
  assert(
    updatedToggle !== null && updatedToggle.is_enabled === (!originalState ? 1 : 0),
    `toggleScraper deve alterar is_enabled para ${!originalState ? 1 : 0}`
  );

  // Restaurar estado original
  const restoredToggle = repo.toggleScraper(targetScraper.name, originalState);
  assert(
    restoredToggle !== null && restoredToggle.is_enabled === (originalState ? 1 : 0),
    'toggleScraper deve restaurar o estado original com sucesso'
  );

  // Testar alteração de timeout
  const originalTimeout = targetScraper.timeout_ms;
  const newTimeout = originalTimeout + 5000;
  const updatedTimeout = repo.updateConfig(targetScraper.name, { timeout_ms: newTimeout });
  assert(
    updatedTimeout !== null && updatedTimeout.timeout_ms === newTimeout,
    `updateConfig deve atualizar timeout_ms para ${newTimeout}`
  );

  // Restaurar timeout original
  repo.updateConfig(targetScraper.name, { timeout_ms: originalTimeout });
  const restoredConfig = repo.getConfig(targetScraper.name);
  assert(
    restoredConfig?.timeout_ms === originalTimeout,
    'updateConfig deve restaurar o timeout_ms original'
  );

  console.log(`\n🎉 TODOS OS ${passed}/${total} TESTES DA PHASE 94 FORAM CONCLUÍDOS COM 100% DE SUCESSO!`);
}

runPhase94Tests().catch((err) => {
  console.error('Erro fatal nos testes da Phase 94:', err);
  process.exit(1);
});
