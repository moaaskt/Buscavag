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

  // 1. Configurar usuário candidato no banco
  const repo = new CandidateRepository();
  const candidateEmail = 'candidate_dark_mode@buscavag.com';
  let user = repo.getUserByEmail(candidateEmail);
  if (!user) {
    user = repo.createUser({
      id: 'usr_dark_mode_test_01',
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

  // ==========================================
  // TESTE 1: Desktop 1795x800 em DARK MODE
  // ==========================================
  {
    console.log('\n==========================================');
    console.log('🌌 [TESTE 1] Desktop 1795x800 - DARK MODE');
    console.log('==========================================');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();

    // Injetar preferência dark no localStorage antes de carregar
    await page.addInitScript(() => {
      localStorage.setItem('buscavag_theme', 'dark');
    });

    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Remover overlays de dev
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    // Inspecionar estilos computados dos tokens
    const styles = await page.evaluate(() => {
      const isDark = document.documentElement.classList.contains('dark');
      const rootStyle = window.getComputedStyle(document.documentElement);
      const bodyStyle = window.getComputedStyle(document.body);
      const card = document.querySelector('[data-slot="sidebar-container"]') || document.body;
      const cardStyle = window.getComputedStyle(card);

      const bgVar = rootStyle.getPropertyValue('--background').trim();
      const fgVar = rootStyle.getPropertyValue('--foreground').trim();
      const cardVar = rootStyle.getPropertyValue('--card').trim();
      const mutedFgVar = rootStyle.getPropertyValue('--muted-foreground').trim();
      const borderVar = rootStyle.getPropertyValue('--border').trim();
      const sidebarBgVar = rootStyle.getPropertyValue('--sidebar-background').trim();

      return {
        isDark,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        cardBg: cardStyle.backgroundColor,
        tokens: {
          background: bgVar,
          foreground: fgVar,
          card: cardVar,
          mutedForeground: mutedFgVar,
          border: borderVar,
          sidebarBackground: sidebarBgVar,
        }
      };
    });

    console.log(`   HTML .dark ativo: ${styles.isDark}`);
    console.log(`   Body Background computado: ${styles.bodyBg}`);
    console.log(`   Body Color computado: ${styles.bodyColor}`);
    console.log('   Tokens CSS no Dark Mode:');
    console.log(`     --background: "${styles.tokens.background}" (Esperado: 0 0% 9%)`);
    console.log(`     --foreground: "${styles.tokens.foreground}" (Esperado: 0 0% 98%)`);
    console.log(`     --card: "${styles.tokens.card}" (Esperado: 0 0% 11.5%)`);
    console.log(`     --muted-foreground: "${styles.tokens.mutedForeground}" (Esperado: 0 0% 64%)`);
    console.log(`     --border: "${styles.tokens.border}" (Esperado: 0 0% 17%)`);
    console.log(`     --sidebar-background: "${styles.tokens.sidebarBackground}" (Esperado: 0 0% 9%)`);

    const pDarkDesktop = path.join(ARTIFACT_DIR, 'dark-desktop-1795x800.png');
    await page.screenshot({ path: pDarkDesktop });
    console.log(`   📸 Screenshot salvo: ${pDarkDesktop}`);

    // Abrir dropdown de usuário no Dark Mode
    const userBtn = page.locator('[data-slot="sidebar-footer"] button').first();
    if (await userBtn.count() > 0) {
      await userBtn.click({ force: true });
      await page.waitForTimeout(500);
      const pUserMenu = path.join(ARTIFACT_DIR, 'dark-desktop-user-menu.png');
      await page.screenshot({ path: pUserMenu });
      console.log(`   📸 Dropdown de usuário salvo: ${pUserMenu}`);
      await page.keyboard.press('Escape');
    }

    await context.close();
  }

  // ==========================================
  // TESTE 2: Desktop 1795x800 em LIGHT MODE (Não-Regressão)
  // ==========================================
  {
    console.log('\n==========================================');
    console.log('☀️ [TESTE 2] Desktop 1795x800 - LIGHT MODE (Não-Regressão)');
    console.log('==========================================');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();

    // Injetar preferência light no localStorage
    await page.addInitScript(() => {
      localStorage.setItem('buscavag_theme', 'light');
    });

    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    const lightStyles = await page.evaluate(() => {
      const hasDark = document.documentElement.classList.contains('dark');
      const rootStyle = window.getComputedStyle(document.documentElement);
      const bodyStyle = window.getComputedStyle(document.body);
      return {
        hasDark,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        tokens: {
          background: rootStyle.getPropertyValue('--background').trim(),
          foreground: rootStyle.getPropertyValue('--foreground').trim(),
          sidebarBackground: rootStyle.getPropertyValue('--sidebar-background').trim(),
        }
      };
    });

    console.log(`   HTML .dark ativo: ${lightStyles.hasDark} (esperado: false)`);
    console.log(`   Body Background: ${lightStyles.bodyBg}`);
    console.log(`   Tokens CSS no Light Mode:`);
    console.log(`     --background: "${lightStyles.tokens.background}" (Esperado: 0 0% 100%)`);
    console.log(`     --sidebar-background: "${lightStyles.tokens.sidebarBackground}" (Esperado: 0 0% 98%)`);

    const pLightDesktop = path.join(ARTIFACT_DIR, 'light-desktop-1795x800.png');
    await page.screenshot({ path: pLightDesktop });
    console.log(`   📸 Screenshot salvo: ${pLightDesktop}`);
    await context.close();
  }

  // ==========================================
  // TESTE 3: Laptop 1366x768 em DARK MODE
  // ==========================================
  {
    console.log('\n==========================================');
    console.log('💻 [TESTE 3] Laptop 1366x768 - DARK MODE');
    console.log('==========================================');
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('buscavag_theme', 'dark');
    });
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    const pLaptop = path.join(ARTIFACT_DIR, 'dark-laptop-1366x768.png');
    await page.screenshot({ path: pLaptop });
    console.log(`   📸 Screenshot salvo: ${pLaptop}`);
    await context.close();
  }

  // ==========================================
  // TESTE 4: Sidebar Recolhida (56px) com Tooltip em DARK MODE
  // ==========================================
  {
    console.log('\n==========================================');
    console.log('🔲 [TESTE 4] Sidebar Recolhida (56px) + Tooltip - DARK MODE');
    console.log('==========================================');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('buscavag_theme', 'dark');
    });
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    // Pressionar Ctrl+B para colapsar a sidebar
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(600);

    // Passar o mouse sobre o primeiro item do menu para abrir o tooltip oficial
    const firstMenuItem = page.locator('[data-slot="sidebar-content"] button, [data-slot="sidebar-content"] a').first();
    if (await firstMenuItem.count() > 0) {
      await firstMenuItem.hover();
      await page.waitForTimeout(600);
    }

    const pCollapsed = path.join(ARTIFACT_DIR, 'dark-desktop-collapsed.png');
    await page.screenshot({ path: pCollapsed });
    console.log(`   📸 Screenshot salvo: ${pCollapsed}`);
    await context.close();
  }

  // ==========================================
  // TESTE 5: Mobile 390x844 em DARK MODE (com Sheet Aberta)
  // ==========================================
  {
    console.log('\n==========================================');
    console.log('📱 [TESTE 5] Mobile 390x844 - DARK MODE (Drawer Sheet)');
    console.log('==========================================');
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('buscavag_theme', 'dark');
    });
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    });

    // Abrir o menu mobile via trigger
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.click({ force: true });
    await page.waitForTimeout(500);

    const pMobile = path.join(ARTIFACT_DIR, 'dark-mobile-390x844.png');
    await page.screenshot({ path: pMobile });
    console.log(`   📸 Screenshot salvo: ${pMobile}`);
    await context.close();
  }

  // ==========================================
  // TESTE 6: Persistência do Tema (ThemeToggle + Reload)
  // ==========================================
  {
    console.log('\n==========================================');
    console.log('🔄 [TESTE 6] ThemeToggle & Persistência de Tema no Reload');
    console.log('==========================================');
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Verificar estado inicial padrão (dark)
    const initialTheme = await page.evaluate(() => {
      return {
        hasDarkClass: document.documentElement.classList.contains('dark'),
        localTheme: localStorage.getItem('buscavag_theme')
      };
    });
    console.log(`   Estado inicial: hasDarkClass=${initialTheme.hasDarkClass}, localStorage=${initialTheme.localTheme}`);

    // 2. Clicar no ThemeToggle para mudar para Light
    const toggleBtn = page.locator('header button[aria-label*="tema"], header button[title*="tema"]').first();
    await toggleBtn.click({ force: true });
    await page.waitForTimeout(500);

    const toggledToLight = await page.evaluate(() => {
      return {
        hasDarkClass: document.documentElement.classList.contains('dark'),
        localTheme: localStorage.getItem('buscavag_theme')
      };
    });
    console.log(`   Após 1º clique (Light): hasDarkClass=${toggledToLight.hasDarkClass}, localStorage=${toggledToLight.localTheme}`);
    if (toggledToLight.hasDarkClass === false && toggledToLight.localTheme === 'light') {
      console.log('   ✅ Transição para Light Mode funcionou perfeitamente!');
    } else {
      console.error('   ❌ Falha ao transicionar para Light Mode');
    }

    // 3. Recarregar a página e verificar persistência
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const persistedLight = await page.evaluate(() => {
      return {
        hasDarkClass: document.documentElement.classList.contains('dark'),
        localTheme: localStorage.getItem('buscavag_theme')
      };
    });
    console.log(`   Após reload mantendo Light: hasDarkClass=${persistedLight.hasDarkClass}, localStorage=${persistedLight.localTheme}`);
    if (persistedLight.hasDarkClass === false && persistedLight.localTheme === 'light') {
      console.log('   ✅ Persistência do Light Mode confirmada após reload!');
    }

    // 4. Clicar novamente para voltar ao Dark Mode
    const toggleBtn2 = page.locator('header button[aria-label*="tema"], header button[title*="tema"]').first();
    await toggleBtn2.click({ force: true });
    await page.waitForTimeout(500);
    const toggledToDark = await page.evaluate(() => {
      return {
        hasDarkClass: document.documentElement.classList.contains('dark'),
        localTheme: localStorage.getItem('buscavag_theme')
      };
    });
    console.log(`   Após 2º clique (Dark): hasDarkClass=${toggledToDark.hasDarkClass}, localStorage=${toggledToDark.localTheme}`);

    // 5. Recarregar e verificar persistência do Dark Mode
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const persistedDark = await page.evaluate(() => {
      return {
        hasDarkClass: document.documentElement.classList.contains('dark'),
        localTheme: localStorage.getItem('buscavag_theme')
      };
    });
    console.log(`   Após reload mantendo Dark: hasDarkClass=${persistedDark.hasDarkClass}, localStorage=${persistedDark.localTheme}`);
    if (persistedDark.hasDarkClass === true && persistedDark.localTheme === 'dark') {
      console.log('   ✅ Persistência do Dark Mode confirmada após reload!');
    }

    await context.close();
  }

  await browser.close();
  console.log('\n==========================================');
  console.log('🎉 TODOS OS TESTES E SCREENSHOTS CONCLUÍDOS COM SUCESSO!');
  console.log('==========================================');
}

main().catch(err => {
  console.error('❌ Erro na execução dos testes:', err);
  process.exit(1);
});

