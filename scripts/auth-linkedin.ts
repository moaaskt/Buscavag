import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('\n======================================================');
  console.log('  BUSCAVAG - AUTENTICADOR INTERATIVO DO LINKEDIN');
  console.log('======================================================');
  console.log('Abrindo navegador Google Chrome para autenticação...\n');
  console.log('👉 Faça login na janela que abrir (ou clique em continuar).');
  console.log('👉 Assim que você entrar no LinkedIn, os tokens de sessão serão capturados e salvos automaticamente!\n');

  const userDataDir = path.resolve(process.cwd(), 'data', 'linkedin_profile');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 800 }
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto('https://www.linkedin.com/login');

  console.log('Aguardando login no LinkedIn (você tem até 3 minutos)...');

  let captured = false;
  const timeoutMs = 180000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const cookies = await context.cookies('https://www.linkedin.com');
    const liAtCookie = cookies.find((c) => c.name === 'li_at');
    const jsessionIdCookie = cookies.find((c) => c.name === 'JSESSIONID');

    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('/feed') || currentUrl.includes('/mynetwork') || currentUrl.includes('/messaging');

    if (liAtCookie && jsessionIdCookie && (isLoggedIn || liAtCookie.value.length > 20)) {
      console.log('\n🎉 Login detectado com sucesso!');
      console.log(`li_at encontrado: ${liAtCookie.value.substring(0, 15)}...`);
      console.log(`JSESSIONID encontrado: ${jsessionIdCookie.value}`);

      // Salva no .env
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        
        if (envContent.includes('LINKEDIN_SESSION_COOKIE=')) {
          envContent = envContent.replace(/LINKEDIN_SESSION_COOKIE=.*/g, `LINKEDIN_SESSION_COOKIE=${liAtCookie.value}`);
        } else {
          envContent += `\nLINKEDIN_SESSION_COOKIE=${liAtCookie.value}`;
        }

        if (envContent.includes('LINKEDIN_JSESSIONID=')) {
          envContent = envContent.replace(/LINKEDIN_JSESSIONID=.*/g, `LINKEDIN_JSESSIONID=${jsessionIdCookie.value}`);
        } else {
          envContent += `\nLINKEDIN_JSESSIONID=${jsessionIdCookie.value}`;
        }

        fs.writeFileSync(envPath, envContent, 'utf-8');
        console.log('✅ Arquivo .env atualizado automaticamente com as novas chaves!');
      }

      // Salva também no li-cookies.json
      const liCookiesPath = path.resolve(process.cwd(), 'li-cookies.json');
      fs.writeFileSync(liCookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');
      console.log('✅ Arquivo li-cookies.json sincronizado com a sessão completa (bcookie, lidc, li_at)!');

      captured = true;
      break;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  if (captured) {
    console.log('\n🚀 Sessão do LinkedIn autenticada e pronta para o scraper!');
    console.log('Fechando navegador em 3 segundos...');
    await new Promise((r) => setTimeout(r, 3000));
  } else {
    console.warn('\n⚠️ Tempo limite atingido sem confirmação de login.');
  }

  await context.close();
}

main().catch(console.error);
