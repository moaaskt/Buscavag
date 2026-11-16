import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

function updateEnvFile(liAt: string, jsessionId: string) {
  const envPath = path.resolve(process.cwd(), '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  if (content.includes('LINKEDIN_SESSION_COOKIE=')) {
    content = content.replace(/LINKEDIN_SESSION_COOKIE=.*/g, `LINKEDIN_SESSION_COOKIE=${liAt}`);
  } else {
    content += `\nLINKEDIN_SESSION_COOKIE=${liAt}`;
  }

  if (content.includes('LINKEDIN_JSESSIONID=')) {
    content = content.replace(/LINKEDIN_JSESSIONID=.*/g, `LINKEDIN_JSESSIONID=${jsessionId}`);
  } else {
    content += `\nLINKEDIN_JSESSIONID=${jsessionId}`;
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');
}

async function main() {
  console.log('\n======================================================');
  console.log('  BUSCAVAG - VALIDADOR E SINCRONIZADOR DE SESSÃO LINKEDIN');
  console.log('======================================================\n');

  console.log('Verificando conexão com o Chrome dedicado (porta 9222)...');

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 3000 });
    console.log('✅ Conexão estabelecida com sucesso com o Chrome na porta 9222!');
  } catch {
    console.warn('⚠️ Google Chrome com depuração não detectado na porta 9222.');
    console.log('👉 Iniciando o Chrome com perfil dedicado agora...');

    exec('powershell -ExecutionPolicy Bypass -File scripts/start-chrome-linkedin.ps1');

    console.log('Aguardando 4 segundos para inicialização...');
    await new Promise((r) => setTimeout(r, 4000));

    try {
      browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 6000 });
      console.log('✅ Conectado ao Chrome com perfil dedicado!');
    } catch {
      console.error('❌ Não foi possível conectar ao Chrome.');
      console.error('   Execute manualmente em um terminal: npm run chrome:linkedin');
      process.exit(1);
    }
  }

  const contexts = browser.contexts();
  const context = contexts[0] || (await browser.newContext());

  // Procura aba existente ou abre uma nova
  let pages = context.pages();
  let page = pages[0] || (await context.newPage());

  console.log('Verificando status de autenticação no LinkedIn...');

  let isLogged = false;
  let currentUrl = page.url();

  // Função para verificar se a URL é de sessão autenticada
  const checkUrlLogged = (url: string) =>
    url.includes('/feed') || url.includes('/mynetwork') || url.includes('/in/') || url.includes('/messaging');

  if (checkUrlLogged(currentUrl)) {
    isLogged = true;
  } else {
    // Se a aba estiver em branco ou about:blank, tenta abrir a página de feed
    if (currentUrl === 'about:blank' || currentUrl === '' || currentUrl.includes('chrome://')) {
      try {
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
        currentUrl = page.url();
      } catch {}
    }

    if (checkUrlLogged(page.url())) {
      isLogged = true;
    } else {
      console.log('\n⏳ A janela do Chrome está aberta na tela de login ou verificação.');
      console.log('👉 Faça o login no LinkedIn na janela do Chrome.');
      console.log('👉 Aguardando detecção de login automático (até 90 segundos)...\n');

      const maxWaitSec = 90;
      for (let sec = 0; sec < maxWaitSec; sec += 3) {
        await new Promise((r) => setTimeout(r, 3000));
        pages = context.pages();
        for (const p of pages) {
          const u = p.url();
          if (checkUrlLogged(u)) {
            isLogged = true;
            page = p;
            currentUrl = u;
            break;
          }
        }
        if (isLogged) break;
        process.stdout.write(`   [${sec + 3}s/${maxWaitSec}s] Aguardando login...\r`);
      }
      console.log('');
    }
  }

  if (isLogged) {
    console.log('\n🎉 Login verificado com sucesso no LinkedIn!');
    console.log('URL ativa:', currentUrl);

    // Extrai cookies
    const cookies = await context.cookies('https://www.linkedin.com');
    const normalized = cookies.map((c) => ({
      ...c,
      domain: c.domain?.startsWith('.www.') ? '.linkedin.com' : c.domain,
    }));

    // Localiza li_at e JSESSIONID
    const liAtCookie = normalized.find((c) => c.name === 'li_at')?.value || '';
    let jsessionIdCookie = normalized.find((c) => c.name === 'JSESSIONID')?.value || '';
    jsessionIdCookie = jsessionIdCookie.replace(/^"|"$/g, '');

    // Salva li-cookies.json
    const liCookiesPath = path.resolve(process.cwd(), 'li-cookies.json');
    fs.writeFileSync(liCookiesPath, JSON.stringify(normalized, null, 2), 'utf-8');
    console.log(`✅ ${normalized.length} cookies sincronizados em li-cookies.json.`);

    // Atualiza automaticamente o .env se encontrou os cookies de sessão
    if (liAtCookie) {
      updateEnvFile(liAtCookie, jsessionIdCookie);
      console.log('✅ Arquivo .env atualizado com as novas chaves LINKEDIN_SESSION_COOKIE e LINKEDIN_JSESSIONID!');
    }

    // Limpa cooldown se houver
    const cooldownPath = path.resolve(process.cwd(), 'data', 'linkedin-cooldown.json');
    if (fs.existsSync(cooldownPath)) {
      fs.unlinkSync(cooldownPath);
      console.log('✅ Cooldown anterior removido.');
    }

    console.log('\n======================================================');
    console.log('  SINCRONIZAÇÃO COMPLETA: PRONTO PARA COLETAR VAGAS!');
    console.log('======================================================\n');
  } else {
    console.warn('\n⚠️ Tempo limite atingido sem confirmação de login.');
    console.log('👉 Se você ainda está efetuando o login, conclua-o no Chrome e execute novamente:');
    console.log('   npm run auth:linkedin\n');
  }
}

main().catch(console.error);
