import fs from 'fs';
import path from 'path';

async function runPhase95Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 95 (PADRONIZAÇÃO GLOBAL DE SUB-NAVEGAÇÃO NOS MÓDULOS ADMIN) ---');
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

  // ====================================================
  // 1. EXISTÊNCIA FÍSICA E EXPORTAÇÃO DOS COMPONENTES
  // ====================================================

  const subTabsPath = path.resolve(process.cwd(), 'src/components/admin/ui/VelzonSubTabs.tsx');
  assert(fs.existsSync(subTabsPath), 'Componente VelzonSubTabs.tsx deve existir em src/components/admin/ui');

  const subTabsContent = fs.readFileSync(subTabsPath, 'utf-8');
  assert(
    subTabsContent.includes('export const AdminSubNav = VelzonSubTabs') ||
    subTabsContent.includes('export function AdminSubNav'),
    'VelzonSubTabs.tsx deve exportar o alias canônico AdminSubNav'
  );

  assert(
    subTabsContent.includes('onTabChange') && subTabsContent.includes('activeTab'),
    'VelzonSubTabs.tsx deve suportar props de abas interativas (onTabChange e activeTab)'
  );

  assert(
    subTabsContent.includes('role={onTabChange ? \'tablist\' : undefined}') || subTabsContent.includes('role="tab"'),
    'VelzonSubTabs.tsx deve suportar atributos semânticos de acessibilidade (tablist / tab)'
  );

  const uiIndexPath = path.resolve(process.cwd(), 'src/components/admin/ui/index.ts');
  const uiIndexContent = fs.readFileSync(uiIndexPath, 'utf-8');
  assert(
    uiIndexContent.includes("export * from './VelzonSubTabs'"),
    'src/components/admin/ui/index.ts deve exportar VelzonSubTabs e AdminSubNav'
  );

  // ====================================================
  // 2. AUDITORIA DO MÓDULO DE VAGAS (/admin/vagas/page.tsx)
  // ====================================================

  const vagasPagePath = path.resolve(process.cwd(), 'src/app/admin/vagas/page.tsx');
  assert(fs.existsSync(vagasPagePath), 'Página /admin/vagas/page.tsx deve existir');

  const vagasContent = fs.readFileSync(vagasPagePath, 'utf-8');

  assert(
    vagasContent.includes('VelzonSubTabs') && vagasContent.includes('<VelzonSubTabs'),
    '/admin/vagas/page.tsx deve importar e renderizar VelzonSubTabs'
  );

  assert(
    vagasContent.includes('vagasSubTabs') || vagasContent.includes('Tabela de Oportunidades'),
    '/admin/vagas/page.tsx deve conter a aba "Tabela de Oportunidades"'
  );

  assert(
    vagasContent.includes('Kanban Visual de Vagas'),
    '/admin/vagas/page.tsx deve conter a aba "Kanban Visual de Vagas"'
  );

  assert(
    vagasContent.includes('Expurgo Seguro & Retenção'),
    '/admin/vagas/page.tsx deve conter a aba "Expurgo Seguro & Retenção"'
  );

  assert(
    vagasContent.includes("activeTab === 'purge'"),
    '/admin/vagas/page.tsx deve ter seção condicional dedicada para activeTab === purge'
  );

  // ====================================================
  // 3. AUDITORIA DO MÓDULO DE EMPRESAS (/admin/empresas/page.tsx)
  // ====================================================

  const empresasPagePath = path.resolve(process.cwd(), 'src/app/admin/empresas/page.tsx');
  assert(fs.existsSync(empresasPagePath), 'Página /admin/empresas/page.tsx deve existir');

  const empresasContent = fs.readFileSync(empresasPagePath, 'utf-8');

  assert(
    empresasContent.includes('VelzonSubTabs') && empresasContent.includes('<VelzonSubTabs'),
    '/admin/empresas/page.tsx deve importar e renderizar VelzonSubTabs'
  );

  assert(
    empresasContent.includes('Todas as Empresas'),
    '/admin/empresas/page.tsx deve conter a aba "Todas as Empresas"'
  );

  assert(
    empresasContent.includes('Parceiras Ativas'),
    '/admin/empresas/page.tsx deve conter a aba "Parceiras Ativas"'
  );

  assert(
    empresasContent.includes('Prospecção & Livres'),
    '/admin/empresas/page.tsx deve conter a aba "Prospecção & Livres"'
  );

  // ====================================================
  // 4. AUDITORIA DO MÓDULO DE USUÁRIOS (/admin/usuarios/page.tsx)
  // ====================================================

  const usuariosPagePath = path.resolve(process.cwd(), 'src/app/admin/usuarios/page.tsx');
  assert(fs.existsSync(usuariosPagePath), 'Página /admin/usuarios/page.tsx deve existir');

  const usuariosContent = fs.readFileSync(usuariosPagePath, 'utf-8');

  assert(
    usuariosContent.includes('VelzonSubTabs') && usuariosContent.includes('<VelzonSubTabs'),
    '/admin/usuarios/page.tsx deve importar e renderizar VelzonSubTabs'
  );

  assert(
    usuariosContent.includes('Todos os Usuários'),
    '/admin/usuarios/page.tsx deve conter a aba "Todos os Usuários"'
  );

  assert(
    usuariosContent.includes('Assinantes PRO'),
    '/admin/usuarios/page.tsx deve conter a aba "Assinantes PRO"'
  );

  assert(
    usuariosContent.includes('Contas Gratuitas'),
    '/admin/usuarios/page.tsx deve conter a aba "Contas Gratuitas"'
  );

  assert(
    usuariosContent.includes('Suspensos / Bloqueados'),
    '/admin/usuarios/page.tsx deve conter a aba "Suspensos / Bloqueados"'
  );

  // ====================================================
  // 5. AUDITORIA DO MÓDULO FINANCEIRO (/admin/pagamentos/page.tsx)
  // ====================================================

  const pagamentosPagePath = path.resolve(process.cwd(), 'src/app/admin/pagamentos/page.tsx');
  assert(fs.existsSync(pagamentosPagePath), 'Página /admin/pagamentos/page.tsx deve existir');

  const pagamentosContent = fs.readFileSync(pagamentosPagePath, 'utf-8');

  assert(
    pagamentosContent.includes('VelzonSubTabs') && pagamentosContent.includes('<VelzonSubTabs'),
    '/admin/pagamentos/page.tsx deve importar e renderizar VelzonSubTabs'
  );

  assert(
    !pagamentosContent.includes('border-b border-slate-200 mb-6'),
    '/admin/pagamentos/page.tsx NÃO deve mais conter os botões HTML de abas legadas com border-slate-200'
  );

  assert(
    pagamentosContent.includes('Transações & Faturas'),
    '/admin/pagamentos/page.tsx deve conter a aba "Transações & Faturas"'
  );

  assert(
    pagamentosContent.includes('Assinaturas Recorrentes'),
    '/admin/pagamentos/page.tsx deve conter a aba "Assinaturas Recorrentes"'
  );

  assert(
    pagamentosContent.includes('Logs de Webhooks'),
    '/admin/pagamentos/page.tsx deve conter a aba "Logs de Webhooks"'
  );

  // ====================================================
  // 6. PRESERVAÇÃO DE NÃO-REGRESSÃO DA CENTRAL DE SCRAPERS
  // ====================================================

  const scrapersMainPath = path.resolve(process.cwd(), 'src/app/admin/scrapers/page.tsx');
  const scrapersTerminalPath = path.resolve(process.cwd(), 'src/app/admin/scrapers/terminal/page.tsx');
  const scrapersConfigPath = path.resolve(process.cwd(), 'src/app/admin/scrapers/config/page.tsx');

  assert(
    fs.readFileSync(scrapersMainPath, 'utf-8').includes('<VelzonSubTabs'),
    '/admin/scrapers/page.tsx deve continuar renderizando VelzonSubTabs'
  );

  assert(
    fs.readFileSync(scrapersTerminalPath, 'utf-8').includes('<VelzonSubTabs'),
    '/admin/scrapers/terminal/page.tsx deve continuar renderizando VelzonSubTabs'
  );

  assert(
    fs.readFileSync(scrapersConfigPath, 'utf-8').includes('<VelzonSubTabs'),
    '/admin/scrapers/config/page.tsx deve continuar renderizando VelzonSubTabs'
  );

  console.log(`\n🎉 TODOS OS ${passed} DE ${total} TESTES DA PHASE 95 PASSARAM COM 100% DE SUCESSO!`);
}

runPhase95Tests().catch((err) => {
  console.error('Erro fatal executando testes da Phase 95:', err);
  process.exit(1);
});
