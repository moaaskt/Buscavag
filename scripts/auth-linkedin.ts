import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

async function main() {
  console.log('\n======================================================');
  console.log('  BUSCAVAG - VALIDADOR DE SESSÃO CHROME (PORTA 9222)');
  console.log('======================================================\n');

  console.log('Verificando conexão com o Chrome dedicado (porta 9222)...');

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 3000 });
    console.log('✅ Conexão estabelecida com sucesso com o Chrome na porta 9222!');
  } catch {
    console.warn('⚠️ Google Chrome com depuração não detectado na porta 9222.');
    console.log('👉 Iniciando o Chrome com perfil dedicado agora...');
    
    // Inicia o script PowerShell
    exec('powershell -ExecutionPolicy Bypass -File scripts/start-chrome-linkedin.ps1');
    
    console.log('Aguardando 5 segundos para conexão...');
    await new Promise((r) => setTimeout(r, 5000));
    
    try {
      browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 5000 });
      console.log('✅ Conectado ao Chrome recém-aberto!');
    } catch {
      console.error('❌ Não foi possível conectar ao Chrome. Por favor, execute:');
      console.error('   npm run chrome:linkedin');
      process.exit(1);
    }
  }

  const contexts = browser.contexts();
  const context = contexts[0] || (await browser.newContext());
  const page = await context.newPage();

  try {
    console.log('Verificando status de login no LinkedIn...');
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const currentUrl = page.url();
    const isLogged = currentUrl.includes('/feed') || currentUrl.includes('/mynetwork') || currentUrl.includes('/in/');

    if (isLogged) {
      console.log('🎉 Login verificado com sucesso no LinkedIn!');
      console.log('URL atual:', currentUrl);

      // Normalização de cookies para .linkedin.com caso necessário como backup
      const cookies = await context.cookies('https://www.linkedin.com');
      const normalized = cookies.map((c) => ({
        ...c,
        domain: c.domain?.startsWith('.www.') ? '.linkedin.com' : c.domain,
      }));

      const liCookiesPath = path.resolve(process.cwd(), 'li-cookies.json');
      fs.writeFileSync(liCookiesPath, JSON.stringify(normalized, null, 2), 'utf-8');
      console.log(`✅ ${normalized.length} cookies sincronizados em li-cookies.json.`);

      // Limpar cooldown caso existisse
      const cooldownPath = path.resolve(process.cwd(), 'data', 'linkedin-cooldown.json');
      if (fs.existsSync(cooldownPath)) {
        fs.unlinkSync(cooldownPath);
        console.log('✅ Cooldown anterior removido.');
      }
    } else {
      console.warn('⚠️ O LinkedIn não está na tela de Feed (URL:', currentUrl, ')');
      console.log('👉 Por favor, faça login manualmente na janela do Chrome aberta e execute este comando novamente.');
    }
  } finally {
    // Fecha apenas a aba de verificação criada pelo script
    await page.close();
  }

  console.log('\n======================================================');
  console.log('  VALIDAÇÃO CONCLUÍDA');
  console.log('======================================================\n');
}

main().catch(console.error);
