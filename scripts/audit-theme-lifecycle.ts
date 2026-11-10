import { chromium } from 'playwright';
import { createSessionToken } from '../src/lib/auth';
import { CandidateRepository } from '../src/db/candidateRepository';

async function runAudit() {
  console.log('🔍 INICIANDO AUDITORIA TÉCNICA READ-ONLY — CICLO DE VIDA DO TEMA BUSCAVAG\n');

  const repo = new CandidateRepository();
  let user = repo.getUserByEmail('candidate_dark_mode@buscavag.com');
  if (!user) {
    user = repo.createUser({
      id: 'usr_dark_mode_test_01',
      email: 'candidate_dark_mode@buscavag.com',
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

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results: Record<string, any> = {};

  // =========================================================================
  // CENÁRIO 1: Preferência 'light' salva antes de abrir a página (Investigação de FOUC / Flash Escuro)
  // =========================================================================
  {
    console.log('📌 [CENÁRIO 1] Teste de Preferência LIGHT salva previamente (Risco de Flash Escuro)');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);

    const page = await context.newPage();
    const consoleLogs: string[] = [];
    const hydrationWarnings: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (text.toLowerCase().includes('hydration') || text.toLowerCase().includes('mismatch') || text.toLowerCase().includes('did not match')) {
        hydrationWarnings.push(text);
      }
    });

    // Injeta localStorage no document_start ANTES de carregar qualquer script do Next.js
    await page.addInitScript(() => {
      localStorage.setItem('buscavag_theme', 'light');
    });

    // Capturar o estado em estágios estritos:
    // 1. Quando o DOM inicial estiver carregado (antes de scripts de hidratação terminarem)
    let domContentLoadedState: any = null;
    page.on('domcontentloaded', async () => {
      try {
        domContentLoadedState = await page.evaluate(() => {
          return {
            htmlClass: document.documentElement.className,
            hasDarkClass: document.documentElement.classList.contains('dark'),
            bodyBg: window.getComputedStyle(document.body).backgroundColor,
            bodyColor: window.getComputedStyle(document.body).color,
            storedTheme: localStorage.getItem('buscavag_theme')
          };
        });
      } catch (e) {}
    });

    await page.goto('http://localhost:3000/workspace', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(50); // momento imediatamente pré/durante hidratação

    const earlyState = await page.evaluate(() => {
      return {
        htmlClass: document.documentElement.className,
        hasDarkClass: document.documentElement.classList.contains('dark'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        bodyColor: window.getComputedStyle(document.body).color,
      };
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const postHydrationState = await page.evaluate(() => {
      const toggle = document.querySelector('header button[aria-label*="tema"], header button[title*="tema"]');
      return {
        htmlClass: document.documentElement.className,
        hasDarkClass: document.documentElement.classList.contains('dark'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        bodyColor: window.getComputedStyle(document.body).color,
        toggleAriaLabel: toggle?.getAttribute('aria-label'),
        toggleTitle: toggle?.getAttribute('title'),
        toggleIconIsSun: !!toggle?.querySelector('svg.lucide-sun'),
        toggleIconIsMoon: !!toggle?.querySelector('svg.lucide-moon-star'),
      };
    });

    results.scenario1 = {
      domContentLoadedState,
      earlyState,
      postHydrationState,
      hydrationWarnings,
    };

    console.log(`   DOMContentLoaded -> hasDarkClass: ${domContentLoadedState?.hasDarkClass}, bodyBg: ${domContentLoadedState?.bodyBg}`);
    console.log(`   Early (Pré-Hidratação) -> hasDarkClass: ${earlyState.hasDarkClass}, bodyBg: ${earlyState.bodyBg}`);
    console.log(`   Pós-Hidratação -> hasDarkClass: ${postHydrationState.hasDarkClass}, bodyBg: ${postHydrationState.bodyBg}`);
    console.log(`   Ícone do Toggle: Sol=${postHydrationState.toggleIconIsSun}, Lua=${postHydrationState.toggleIconIsMoon} (Esperado para Light: Lua para alternar para Dark)`);
    console.log(`   Avisos de Hidratação: ${hydrationWarnings.length === 0 ? 'NENHUM (Zero mismatch)' : hydrationWarnings.join('; ')}`);
    console.log('');
    await context.close();
  }

  // =========================================================================
  // CENÁRIO 2: Preferência 'dark' salva antes de abrir a página
  // =========================================================================
  {
    console.log('📌 [CENÁRIO 2] Teste de Preferência DARK salva previamente');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();
    const hydrationWarnings: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.toLowerCase().includes('hydration') || text.toLowerCase().includes('mismatch')) {
        hydrationWarnings.push(text);
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('buscavag_theme', 'dark');
    });

    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const darkState = await page.evaluate(() => {
      const toggle = document.querySelector('header button[aria-label*="tema"], header button[title*="tema"]');
      return {
        htmlClass: document.documentElement.className,
        hasDarkClass: document.documentElement.classList.contains('dark'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        bodyColor: window.getComputedStyle(document.body).color,
        cardBg: window.getComputedStyle(document.querySelector('.rounded-xl.border') || document.body).backgroundColor,
        toggleIconIsSun: !!toggle?.querySelector('svg.lucide-sun'),
        toggleIconIsMoon: !!toggle?.querySelector('svg.lucide-moon-star'),
      };
    });

    results.scenario2 = { darkState, hydrationWarnings };
    console.log(`   hasDarkClass: ${darkState.hasDarkClass}, bodyBg: ${darkState.bodyBg}, cardBg: ${darkState.cardBg}`);
    console.log(`   Ícone do Toggle: Sol=${darkState.toggleIconIsSun}, Lua=${darkState.toggleIconIsMoon} (Esperado para Dark: Sol para alternar para Light)`);
    console.log(`   Avisos de Hidratação: ${hydrationWarnings.length === 0 ? 'NENHUM' : hydrationWarnings.join('; ')}`);
    console.log('');
    await context.close();
  }

  // =========================================================================
  // CENÁRIO 3: Primeira Visita (Sem preferência salva no localStorage)
  // =========================================================================
  {
    console.log('📌 [CENÁRIO 3] Primeira Visita (localStorage vazio / null)');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();

    // Garante que o localStorage esteja vazio
    await page.addInitScript(() => {
      localStorage.removeItem('buscavag_theme');
    });

    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const defaultState = await page.evaluate(() => {
      const toggle = document.querySelector('header button[aria-label*="tema"], header button[title*="tema"]');
      return {
        hasDarkClass: document.documentElement.classList.contains('dark'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        storedTheme: localStorage.getItem('buscavag_theme'),
        toggleIconIsSun: !!toggle?.querySelector('svg.lucide-sun'),
      };
    });

    results.scenario3 = defaultState;
    console.log(`   Tema padrão adotado: hasDarkClass=${defaultState.hasDarkClass} (bodyBg: ${defaultState.bodyBg})`);
    console.log(`   Valor no localStorage após visita: ${defaultState.storedTheme}`);
    console.log(`   Toggle em estado Dark (mostra Sol para ir pro Claro): ${defaultState.toggleIconIsSun}`);
    console.log('');
    await context.close();
  }

  // =========================================================================
  // CENÁRIO 4: Reload nos dois temas
  // =========================================================================
  {
    console.log('📌 [CENÁRIO 4] Reload em ambos os temas');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();

    // 4A: Alterna para Light e Recarrega
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    const toggleBtn = page.locator('header button[aria-label*="tema"], header button[title*="tema"]').first();
    await toggleBtn.click({ force: true }); // Muda para Light
    await page.waitForTimeout(300);

    const stateBeforeReloadLight = await page.evaluate(() => ({
      hasDarkClass: document.documentElement.classList.contains('dark'),
      storedTheme: localStorage.getItem('buscavag_theme')
    }));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const stateAfterReloadLight = await page.evaluate(() => ({
      hasDarkClass: document.documentElement.classList.contains('dark'),
      storedTheme: localStorage.getItem('buscavag_theme'),
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
    }));

    // 4B: Alterna de volta para Dark e Recarrega
    const toggleBtnDark = page.locator('header button[aria-label*="tema"], header button[title*="tema"]').first();
    await toggleBtnDark.click({ force: true }); // Volta para Dark
    await page.waitForTimeout(300);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const stateAfterReloadDark = await page.evaluate(() => ({
      hasDarkClass: document.documentElement.classList.contains('dark'),
      storedTheme: localStorage.getItem('buscavag_theme'),
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
    }));

    results.scenario4 = {
      light: { before: stateBeforeReloadLight, after: stateAfterReloadLight },
      dark: { after: stateAfterReloadDark }
    };

    console.log(`   Light antes reload: hasDark=${stateBeforeReloadLight.hasDarkClass}, store=${stateBeforeReloadLight.storedTheme}`);
    console.log(`   Light após reload:  hasDark=${stateAfterReloadLight.hasDarkClass}, store=${stateAfterReloadLight.storedTheme}, bodyBg=${stateAfterReloadLight.bodyBg}`);
    console.log(`   Dark após reload:   hasDark=${stateAfterReloadDark.hasDarkClass}, store=${stateAfterReloadDark.storedTheme}, bodyBg=${stateAfterReloadDark.bodyBg}`);
    console.log('');
    await context.close();
  }

  // =========================================================================
  // CENÁRIO 5: Navegação entre Rotas (Client-side Transitions)
  // =========================================================================
  {
    console.log('📌 [CENÁRIO 5] Navegação entre Rotas no Cliente (SPA)');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);
    const page = await context.newPage();

    // Iniciar em Light Mode
    await page.addInitScript(() => {
      localStorage.setItem('buscavag_theme', 'light');
    });

    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });

    const navItems = [
      { name: 'Workspace Hub', href: '/workspace' },
      { name: 'Minha Carreira', href: '/workspace/carreira' },
      { name: 'Operação', href: '/workspace/operacao' },
      { name: 'Inteligência', href: '/workspace/inteligencia' },
    ];

    const navResults: any[] = [];

    for (const item of navItems) {
      await page.goto(`http://localhost:3000${item.href}`, { waitUntil: 'networkidle' });
      const current = await page.evaluate(() => ({
        hasDarkClass: document.documentElement.classList.contains('dark'),
        bodyBg: window.getComputedStyle(document.body).backgroundColor,
        storedTheme: localStorage.getItem('buscavag_theme'),
      }));
      navResults.push({ route: item.href, ...current });
      console.log(`   Rota ${item.href} -> hasDarkClass: ${current.hasDarkClass}, storedTheme: ${current.storedTheme}, bodyBg: ${current.bodyBg}`);
    }

    results.scenario5 = navResults;
    console.log('');
    await context.close();
  }

  // =========================================================================
  // CENÁRIO 6: Abertura de Nova Aba / Multi-Tab
  // =========================================================================
  {
    console.log('📌 [CENÁRIO 6] Sincronização entre Abas (Multi-Tab)');
    const context = await browser.newContext({ viewport: { width: 1795, height: 800 } });
    await context.addCookies([
      { name: 'buscavag_session', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
    ]);

    // Aba 1
    const page1 = await context.newPage();
    await page1.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });

    // Alternar para light na Aba 1
    const toggleBtn1 = page1.locator('header button[aria-label*="tema"], header button[title*="tema"]').first();
    await toggleBtn1.click({ force: true });
    await page1.waitForTimeout(300);

    const page1State = await page1.evaluate(() => ({
      hasDarkClass: document.documentElement.classList.contains('dark'),
      storedTheme: localStorage.getItem('buscavag_theme')
    }));

    // Abrir Aba 2 e navegar para /workspace
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });
    const page2State = await page2.evaluate(() => ({
      hasDarkClass: document.documentElement.classList.contains('dark'),
      storedTheme: localStorage.getItem('buscavag_theme'),
      bodyBg: window.getComputedStyle(document.body).backgroundColor
    }));

    results.scenario6 = { page1: page1State, page2: page2State };
    console.log(`   Aba 1 (após clique): hasDarkClass=${page1State.hasDarkClass}, stored=${page1State.storedTheme}`);
    console.log(`   Aba 2 (aberta após):  hasDarkClass=${page2State.hasDarkClass}, stored=${page2State.storedTheme}, bodyBg=${page2State.bodyBg}`);
    console.log('');
    await context.close();
  }

  // =========================================================================
  // CENÁRIO 7: Inspeção do HTML Bruto do Servidor (SSR)
  // =========================================================================
  {
    console.log('📌 [CENÁRIO 7] Inspeção do HTML Bruto retornado pelo Servidor (SSR)');
    const res = await fetch('http://localhost:3000/workspace');
    const htmlText = await res.text();

    const htmlTagMatch = htmlText.match(/<html[^>]*>/i);
    const htmlTag = htmlTagMatch ? htmlTagMatch[0] : 'NÃO ENCONTRADA';

    const scriptMatch = htmlText.match(/<script[^>]*>[\s\S]*?buscavag_theme[\s\S]*?<\/script>/i);
    const inlineScript = scriptMatch ? scriptMatch[0] : 'NÃO ENCONTRADO';

    const bodyTagMatch = htmlText.match(/<body[^>]*>/i);
    const bodyTag = bodyTagMatch ? bodyTagMatch[0] : 'NÃO ENCONTRADA';

    results.scenario7 = {
      htmlTag,
      inlineScript,
      bodyTag
    };

    console.log(`   Tag <html> retornada no SSR:\n     ${htmlTag}`);
    console.log(`   Script inline em <head>:\n     ${inlineScript.replace(/\s+/g, ' ').substring(0, 200)}...`);
    console.log(`   Tag <body> retornada no SSR:\n     ${bodyTag}`);
    console.log('');
  }

  await browser.close();
  console.log('✅ AUDITORIA CONCLUÍDA COM SUCESSO!\n');
  return results;
}

runAudit()
  .then(res => {
    // Salvar JSON com os resultados detalhados para análise
    const outPath = 'C:/Users/Windows Lite BR/.gemini/antigravity/brain/d0110bc7-9b78-40d2-b3d8-1e39d2b10999/theme-audit-results.json';
    import('fs').then(fs => {
      fs.writeFileSync(outPath, JSON.stringify(res, null, 2));
      console.log('Resultados exportados em:', outPath);
    });
  })
  .catch(err => {
    console.error('❌ Erro na auditoria:', err);
    process.exit(1);
  });

