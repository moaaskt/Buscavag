import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:3000/workspace');
  await page.waitForTimeout(1000);

  // Click trigger
  await page.click('[data-slot="sidebar-trigger"]', { force: true });
  await page.waitForTimeout(600);

  const buttons = await page.evaluate(() => {
    const mobileSidebar = document.querySelector('[data-mobile="true"]');
    const menuButtons = mobileSidebar ? Array.from(mobileSidebar.querySelectorAll('[data-slot="sidebar-menu-button"]')).map(b => b.textContent?.trim()) : [];
    return {
      mobileSidebarVisible: !!mobileSidebar,
      menuButtons
    };
  });

  console.log('Mobile sidebar buttons inside Sheet:', buttons);
  await browser.close();
}

main().catch(console.error);
