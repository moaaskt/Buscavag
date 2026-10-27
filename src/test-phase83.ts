import fs from 'fs';
import path from 'path';

async function runPhase83Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 83 (PADRONIZAÇÃO VELZON UI & TEMA CLARO) ---');
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

  // Test 1: Verificar existência dos componentes de formulário Velzon UI
  const uiDir = path.join(rootDir, 'src/components/admin/ui');
  const requiredFiles = ['VelzonInput.tsx', 'VelzonTextarea.tsx', 'VelzonSelect.tsx', 'VelzonLabel.tsx', 'index.ts'];
  for (const file of requiredFiles) {
    assert(fs.existsSync(path.join(uiDir, file)), `Componente ${file} deve existir em src/components/admin/ui/`);
  }

  // Test 2: Verificar tokens de contraste em VelzonInput.tsx
  const inputContent = fs.readFileSync(path.join(uiDir, 'VelzonInput.tsx'), 'utf-8');
  assert(
    inputContent.includes('bg-white dark:bg-[#141824]') &&
    inputContent.includes('text-slate-800 dark:text-slate-100') &&
    inputContent.includes('border-[#e9ebec] dark:border-slate-700') &&
    inputContent.includes('placeholder-slate-400 dark:placeholder-slate-500'),
    'VelzonInput deve possuir tokens de contraste estritos para tema claro e escuro'
  );

  // Test 3: Verificar tokens de contraste em VelzonTextarea.tsx
  const textareaContent = fs.readFileSync(path.join(uiDir, 'VelzonTextarea.tsx'), 'utf-8');
  assert(
    textareaContent.includes('bg-white dark:bg-[#141824]') &&
    textareaContent.includes('text-slate-800 dark:text-slate-100') &&
    textareaContent.includes('border-[#e9ebec] dark:border-slate-700'),
    'VelzonTextarea deve possuir tokens de contraste estritos para tema claro e escuro'
  );

  // Test 4: Verificar tokens de contraste em VelzonSelect.tsx
  const selectContent = fs.readFileSync(path.join(uiDir, 'VelzonSelect.tsx'), 'utf-8');
  assert(
    selectContent.includes('bg-white dark:bg-[#141824]') &&
    selectContent.includes('text-slate-800 dark:text-slate-100') &&
    selectContent.includes('border-[#e9ebec] dark:border-slate-700'),
    'VelzonSelect deve possuir tokens de contraste estritos para tema claro e escuro'
  );

  // Test 5: Verificar indicador de obrigatoriedade no VelzonLabel.tsx
  const labelContent = fs.readFileSync(path.join(uiDir, 'VelzonLabel.tsx'), 'utf-8');
  assert(
    labelContent.includes('text-rose-500') &&
    labelContent.includes('text-slate-700 dark:text-slate-300'),
    'VelzonLabel deve possuir indicador de campo obrigatório e contraste adaptado'
  );

  // Test 6: Exportações no index.ts de admin/ui
  const indexContent = fs.readFileSync(path.join(uiDir, 'index.ts'), 'utf-8');
  assert(
    indexContent.includes("export * from './VelzonInput'") &&
    indexContent.includes("export * from './VelzonTextarea'") &&
    indexContent.includes("export * from './VelzonSelect'") &&
    indexContent.includes("export * from './VelzonLabel'"),
    'index.ts deve reexportar todos os novos componentes de formulário Velzon'
  );

  // Test 7: Alternador de Tema no AdminHeader.tsx
  const headerContent = fs.readFileSync(path.join(rootDir, 'src/components/admin/layout/AdminHeader.tsx'), 'utf-8');
  assert(
    headerContent.includes('toggleTheme') &&
    headerContent.includes('buscavag_theme') &&
    headerContent.includes('Sun') &&
    headerContent.includes('Moon'),
    'AdminHeader deve possuir botão de alternância manual Sol/Lua sincronizado com buscavag_theme'
  );

  // Test 8: Sidebar Dark Navy permanente no AdminSidebar.tsx
  const sidebarContent = fs.readFileSync(path.join(rootDir, 'src/components/admin/layout/AdminSidebar.tsx'), 'utf-8');
  assert(
    sidebarContent.includes('bg-[#1f2430]') &&
    sidebarContent.includes('bg-[#1a1e29]') &&
    sidebarContent.includes('text-slate-300'),
    'AdminSidebar deve manter o fundo Dark Navy permanente (#1f2430 / #1a1e29) clássico Velzon'
  );

  // Test 9: Refatoração em /admin/vagas
  const vagasContent = fs.readFileSync(path.join(rootDir, 'src/app/admin/vagas/page.tsx'), 'utf-8');
  assert(
    vagasContent.includes('VelzonInput') &&
    vagasContent.includes('VelzonSelect') &&
    vagasContent.includes('VelzonLabel'),
    '/admin/vagas deve importar e utilizar os componentes de formulário Velzon UI'
  );

  // Test 10: Refatoração em /admin/mensageria
  const mensageriaContent = fs.readFileSync(path.join(rootDir, 'src/app/admin/mensageria/page.tsx'), 'utf-8');
  assert(
    mensageriaContent.includes('VelzonInput') &&
    mensageriaContent.includes('VelzonTextarea') &&
    mensageriaContent.includes('VelzonLabel'),
    '/admin/mensageria deve importar e utilizar os componentes de formulário Velzon UI'
  );

  // Test 11: Refatoração em /admin/pagamentos
  const pagamentosContent = fs.readFileSync(path.join(rootDir, 'src/app/admin/pagamentos/page.tsx'), 'utf-8');
  assert(
    pagamentosContent.includes('VelzonInput') &&
    pagamentosContent.includes('VelzonTextarea') &&
    pagamentosContent.includes('VelzonSelect'),
    '/admin/pagamentos deve importar e utilizar os componentes de formulário Velzon UI'
  );

  // Test 12: Refatoração em /admin/usuarios
  const usuariosContent = fs.readFileSync(path.join(rootDir, 'src/app/admin/usuarios/page.tsx'), 'utf-8');
  assert(
    usuariosContent.includes('VelzonInput') &&
    usuariosContent.includes('VelzonSelect'),
    '/admin/usuarios deve importar e utilizar os componentes de formulário Velzon UI'
  );

  // Test 13: Refatoração em /admin/logs
  const logsContent = fs.readFileSync(path.join(rootDir, 'src/app/admin/logs/page.tsx'), 'utf-8');
  assert(
    logsContent.includes('VelzonInput') &&
    logsContent.includes('VelzonSelect'),
    '/admin/logs deve importar e utilizar os componentes de formulário Velzon UI'
  );

  console.log(`\n======================================================`);
  console.log(`RESULTADO FINAL DA SUÍTE PHASE 83: ${passed}/${total} TESTES PASSARAM!`);
  console.log(`======================================================\n`);
}

runPhase83Tests().catch((err) => {
  console.error('Erro na execução dos testes da Phase 83:', err);
  process.exit(1);
});
