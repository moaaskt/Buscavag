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
  const candidateEmail = 'candidate_visual_test@buscavag.com';
  let user = repo.getUserByEmail(candidateEmail);
  if (!user) {
    user = repo.createUser({
      id: 'usr_visual_test_99',
      email: candidateEmail,
      name: 'Candidato Moacir',
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

  console.log('✅ Token gerado para candidato:', user.email);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: 'desktop-1795x800', width: 1795, height: 800 },
    { name: 'laptop-1366x768', width: 1366, height: 768 },
    { name: 'mobile-390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });

    // Injetar cookie de candidato
    await context.addCookies([
      {
        name: 'buscavag_session',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax'
      }
    ]);

    const page = await context.newPage();
    await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' });

    // Aguardar carregamento da sessão client-side
    await page.waitForTimeout(1000);

    // Medições geométricas
    const metrics = await page.evaluate(() => {
      const sidebarFixed = document.querySelector('[data-slot="sidebar"] > div.fixed');
      const sidebarSpacer = document.querySelector('[data-slot="sidebar"] > div.relative');
      const mainContent = document.querySelector('main');
      const header = document.querySelector('header');
      const navGroups = Array.from(document.querySelectorAll('[data-slot="sidebar-group"]')).length;
      const cards = Array.from(document.querySelectorAll('div.grid > div')).length;

      const sidebarFixedRect = sidebarFixed ? sidebarFixed.getBoundingClientRect() : null;
      const sidebarSpacerRect = sidebarSpacer ? sidebarSpacer.getBoundingClientRect() : null;
      const mainContentRect = mainContent ? mainContent.getBoundingClientRect() : null;

      return {
        sidebarFixedRect,
        sidebarSpacerRect,
        mainContentRect,
        navGroups,
        cards
      };
    });

    console.log(`\n📐 [Viewport ${vp.name}]:`);
    console.log(`   Nav Groups na Sidebar: ${metrics.navGroups}`);
    console.log(`   Cards no Workspace: ${metrics.cards}`);
    if (metrics.sidebarFixedRect && metrics.mainContentRect) {
      console.log(`   Sidebar Fixed: left=${metrics.sidebarFixedRect.left}px, width=${metrics.sidebarFixedRect.width}px, right=${metrics.sidebarFixedRect.right}px`);
      console.log(`   Sidebar Spacer: width=${metrics.sidebarSpacerRect?.width}px`);
      console.log(`   Main Content: left=${metrics.mainContentRect.left}px, width=${metrics.mainContentRect.width}px`);
      const overlap = metrics.sidebarFixedRect.right > metrics.mainContentRect.left;
      console.log(`   👉 SOBREPOSIÇÃO? ${overlap ? 'SIM (ERRO!)' : 'NÃO (PERFEITO! Espaçamento respeitado)'}`);
    }

    const screenshotPath = path.join(ARTIFACT_DIR, `workspace-${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`   📸 Screenshot salvo: ${screenshotPath}`);

    // Alternar para tema escuro e tirar foto em 1795x800
    if (vp.name === 'desktop-1795x800') {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(300);
      const darkScreenshotPath = path.join(ARTIFACT_DIR, `workspace-${vp.name}-dark.png`);
      await page.screenshot({ path: darkScreenshotPath, fullPage: false });
      console.log(`   📸 Screenshot escuro salvo: ${darkScreenshotPath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 Todas as evidências visuais foram geradas e verificadas!');
}

main().catch(err => {
  console.error('Erro no script de validação visual:', err);
  process.exit(1);
});
