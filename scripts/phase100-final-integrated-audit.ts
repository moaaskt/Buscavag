import { chromium } from 'playwright';
import { createSessionToken } from '../src/lib/auth';
import { createAdminSessionToken } from '../src/lib/admin-auth';
import { CandidateRepository } from '../src/db/candidateRepository';
import { AdminRepository } from '../src/db/adminRepository';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('================================================================');
  console.log('🔍 PHASE 100 — AUDITORIA FINAL INTEGRADA (TECH LEAD / QA)');
  console.log('================================================================\n');

  // --- PREPARAÇÃO DE DADOS DE TESTE NO SQLITE ---
  const candidateRepo = new CandidateRepository();
  const adminRepo = new AdminRepository();

  const candidateEmail = 'candidate_integrated_audit@buscavag.com';
  let candidateUser = candidateRepo.getUserByEmail(candidateEmail);
  if (!candidateUser) {
    candidateUser = candidateRepo.createUser({
      id: 'usr_audit_candidate_01',
      email: candidateEmail,
      name: 'Auditor Candidato',
      password_hash: 'mock_hash',
      role: 'CANDIDATE',
      tier: 'free'
    });
  }

  const candidateToken = createSessionToken({
    userId: candidateUser.id,
    email: candidateUser.email,
    name: candidateUser.name,
    role: 'candidate',
    plan: 'free',
    status: 'active'
  });

  const adminUser = adminRepo.ensureSeedAdmin();
  const sessionId = crypto.randomUUID();
  const { token: adminToken, tokenHash, expiresAt } = createAdminSessionToken({
    adminId: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: 'ADMIN',
    sessionId,
  });

  adminRepo.createSession({
    id: sessionId,
    admin_user_id: adminUser.id,
    token_hash: tokenHash,
    ip_address: '127.0.0.1',
    user_agent: 'AuditAgent',
    expires_at: expiresAt,
  });

  const auditReport: Record<string, any> = {
    executedAt: new Date().toISOString(),
    sections: {}
  };

  // =========================================================================
  // SEÇÃO 1: IDENTIDADE E SEGURANÇA SERVER-SIDE (HTTP LEVEL)
  // =========================================================================
  console.log('📌 [SEÇÃO 1] Auditoria de Identidade e Segurança Server-Side');
  const secResults: Record<string, any> = {};

  // 1.1 Ausência de sessão (Anônimo)
  {
    const res = await fetch(`${BASE_URL}/api/workspace/session`);
    const data = await res.json();
    const ok = res.status === 200 && data.authenticated === false && data.identityConflict === false;
    secResults.anonymous = { status: res.status, data, pass: ok };
    console.log(`   1.1 Anônimo: Status ${res.status}, authenticated=${data.authenticated}, conflict=${data.identityConflict} -> ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  // 1.2 Sessão Candidata isolada
  {
    const res = await fetch(`${BASE_URL}/api/workspace/session`, {
      headers: { Cookie: `buscavag_session=${candidateToken}` }
    });
    const data = await res.json();
    const ok = res.status === 200 && data.authenticated === true && data.activeProfile?.role === 'CANDIDATE' && data.canAccessAdminViews === false && data.identityConflict === false;
    secResults.candidateOnly = { status: res.status, data, pass: ok };
    console.log(`   1.2 Candidato Isolado: Status ${res.status}, role=${data.activeProfile?.role}, canAccessAdminViews=${data.canAccessAdminViews} -> ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  // 1.3 Sessão Administrativa isolada
  {
    const res = await fetch(`${BASE_URL}/api/workspace/session`, {
      headers: { Cookie: `admin_session=${adminToken}` }
    });
    const data = await res.json();
    const ok = res.status === 200 && data.authenticated === true && data.activeProfile?.role === 'ADMIN' && data.canAccessAdminViews === true && data.identityConflict === false;
    secResults.adminOnly = { status: res.status, data, pass: ok };
    console.log(`   1.3 Admin Isolado: Status ${res.status}, role=${data.activeProfile?.role}, canAccessAdminViews=${data.canAccessAdminViews} -> ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  // 1.4 Conflito entre duas sessões válidas
  {
    const res = await fetch(`${BASE_URL}/api/workspace/session`, {
      headers: { Cookie: `buscavag_session=${candidateToken}; admin_session=${adminToken}` }
    });
    const data = await res.json();
    const ok = res.status === 200 && data.identityConflict === true && data.status === 'conflict' && data.canAccessAdminViews === false;
    secResults.conflictDetection = { status: res.status, data, pass: ok };
    console.log(`   1.4 Conflito Duplo: Status ${res.status}, identityConflict=${data.identityConflict}, canAccessAdminViews=${data.canAccessAdminViews} -> ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  // 1.5 Bloqueio Server-Side de APIs Administrativas contra Conflito e Sem Auth
  {
    // Scraper Run com Conflito
    const resScraperConflict = await fetch(`${BASE_URL}/api/admin/scraper/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: BASE_URL,
        Cookie: `buscavag_session=${candidateToken}; admin_session=${adminToken}`
      },
      body: JSON.stringify({ source: 'linkedin' })
    });
    const dataScraperConflict = await resScraperConflict.json();
    const passScraperConflict = resScraperConflict.status === 409 && dataScraperConflict.conflict === true;

    // Scraper Run Sem Auth
    const resScraperNoAuth = await fetch(`${BASE_URL}/api/admin/scraper/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
      body: JSON.stringify({ source: 'linkedin' })
    });
    const passScraperNoAuth = resScraperNoAuth.status === 401;

    // Purge Non-Tech com Conflito
    const resPurgeConflict = await fetch(`${BASE_URL}/api/admin/jobs/purge-non-tech`, {
      method: 'POST',
      headers: {
        Origin: BASE_URL,
        Cookie: `buscavag_session=${candidateToken}; admin_session=${adminToken}`
      }
    });
    const dataPurgeConflict = await resPurgeConflict.json();
    const passPurgeConflict = resPurgeConflict.status === 409 && dataPurgeConflict.conflict === true;

    // Purge Non-Tech Sem Auth
    const resPurgeNoAuth = await fetch(`${BASE_URL}/api/admin/jobs/purge-non-tech`, {
      method: 'POST',
      headers: { Origin: BASE_URL }
    });
    const passPurgeNoAuth = resPurgeNoAuth.status === 401;

    // Admin Usuários com Conflito (retorna 401 via getAdminSessionUser)
    const resUsersConflict = await fetch(`${BASE_URL}/api/admin/usuarios`, {
      headers: { Cookie: `buscavag_session=${candidateToken}; admin_session=${adminToken}` }
    });
    const passUsersConflict = resUsersConflict.status === 401;

    const ok = passScraperConflict && passScraperNoAuth && passPurgeConflict && passPurgeNoAuth && passUsersConflict;
    secResults.apiProtection = {
      scraperConflict: { status: resScraperConflict.status, conflict: dataScraperConflict.conflict, pass: passScraperConflict },
      scraperNoAuth: { status: resScraperNoAuth.status, pass: passScraperNoAuth },
      purgeConflict: { status: resPurgeConflict.status, conflict: dataPurgeConflict.conflict, pass: passPurgeConflict },
      purgeNoAuth: { status: resPurgeNoAuth.status, pass: passPurgeNoAuth },
      usersConflict: { status: resUsersConflict.status, pass: passUsersConflict },
      pass: ok
    };
    console.log(`   1.5 Bloqueio Server-Side APIs Admin: Scraper=${passScraperConflict}, Purge=${passPurgeConflict}, Users=${passUsersConflict} -> ${ok ? '✅ PASS' : '❌ FAIL'}`);
  }

  // 1.6 Logout do Workspace
  {
    const resLogout = await fetch(`${BASE_URL}/api/workspace/logout`, {
      method: 'POST',
      headers: {
        Origin: BASE_URL,
        Cookie: `buscavag_session=${candidateToken}; admin_session=${adminToken}`
      }
    });
    const dataLogout = await resLogout.json();
    const setCookie = resLogout.headers.get('set-cookie') || '';
    const passLogout = resLogout.status === 200 && dataLogout.status === 'complete' && setCookie.includes('buscavag_session=;') && setCookie.includes('admin_session=;');
    secResults.logout = { status: resLogout.status, data: dataLogout, setCookieHeader: setCookie, pass: passLogout };
    console.log(`   1.6 Logout Workspace: Status ${resLogout.status}, status=${dataLogout.status}, cookies expirados=${passLogout} -> ${passLogout ? '✅ PASS' : '❌ FAIL'}`);
  }

  auditReport.sections.identityAndSecurity = secResults;

  // =========================================================================
  // SEÇÃO 2: ROTAS, COMPATIBILIDADE E INTEGRAÇÕES
  // =========================================================================
  console.log('\n📌 [SEÇÃO 2] Verificação de Rotas, Compatibilidade e Integrações');
  const routesToCheck = [
    // Rotas do Workspace
    { path: '/workspace', name: 'Workspace Hub' },
    { path: '/workspace/carreira', name: 'Módulo Carreira' },
    { path: '/workspace/operacao', name: 'Módulo Operação' },
    { path: '/workspace/inteligencia', name: 'Módulo Inteligência' },
    { path: '/workspace/comunicacao', name: 'Módulo Comunicação' },
    { path: '/workspace/gestao', name: 'Módulo Gestão' },
    // Rotas Legadas / Públicas
    { path: '/', name: 'Landing Page' },
    { path: '/jobs', name: 'Vagas Públicas' },
    { path: '/login', name: 'Login Candidato' },
    { path: '/register', name: 'Registro Candidato' },
    { path: '/admin/login', name: 'Login Admin' },
    { path: '/candidate', name: 'Portal Candidato Legado' },
    { path: '/admin', name: 'Painel Admin Legado' },
  ];

  const routeResults: any[] = [];
  for (const r of routesToCheck) {
    const res = await fetch(`${BASE_URL}${r.path}`);
    const ok = res.status === 200 || res.status === 307 || res.status === 308;
    routeResults.push({ path: r.path, name: r.name, status: res.status, pass: ok });
    console.log(`   Rota ${r.path} (${r.name}): HTTP ${res.status} -> ${ok ? '✅ OK' : '❌ ERRO'}`);
  }
  auditReport.sections.routes = routeResults;

  // =========================================================================
  // SEÇÃO 3: SIDEBAR, NAVEGAÇÃO, UI E RESPONSIVIDADE (PLAYWRIGHT)
  // =========================================================================
  console.log('\n📌 [SEÇÃO 3] Testes Visuais e Funcionais no Navegador (Playwright)');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  const uiResults: Record<string, any> = {};

  // 3.1 Desktop 1795x800 — Sidebar Expandida, Atalho Ctrl+B, Tooltips, Menu de Usuário
  {
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: candidateToken, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/workspace`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Medição de Geometria Expandida
    const expandedMetrics = await page.evaluate(() => {
      const fixed = document.querySelector('[data-slot="sidebar-container"]')?.getBoundingClientRect();
      const gap = document.querySelector('[data-slot="sidebar-gap"]')?.getBoundingClientRect();
      const inset = document.querySelector('[data-slot="sidebar-inset"]')?.getBoundingClientRect();
      const sidebarWidth = fixed?.width || 0;
      const insetLeft = inset?.left || 0;
      const collision = (fixed?.right || 0) > (inset?.left || 0);
      return { sidebarWidth, gapWidth: gap?.width || 0, insetLeft, collision };
    });

    // Teste do Atalho Ctrl+B (Recolher)
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(600);

    const collapsedMetrics = await page.evaluate(() => {
      const fixed = document.querySelector('[data-slot="sidebar-container"]')?.getBoundingClientRect();
      const inset = document.querySelector('[data-slot="sidebar-inset"]')?.getBoundingClientRect();
      const collision = (fixed?.right || 0) > (inset?.left || 0);
      return { sidebarWidth: fixed?.width || 0, insetLeft: inset?.left || 0, collision };
    });

    // Teste de Tooltip no estado recolhido
    const firstItem = page.locator('[data-slot="sidebar-content"] button, [data-slot="sidebar-content"] a').first();
    await firstItem.hover();
    await page.waitForTimeout(400);

    const tooltipVisible = await page.evaluate(() => {
      const tip = document.querySelector('[data-slot="tooltip-content"]');
      return !!tip && window.getComputedStyle(tip).display !== 'none';
    });

    // Expandir de volta
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(600);

    // Teste do Menu do Usuário no Rodapé (Dropdown)
    const userBtn = page.locator('[data-slot="sidebar-footer"] button').first();
    await userBtn.click({ force: true });
    await page.waitForTimeout(400);

    const menuOpen = await page.evaluate(() => {
      const menu = document.querySelector('[data-slot="dropdown-menu-content"]');
      return !!menu && window.getComputedStyle(menu).display !== 'none';
    });
    await page.keyboard.press('Escape');

    const passExp = Math.round(expandedMetrics.sidebarWidth) === 256 && !expandedMetrics.collision;
    const passCol = Math.round(collapsedMetrics.sidebarWidth) === 56 && !collapsedMetrics.collision;
    const passUI = passExp && passCol && tooltipVisible && menuOpen && consoleErrors.length === 0;

    uiResults.desktop1795 = {
      expandedMetrics,
      collapsedMetrics,
      tooltipVisible,
      menuOpen,
      consoleErrors,
      pass: passUI
    };

    console.log(`   3.1 Desktop 1795x800:`);
    console.log(`       Expandida: ${Math.round(expandedMetrics.sidebarWidth)}px (colisão: ${expandedMetrics.collision}) -> ${passExp ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`       Recolhida: ${Math.round(collapsedMetrics.sidebarWidth)}px (colisão: ${collapsedMetrics.collision}) -> ${passCol ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`       Tooltip Base UI visível: ${tooltipVisible ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`       Dropdown de Usuário abre: ${menuOpen ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`       Erros de Console: ${consoleErrors.length === 0 ? '0 (Nenhum)' : consoleErrors.join('; ')}`);
    await context.close();
  }

  // 3.2 Laptop 1366x768 — Proporções e Layout
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.addCookies([
      { name: 'buscavag_session', value: candidateToken, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/workspace`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const m = await page.evaluate(() => {
      const fixed = document.querySelector('[data-slot="sidebar-container"]')?.getBoundingClientRect();
      const inset = document.querySelector('[data-slot="sidebar-inset"]')?.getBoundingClientRect();
      return {
        sidebarWidth: fixed?.width || 0,
        insetWidth: inset?.width || 0,
        collision: (fixed?.right || 0) > (inset?.left || 0)
      };
    });

    const passLaptop = Math.round(m.sidebarWidth) === 256 && !m.collision && m.insetWidth > 1000;
    uiResults.laptop1366 = { metrics: m, pass: passLaptop };
    console.log(`   3.2 Laptop 1366x768: Sidebar=${Math.round(m.sidebarWidth)}px, Inset=${Math.round(m.insetWidth)}px, Colisão=${m.collision} -> ${passLaptop ? '✅ PASS' : '❌ FAIL'}`);
    await context.close();
  }

  // 3.3 Mobile 390x844 — Drawer Sheet, Auto-Close ao Navegar
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([
      { name: 'buscavag_session', value: candidateToken, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/workspace`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    // Verificar que a sidebar desktop está oculta no mobile
    const desktopHidden = await page.evaluate(() => {
      const desktopSidebar = document.querySelector('[data-slot="sidebar"]');
      return !desktopSidebar || window.getComputedStyle(desktopSidebar).display === 'none';
    });

    // Abrir menu gaveta mobile
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.click({ force: true });
    await page.waitForTimeout(500);

    const sheetOpen = await page.evaluate(() => {
      const sheet = document.querySelector('[data-slot="sidebar"][data-mobile="true"]');
      return !!sheet && window.getComputedStyle(sheet).display !== 'none';
    });

    // Clicar em link de navegação dentro do menu gaveta
    const navLink = page.locator('[data-slot="sidebar"][data-mobile="true"] a[href="/workspace/carreira"]').first();
    await navLink.click({ force: true });
    await page.waitForTimeout(700);

    // Verificar se navegou e se o menu gaveta fechou automaticamente
    const currentUrl = page.url();
    const sheetClosed = await page.evaluate(() => {
      const sheet = document.querySelector('[data-slot="sidebar"][data-mobile="true"]');
      return !sheet || window.getComputedStyle(sheet).display === 'none' || sheet.getAttribute('data-state') === 'closed';
    });

    const passMobile = desktopHidden && sheetOpen && currentUrl.includes('/workspace/carreira') && sheetClosed;
    uiResults.mobile390 = {
      desktopHidden,
      sheetOpen,
      currentUrl,
      sheetClosed,
      pass: passMobile
    };
    console.log(`   3.3 Mobile 390x844: DesktopHidden=${desktopHidden}, SheetOpen=${sheetOpen}, NavToCarreira=${currentUrl.includes('/workspace/carreira')}, AutoClose=${sheetClosed} -> ${passMobile ? '✅ PASS' : '❌ FAIL'}`);
    await context.close();
  }

  // 3.4 Modal de Resolução de Conflito
  {
    // Criar uma sessão administrativa fresca para o teste de conflito no navegador
    const freshSessionId = crypto.randomUUID();
    const { token: freshAdminToken, tokenHash: freshHash, expiresAt: freshExp } = createAdminSessionToken({
      adminId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: 'ADMIN',
      sessionId: freshSessionId,
    });
    adminRepo.createSession({
      id: freshSessionId,
      admin_user_id: adminUser.id,
      token_hash: freshHash,
      ip_address: '127.0.0.1',
      user_agent: 'AuditAgentBrowser',
      expires_at: freshExp,
    });

    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: candidateToken, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
      { name: 'admin_session', value: freshAdminToken, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/workspace`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Verificar se o Banner de Conflito está visível
    const bannerVisible = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      return bodyText.includes('Conflito de Sessões Ativas');
    });

    // Clicar no botão do banner para abrir o modal de resolução
    const resolveBtn = page.locator('button:has-text("Resolver Conflito")').first();
    await resolveBtn.click({ force: true });
    await page.waitForTimeout(400);

    const dialogOpen = await page.evaluate(() => {
      const dialog = document.querySelector('[data-slot="dialog-content"], [role="dialog"]');
      return !!dialog && dialog.textContent?.includes('Resolução de Identidade Concorrente');
    });
    await page.keyboard.press('Escape');

    const passConflictUI = bannerVisible && dialogOpen;
    uiResults.conflictUI = { bannerVisible, dialogOpen, pass: passConflictUI };
    console.log(`   3.4 Conflito UI: BannerVisível=${bannerVisible}, DialogAberto=${dialogOpen} -> ${passConflictUI ? '✅ PASS' : '❌ FAIL'}`);
    await context.close();
  }

  auditReport.sections.uiAndNavigation = uiResults;

  await browser.close();

  // =========================================================================
  // SALVAR RELATÓRIO JSON INTEGRADO
  // =========================================================================
  const reportPath = 'C:/Users/Windows Lite BR/.gemini/antigravity/brain/d0110bc7-9b78-40d2-b3d8-1e39d2b10999/phase100-final-integrated-audit.json';
  import('fs').then(fs => {
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
    console.log(`\n💾 Relatório JSON da Auditoria Integrada salvo em: ${reportPath}`);
  });

  console.log('\n================================================================');
  console.log('🎉 AUDITORIA FINAL INTEGRADA CONCLUÍDA COM SUCESSO!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('❌ Erro na execução da auditoria final:', err);
  process.exit(1);
});
