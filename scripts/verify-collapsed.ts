import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1795, height: 800 } });
  await page.goto('http://localhost:3000/workspace');
  await page.waitForTimeout(500);

  // Click sidebar trigger
  await page.click('button[data-sidebar="trigger"]');
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const sidebarFixed = document.querySelector('[data-slot="sidebar"] > div.fixed');
    const sidebarSpacer = document.querySelector('[data-slot="sidebar"] > div.relative');
    const mainContent = document.querySelector('main');
    return {
      sidebarFixedRect: sidebarFixed?.getBoundingClientRect(),
      sidebarSpacerRect: sidebarSpacer?.getBoundingClientRect(),
      mainContentRect: mainContent?.getBoundingClientRect(),
    };
  });

  console.log('📐 Collapsed Sidebar Metrics:');
  console.log(`   Fixed width: ${metrics.sidebarFixedRect?.width}px (esperado: 56px = 3.5rem)`);
  console.log(`   Spacer width: ${metrics.sidebarSpacerRect?.width}px (esperado: 56px = 3.5rem)`);
  console.log(`   Main Content left: ${metrics.mainContentRect?.left}px`);
  const overlap = (metrics.sidebarFixedRect?.right || 0) > (metrics.mainContentRect?.left || 0);
  console.log(`   👉 SOBREPOSIÇÃO NO ESTADO RECOLHIDO? ${overlap ? 'SIM' : 'NÃO (PERFEITO!)'}`);

  await page.screenshot({ path: 'C:/Users/Windows Lite BR/.gemini/antigravity/brain/d0110bc7-9b78-40d2-b3d8-1e39d2b10999/workspace-collapsed.png' });
  console.log('   📸 Screenshot recolhido salvo!');
  await browser.close();
}

main().catch(console.error);

