import fs from 'fs';
import path from 'path';

async function runPhase84Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 84 (REMOÇÃO DE BADGES E POLUIÇÃO VISUAL) ---');
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

  // Test 1: Verificar que AdminSidebar.tsx não contém propriedades badge nem renderização de badge
  const sidebarPath = path.join(rootDir, 'src/components/admin/layout/AdminSidebar.tsx');
  assert(fs.existsSync(sidebarPath), 'AdminSidebar.tsx deve existir');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');

  assert(
    !sidebarContent.includes("badge: 'Phase") &&
    !sidebarContent.includes('badge: "Phase') &&
    !sidebarContent.includes('Phase 78') &&
    !sidebarContent.includes('Phase 79') &&
    !sidebarContent.includes('Phase 80') &&
    !sidebarContent.includes('Phase 81'),
    'AdminSidebar.tsx não deve conter rótulos de desenvolvimento Phase XX'
  );

  // Test 2: Verificar que a interface do item e a renderização JSX de badge foram removidas
  assert(
    !sidebarContent.includes('badge?: string') &&
    !sidebarContent.includes('{item.badge &&') &&
    !sidebarContent.includes('{item.badge}'),
    'AdminSidebar.tsx não deve conter lógica ou renderização de item.badge'
  );

  // Test 3: Verificar que /admin/vagas/page.tsx não contém badge Phase 78
  const vagasPagePath = path.join(rootDir, 'src/app/admin/vagas/page.tsx');
  const vagasContent = fs.readFileSync(vagasPagePath, 'utf-8');
  assert(
    !vagasContent.includes('Phase 78') &&
    !vagasContent.includes('>Phase 78<'),
    '/admin/vagas/page.tsx não deve conter badge Phase 78 no cabeçalho'
  );

  // Test 4: Verificar que /admin/logs/page.tsx não contém badge Phase 77
  const logsPagePath = path.join(rootDir, 'src/app/admin/logs/page.tsx');
  const logsContent = fs.readFileSync(logsPagePath, 'utf-8');
  assert(
    !logsContent.includes('Phase 77') &&
    !logsContent.includes('>Phase 77<'),
    '/admin/logs/page.tsx não deve conter badge Phase 77 no cabeçalho'
  );

  // Test 5: Verificar que /admin/usuarios/page.tsx não contém badge Phase 79
  const usuariosPagePath = path.join(rootDir, 'src/app/admin/usuarios/page.tsx');
  const usuariosContent = fs.readFileSync(usuariosPagePath, 'utf-8');
  assert(
    !usuariosContent.includes('Phase 79') &&
    !usuariosContent.includes('>Phase 79<'),
    '/admin/usuarios/page.tsx não deve conter badge Phase 79 no cabeçalho'
  );

  // Test 6: Verificar que /admin/pagamentos/page.tsx não contém badge Phase 80
  const pagamentosPagePath = path.join(rootDir, 'src/app/admin/pagamentos/page.tsx');
  const pagamentosContent = fs.readFileSync(pagamentosPagePath, 'utf-8');
  assert(
    !pagamentosContent.includes('Phase 80') &&
    !pagamentosContent.includes('>Phase 80<'),
    '/admin/pagamentos/page.tsx não deve conter badge Phase 80 no cabeçalho'
  );

  // Test 7: Verificar que /admin/page.tsx não contém a badge 'Velzon UI' no h1
  const adminDashboardPath = path.join(rootDir, 'src/app/admin/page.tsx');
  const dashboardContent = fs.readFileSync(adminDashboardPath, 'utf-8');
  assert(
    !dashboardContent.includes('Velzon UI'),
    '/admin/page.tsx não deve conter badge "Velzon UI" no cabeçalho'
  );

  // Test 8: Varredura de integridade em todas as páginas admin
  const adminPages = [
    'src/app/admin/page.tsx',
    'src/app/admin/vagas/page.tsx',
    'src/app/admin/logs/page.tsx',
    'src/app/admin/usuarios/page.tsx',
    'src/app/admin/pagamentos/page.tsx',
    'src/app/admin/mensageria/page.tsx',
    'src/app/admin/analytics/page.tsx'
  ];

  for (const relPage of adminPages) {
    const fullPage = path.join(rootDir, relPage);
    if (fs.existsSync(fullPage)) {
      const content = fs.readFileSync(fullPage, 'utf-8');
      const hasPhaseBadge = /Phase\s*(7[0-9]|8[0-9])/i.test(content);
      assert(!hasPhaseBadge, `${relPage} não deve conter nenhuma badge de desenvolvimento Phase XX`);
    }
  }

  console.log(`\n🎉 Todos os ${passed}/${total} testes da Phase 84 foram concluídos com SUCESSO!`);
}

runPhase84Tests().catch((err) => {
  console.error('Erro fatal ao rodar testes da Phase 84:', err);
  process.exit(1);
});
