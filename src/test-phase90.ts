import fs from 'fs';
import path from 'path';
import { db, initDatabase } from './db/index';
import { JobRepository } from './db/repository';
import { AdminUserRepository } from './db/adminUserRepository';
import { AdminCompanyRepository } from './db/adminCompanyRepository';
import { AdminPaymentRepository } from './db/adminPaymentRepository';
import { AdminScraperRepository } from './db/adminScraperRepository';

async function runPhase90Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 90 (REESTRUTURAÇÃO DA DASHBOARD ADMIN COM FOCO EM NEGÓCIO) ---');
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

  // Test 1: Existência física do endpoint agregador de métricas
  const metricsRoutePath = path.join(rootDir, 'src/app/api/admin/dashboard/metrics/route.ts');
  assert(fs.existsSync(metricsRoutePath), 'src/app/api/admin/dashboard/metrics/route.ts deve existir');

  // Test 2: Verificação de segurança e autenticação no endpoint
  const metricsRouteContent = fs.readFileSync(metricsRoutePath, 'utf-8');
  assert(
    metricsRouteContent.includes('getAdminSessionUser') &&
    metricsRouteContent.includes('status: 401') &&
    metricsRouteContent.includes('no-store'),
    'Endpoint /api/admin/dashboard/metrics deve exigir sessão de administrador (401) e desabilitar cache'
  );

  // Test 3: Verificação das integrações de repositórios no endpoint
  assert(
    metricsRouteContent.includes('JobRepository') &&
    metricsRouteContent.includes('AdminUserRepository') &&
    metricsRouteContent.includes('AdminCompanyRepository') &&
    metricsRouteContent.includes('AdminPaymentRepository') &&
    metricsRouteContent.includes('AdminScraperRepository'),
    'Endpoint de métricas deve consolidar dados de jobs, usuários, empresas, pagamentos e scrapers'
  );

  // Test 4: Existência física da rota /admin/dashboard
  const dashboardRedirectPath = path.join(rootDir, 'src/app/admin/dashboard/page.tsx');
  assert(fs.existsSync(dashboardRedirectPath), 'src/app/admin/dashboard/page.tsx deve existir');

  // Test 5: Verificação do redirecionamento seguro para /admin
  const dashboardRedirectContent = fs.readFileSync(dashboardRedirectPath, 'utf-8');
  assert(
    dashboardRedirectContent.includes("redirect('/admin')") ||
    dashboardRedirectContent.includes('redirect("/admin")'),
    'Rota /admin/dashboard deve redirecionar nativamente para /admin via Next.js redirect'
  );

  // Test 6: Existência física da página /admin/page.tsx
  const adminPagePath = path.join(rootDir, 'src/app/admin/page.tsx');
  assert(fs.existsSync(adminPagePath), 'src/app/admin/page.tsx deve existir');
  const adminPageContent = fs.readFileSync(adminPagePath, 'utf-8');

  // Test 7: Remoção de controles manuais de scraping na Home
  assert(
    !adminPageContent.includes('handleSync') &&
    !adminPageContent.includes('Iniciar Varredura') &&
    !adminPageContent.includes('isSyncing'),
    'src/app/admin/page.tsx NÃO deve conter botões ou funções de disparo manual de scraping'
  );

  // Test 8: Remoção de expurgo manual e alert na Home
  assert(
    !adminPageContent.includes('handlePurge') &&
    !adminPageContent.includes('Executar Hard Delete') &&
    !adminPageContent.includes('window.confirm'),
    'src/app/admin/page.tsx NÃO deve conter botões ou funções de expurgo manual com window.confirm'
  );

  // Test 9: Remoção do ScraperTerminalModal na Home
  assert(
    !adminPageContent.includes('ScraperTerminalModal') &&
    !adminPageContent.includes('isTerminalOpen'),
    'src/app/admin/page.tsx NÃO deve renderizar ScraperTerminalModal'
  );

  // Test 10: Presença dos 5 Top Widgets Executivos
  assert(
    adminPageContent.includes('Vagas no Pipeline') &&
    adminPageContent.includes('Base de Talentos') &&
    adminPageContent.includes('Empresas Mapeadas') &&
    adminPageContent.includes('Taxa de Fit IA') &&
    adminPageContent.includes('Receita / MRR'),
    'src/app/admin/page.tsx deve renderizar os 5 widgets executivos de topo do SaaS'
  );

  // Test 11: Presença do Card de Infraestrutura com Link para Central de Scrapers
  assert(
    adminPageContent.includes('Status da Coleta & Infraestrutura') &&
    adminPageContent.includes('/admin/scrapers') &&
    adminPageContent.includes('Central de Scrapers'),
    'src/app/admin/page.tsx deve conter Card Executivo de Infraestrutura com link/CTA para /admin/scrapers'
  );

  // Test 12: Presença do Pipeline do Kanban e Top Empresas
  assert(
    adminPageContent.includes('Pipeline & Funil do Kanban de Vagas') &&
    adminPageContent.includes('Top Empresas Contratantes') &&
    adminPageContent.includes('PlatformDistribution'),
    'src/app/admin/page.tsx deve conter Pipeline do Kanban, Top Empresas e Distribuição de Plataformas'
  );

  // Test 13: Validação da agregação em tempo real dos repositórios
  const jobRepo = new JobRepository();
  const jobStats = jobRepo.getStats();
  assert(typeof jobStats.totalJobs === 'number', 'JobRepository deve retornar contagem de totalJobs');
  assert(typeof jobStats.approvedJobs === 'number', 'JobRepository deve retornar contagem de approvedJobs');
  assert(typeof jobStats.statusCounts === 'object', 'JobRepository deve retornar statusCounts do Kanban');

  const userRepo = new AdminUserRepository();
  const userStats = userRepo.getAdminUserStats();
  assert(typeof userStats.totalUsers === 'number', 'AdminUserRepository deve retornar totalUsers');

  const companyRepo = new AdminCompanyRepository();
  const companyStats = companyRepo.getAdminCompanyStats();
  assert(typeof companyStats.totalCompanies === 'number', 'AdminCompanyRepository deve retornar totalCompanies');

  const paymentRepo = new AdminPaymentRepository();
  const paymentStats = paymentRepo.getPaymentStats();
  assert(typeof paymentStats.mrr === 'number', 'AdminPaymentRepository deve retornar métrica de mrr');

  const scraperRepo = new AdminScraperRepository();
  const scraperMetrics = scraperRepo.getMonitoringMetrics();
  assert(typeof scraperMetrics.summary.total === 'number', 'AdminScraperRepository deve retornar resumo da infraestrutura');

  console.log('\n======================================================');
  console.log('  RESULTADO DA SUÍTE DA PHASE 90:');
  console.log(`  Total de testes executados: ${total}`);
  console.log(`  Testes aprovados: ${passed}`);
  console.log(`  Testes reprovados: ${total - passed}`);
  console.log('  Status: 100% CONCLUÍDO E APROVADO ✓');
  console.log('======================================================\n');
}

runPhase90Tests().catch((err) => {
  console.error('Erro fatal na execução da suíte da Phase 90:', err);
  process.exit(1);
});
