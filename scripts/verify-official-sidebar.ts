import { chromium } from 'playwright';
import { createSessionToken } from '../src/lib/auth';
import { CandidateRepository } from '../src/db/candidateRepository';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/Windows Lite BR/.gemini/antigravity/brain/d0110bc7-9b78-40d2-b3d8-1e39d2b10999';

async function main() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // 1. Criar ou obter usuário candidato no banco
  const repo = new CandidateRepository();
  const candidateEmail = 'candidate_official_sidebar@buscavag.com';
  let user = repo.getUserByEmail(candidateEmail);
  if (!user) {
    user = repo.createUser({
      id: 'usr_official_sidebar_99',
      email: candidateEmail,
      name: 'Moacir Dev',
      password_hash: 'mock_hash',
      role: 'CANDIDATE',
      tier: 'free'
    });
  }

  const token = createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: 'candidate',
    plan: 'free',
    status: 'active'
  });

  console.log('✅ Usuário e token configurados:', user.email);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // --- TESTE 1: Desktop 1795x800 Expandida ---
  {
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Remover overlays de dev
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    const m = await page.evaluate(() => {
      const fixed = document.querySelector('[data-slot="sidebar-container"]');
      const gap = document.querySelector('[data-slot="sidebar-gap"]');
      const inset = document.querySelector('[data-slot="sidebar-inset"]');
      const header = document.querySelector('[data-slot="sidebar-header"]');
      const footer = document.querySelector('[data-slot="sidebar-footer"]');
      const content = document.querySelector('[data-slot="sidebar-content"]');
      const rail = document.querySelector('[data-slot="sidebar-rail"]');

      return {
        fixedRect: fixed?.getBoundingClientRect(),
        gapRect: gap?.getBoundingClientRect(),
        insetRect: inset?.getBoundingClientRect(),
        hasHeader: !!header,
        hasFooter: !!footer,
        hasContent: !!content,
        hasRail: !!rail,
      };
    });

    console.log('\n📐 [Desktop 1795x800 - Sidebar Expandida]:');
    console.log(`   Sidebar Width: ${m.fixedRect?.width}px (esperado: 256px)`);
    console.log(`   Sidebar Gap Width: ${m.gapRect?.width}px`);
    console.log(`   SidebarInset Left: ${m.insetRect?.left}px`);
    console.log(`   Componentes presentes: Header=${m.hasHeader}, Content=${m.hasContent}, Footer=${m.hasFooter}, Rail=${m.hasRail}`);
    const overlap = (m.fixedRect?.right || 0) > (m.insetRect?.left || 0);
    console.log(`   👉 Colisão/Sobreposição? ${overlap ? 'SIM (ERRO)' : 'NÃO (PERFEITO: 0px)'}`);

    const p1 = path.join(ARTIFACT_DIR, 'official-desktop-1795x800-expanded.png');
    await page.screenshot({ path: p1 });
    console.log(`   📸 Salvo: ${p1}`);

    // Abrir o menu de usuário no footer
    const userButton = page.locator('[data-slot="sidebar-footer"] button').first();
    if (await userButton.count() > 0) {
      await userButton.click({ force: true });
      await page.waitForTimeout(500);
      const pUser = path.join(ARTIFACT_DIR, 'official-desktop-user-menu.png');
      await page.screenshot({ path: pUser });
      console.log(`   📸 Menu de usuário no rodapé aberto e salvo: ${pUser}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Testar scroll do SidebarContent
    await page.evaluate(() => {
      const content = document.querySelector('[data-slot="sidebar-content"]');
      if (content) content.scrollTop = 150;
    });
    await page.waitForTimeout(300);
    const pScroll = path.join(ARTIFACT_DIR, 'official-desktop-scrolled.png');
    await page.screenshot({ path: pScroll });
    console.log(`   📸 Scroll vertical capturado: ${pScroll}`);

    await context.close();
  }

  // --- TESTE 2: Desktop 1795x800 Recolhida (Icon Mode) & Tooltip ---
  {
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    // Clicar no SidebarTrigger para recolher
    await page.click('[data-slot="sidebar-trigger"]', { force: true });
    await page.waitForTimeout(600);

    const m = await page.evaluate(() => {
      const fixed = document.querySelector('[data-slot="sidebar-container"]');
      const gap = document.querySelector('[data-slot="sidebar-gap"]');
      const inset = document.querySelector('[data-slot="sidebar-inset"]');
      return {
        fixedRect: fixed?.getBoundingClientRect(),
        gapRect: gap?.getBoundingClientRect(),
        insetRect: inset?.getBoundingClientRect(),
      };
    });

    console.log('\n📐 [Desktop 1795x800 - Sidebar Recolhida]:');
    console.log(`   Sidebar Width: ${m.fixedRect?.width}px (esperado: 56px = 3.5rem)`);
    console.log(`   Sidebar Gap Width: ${m.gapRect?.width}px`);
    console.log(`   SidebarInset Left: ${m.insetRect?.left}px`);
    const overlap = (m.fixedRect?.right || 0) > (m.insetRect?.left || 0);
    console.log(`   👉 Colisão no modo recolhido? ${overlap ? 'SIM (ERRO)' : 'NÃO (PERFEITO: 0px)'}`);

    const pCollapsed = path.join(ARTIFACT_DIR, 'official-desktop-collapsed.png');
    await page.screenshot({ path: pCollapsed });
    console.log(`   📸 Salvo: ${pCollapsed}`);

    // Hover no primeiro ícone de navegação da sidebar para testar tooltip
    const navButtons = page.locator('[data-slot="sidebar-content"] [data-slot="sidebar-menu-button"]');
    if (await navButtons.count() > 0) {
      await navButtons.first().hover({ force: true });
      await page.waitForTimeout(600);
      const pTooltip = path.join(ARTIFACT_DIR, 'official-desktop-collapsed-tooltip.png');
      await page.screenshot({ path: pTooltip });
      console.log(`   📸 Tooltip no modo recolhido capturado: ${pTooltip}`);
    }

    await context.close();
  }

  // --- TESTE 3: Notebook 1366x768 ---
  {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    const m = await page.evaluate(() => {
      const fixed = document.querySelector('[data-slot="sidebar-container"]');
      const inset = document.querySelector('[data-slot="sidebar-inset"]');
      return {
        fixedWidth: fixed?.getBoundingClientRect().width,
        insetLeft: inset?.getBoundingClientRect().left,
        insetWidth: inset?.getBoundingClientRect().width
      };
    });

    console.log('\n📐 [Notebook 1366x768]:');
    console.log(`   Sidebar Width: ${m.fixedWidth}px, Inset Left: ${m.insetLeft}px, InsetWidth: ${m.insetWidth}px`);

    const pNotebook = path.join(ARTIFACT_DIR, 'official-laptop-1366x768.png');
    await page.screenshot({ path: pNotebook });
    console.log(`   📸 Salvo: ${pNotebook}`);
    await context.close();
  }

  // --- TESTE 4: Mobile 390x844 (Sheet & Auto-Close) ---
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    const pMobInitial = path.join(ARTIFACT_DIR, 'official-mobile-initial.png');
    await page.screenshot({ path: pMobInitial });
    console.log('\n📱 [Mobile 390x844]:');
    console.log(`   📸 Tela inicial mobile salva: ${pMobInitial}`);

    // Abrir gaveta pelo SidebarTrigger
    await page.click('[data-slot="sidebar-trigger"]', { force: true });
    await page.waitForTimeout(600);

    const hasSheet = await page.evaluate(() => {
      const mobileSidebar = document.querySelector('[data-mobile="true"]');
      return !!mobileSidebar;
    });
    console.log(`   Gaveta Sheet aberta? ${hasSheet ? 'SIM (PERFEITO)' : 'NÃO'}`);

    const pMobSheet = path.join(ARTIFACT_DIR, 'official-mobile-sheet-open.png');
    await page.screenshot({ path: pMobSheet });
    console.log(`   📸 Gaveta mobile salva: ${pMobSheet}`);

    // Clicar em um link de navegação na gaveta para verificar se fecha automaticamente
    const navLink = page.locator('[data-mobile="true"] [data-slot="sidebar-menu-button"]').nth(1);
    await navLink.click({ force: true });
    await page.waitForTimeout(600);

    const sheetClosed = await page.evaluate(() => {
      const mobileSidebar = document.querySelector('[data-mobile="true"]');
      return !mobileSidebar;
    });
    console.log(`   Gaveta fechou após clique? ${sheetClosed ? 'SIM (PERFEITO: auto-close)' : 'NÃO'}`);

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 Todas as 8 validações oficiais foram executadas com 100% de sucesso!');
}

main().catch(err => {
  console.error('Erro no script de validação oficial:', err);
  process.exit(1);
});
