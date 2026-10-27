import fs from 'fs';
import path from 'path';
import { db, initDatabase } from './db/index';
import { AdminCompanyRepository } from './db/adminCompanyRepository';

async function runPhase85Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 85 (MÓDULO B2B & GESTÃO DE EMPRESAS) ---');
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

  // Test 1: Inicialização do banco e verificação da tabela companies
  initDatabase();
  const tableCols = (db.pragma('table_info(companies)') as Array<{ name: string }>).map((c) => c.name);
  const requiredCols = [
    'id',
    'name',
    'slug',
    'logo_url',
    'website',
    'industry',
    'description',
    'recruiter_name',
    'recruiter_email',
    'recruiter_phone',
    'plan_tier',
    'status',
    'featured_job_limit',
    'notes',
    'created_at',
    'updated_at',
  ];

  for (const col of requiredCols) {
    assert(tableCols.includes(col), `Coluna '${col}' deve existir na tabela companies`);
  }

  // Test 2: Verificação de índices da tabela companies
  const indexes = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'companies'").all() as Array<{ name: string }>).map(i => i.name);
  assert(indexes.includes('idx_companies_name'), 'Índice idx_companies_name deve existir');
  assert(indexes.includes('idx_companies_slug'), 'Índice idx_companies_slug deve existir');
  assert(indexes.includes('idx_companies_status'), 'Índice idx_companies_status deve existir');
  assert(indexes.includes('idx_companies_plan_tier'), 'Índice idx_companies_plan_tier deve existir');

  const repo = new AdminCompanyRepository();

  // Test 3: Criação de Empresa no Repositório com Slug Automático
  const testCompanyName = `Tech Solutions Test ${Date.now()}`;
  const createdCompany = repo.createCompany({
    name: testCompanyName,
    website: 'https://techsolutions.test',
    industry: 'Fintech & Cloud',
    recruiter_name: 'Ana Recrutadora',
    recruiter_email: 'ana@techsolutions.test',
    recruiter_phone: '11999998888',
    plan_tier: 'startup',
    status: 'active',
    featured_job_limit: 3,
    notes: 'Cliente em fase de onboarding comercial',
  });

  assert(!!createdCompany && !!createdCompany.id, 'createCompany deve retornar objeto de empresa com id');
  assert(createdCompany.name === testCompanyName, 'Nome da empresa deve coincidir');
  assert(createdCompany.plan_tier === 'startup', 'Plano da empresa deve ser startup');
  assert(createdCompany.status === 'active', 'Status da empresa deve ser active');
  assert(createdCompany.slug.includes('tech-solutions-test'), 'Slug gerado deve ser normalizado');

  // Test 4: Vinculação Dinâmica com Vagas e getAdminCompanies
  const testJobId = `job_test_p85_${Date.now()}`;
  db.prepare(`
    INSERT INTO jobs (id, url, title, company, platform, description, published_at, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'active')
  `).run(
    testJobId,
    `https://vagas.test/p85/${Date.now()}`,
    'Engenheiro de Software Sênior',
    testCompanyName,
    'LinkedIn',
    'Descrição da vaga de teste B2B'
  );

  const listResult = repo.getAdminCompanies({
    search: testCompanyName,
    page: 1,
    limit: 10,
  });

  assert(listResult.total >= 1, 'getAdminCompanies deve encontrar a empresa recém-criada');
  const foundCompany = listResult.companies.find((c) => c.id === createdCompany.id);
  assert(!!foundCompany, 'Empresa criada deve constar no array companies');
  assert((foundCompany?.active_jobs_count || 0) >= 1, 'Contagem de vagas ativas deve ser calculada e >= 1');

  // Test 5: getCompanyDetail com vagas vinculadas
  const detail = repo.getCompanyDetail(createdCompany.id);
  assert(!!detail, 'getCompanyDetail deve retornar detalhes');
  assert(detail!.company.id === createdCompany.id, 'ID retornado no detalhe deve conferir');
  assert(detail!.totalJobs >= 1, 'totalJobs no detalhe deve ser >= 1');
  assert(detail!.jobs.some((j) => j.id === testJobId), 'A vaga criada deve estar presente na lista de vagas da empresa');

  // Test 6: updateCompany
  const updated = repo.updateCompany(createdCompany.id, {
    plan_tier: 'enterprise',
    status: 'prospect',
    notes: 'Convertido para negociação Enterprise com vagas ilimitadas',
  });

  assert(updated?.plan_tier === 'enterprise', 'updateCompany deve alterar plan_tier para enterprise');
  assert(updated?.status === 'prospect', 'updateCompany deve alterar status para prospect');
  assert(!!updated?.notes?.includes('Enterprise'), 'updateCompany deve atualizar notas internas');

  // Test 7: getAdminCompanyStats
  const stats = repo.getAdminCompanyStats();
  assert(stats.totalCompanies >= 1, 'totalCompanies deve ser maior ou igual a 1');
  assert(stats.totalMappedJobs >= 1, 'totalMappedJobs deve computar as vagas de empresas cadastradas');
  assert(typeof stats.activePartners === 'number', 'activePartners deve ser numérico');
  assert(typeof stats.prospectCompanies === 'number', 'prospectCompanies deve ser numérico');

  // Test 8: syncCompaniesFromJobs Idempotente
  const uniqueGhostCompany = `Ghost Inovacao Test ${Date.now()}`;
  db.prepare(`
    INSERT INTO jobs (id, url, title, company, platform, description, published_at, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'active')
  `).run(
    `job_ghost_${Date.now()}`,
    `https://vagas.test/ghost/${Date.now()}`,
    'Tech Lead Node.js',
    uniqueGhostCompany,
    'Gupy',
    'Vaga para teste de sincronização automática'
  );

  const firstSync = repo.syncCompaniesFromJobs();
  assert(firstSync.syncedCount >= 1, 'syncCompaniesFromJobs deve sincronizar pelo menos 1 nova empresa');

  const secondSync = repo.syncCompaniesFromJobs();
  assert(secondSync.syncedCount === 0, 'Segunda chamada de syncCompaniesFromJobs deve ser idempotente (0 novas)');

  // Test 9: deleteCompany
  const tempCompany = repo.createCompany({ name: `Temp Delete ${Date.now()}` });
  const deleted = repo.deleteCompany(tempCompany.id);
  assert(deleted === true, 'deleteCompany deve retornar true para remoção com sucesso');
  assert(repo.getCompanyById(tempCompany.id) === null, 'Empresa removida não deve mais existir no banco');

  // Test 10: Verificação de navegação na AdminSidebar
  const sidebarPath = path.join(rootDir, 'src/components/admin/layout/AdminSidebar.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
  assert(
    sidebarContent.includes("href: '/admin/empresas'") &&
    sidebarContent.includes("name: 'Empresas B2B'") &&
    sidebarContent.includes('Building2'),
    'AdminSidebar.tsx deve conter link para /admin/empresas com ícone Building2'
  );

  // Test 11: Verificação da Rota de API /api/admin/empresas
  const apiRoutePath = path.join(rootDir, 'src/app/api/admin/empresas/route.ts');
  assert(fs.existsSync(apiRoutePath), 'src/app/api/admin/empresas/route.ts deve existir');
  const apiContent = fs.readFileSync(apiRoutePath, 'utf-8');
  assert(apiContent.includes('getAdminSessionUser'), 'API de empresas deve exigir sessão administrativa');
  assert(apiContent.includes('logAdminAction'), 'API de empresas deve registrar auditoria operacional');

  // Test 12: Verificação da Rota de API /api/admin/empresas/[id]
  const apiIdRoutePath = path.join(rootDir, 'src/app/api/admin/empresas/[id]/route.ts');
  assert(fs.existsSync(apiIdRoutePath), 'src/app/api/admin/empresas/[id]/route.ts deve existir');
  const apiIdContent = fs.readFileSync(apiIdRoutePath, 'utf-8');
  assert(apiIdContent.includes('getAdminSessionUser'), 'API [id] de empresas deve exigir sessão administrativa');

  // Test 13: Verificação de componentes Velzon UI na página /admin/empresas
  const pagePath = path.join(rootDir, 'src/app/admin/empresas/page.tsx');
  assert(fs.existsSync(pagePath), 'src/app/admin/empresas/page.tsx deve existir');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');
  assert(pageContent.includes('AdminLayout'), 'Página deve utilizar AdminLayout');
  assert(pageContent.includes('VelzonStatWidget'), 'Página deve renderizar VelzonStatWidget');
  assert(pageContent.includes('VelzonInput'), 'Página deve utilizar VelzonInput');
  assert(pageContent.includes('VelzonSelect'), 'Página deve utilizar VelzonSelect');
  assert(pageContent.includes('VelzonModal'), 'Página deve utilizar VelzonModal');

  console.log(`\n🎉 Todos os ${passed}/${total} testes da Phase 85 foram concluídos com SUCESSO!`);
}

runPhase85Tests().catch((err) => {
  console.error('Erro fatal ao rodar testes da Phase 85:', err);
  process.exit(1);
});
