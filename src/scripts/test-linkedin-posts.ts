import dotenv from 'dotenv';
dotenv.config();

import { LinkedInPostsScraper } from '../scrapers/linkedinPosts.js';

async function testLinkedInPostsConnector() {
  console.log('=== TESTE DO CONECTOR LINKEDIN POSTS SCRAPER ===\n');

  const scraper = new LinkedInPostsScraper();
  console.log(`Nome do Conector: ${scraper.name}`);

  // Simular contexto mock para testar injeção de cookies sem abrir navegador real
  const mockCookies: any[] = [];
  const fakeContext = {
    addCookies: async (cookies: any[]) => {
      mockCookies.push(...cookies);
    },
  } as any;

  // Cenário 1: Teste com LINKEDIN_SESSION_COOKIE definida
  process.env.LINKEDIN_SESSION_COOKIE = 'AQEDATestCookieValue123456789';
  const injected = await scraper.injectSessionCookies(fakeContext);

  console.log(`Injeção via LINKEDIN_SESSION_COOKIE / li_at: ${injected ? '✅ SUCESSO' : '❌ FALHA'}`);
  console.log(`Cookies injetados (${mockCookies.length}):`);
  mockCookies.forEach((c) => {
    console.log(` - ${c.name}=${c.value.slice(0, 8)}... (domain: ${c.domain}, secure: ${c.secure})`);
  });

  if (mockCookies.some((c) => c.name === 'li_at' && c.domain === '.linkedin.com')) {
    console.log('\n✅ Formato do cookie li_at validado com precisão.');
  } else {
    console.error('\n❌ Falha na formatação do cookie li_at.');
    process.exit(1);
  }

  // Cenário 2: Teste do fallback Mock de vagas
  process.env.LI_MOCK = 'true';
  console.log('\nTestando extração no modo MOCK (LI_MOCK=true)...');
  const jobs = await (scraper as any).generateMockJobs();
  console.log(`Vagas geradas via mock: ${jobs.length}`);
  if (jobs.length > 0) {
    console.log(`Exemplo de publicação coletada: "${jobs[0].title}" | ${jobs[0].company}`);
    console.log(`URL do Post: ${jobs[0].url}`);
  }

  console.log('\n🎉 TESTE DO CONECTOR LINKEDIN POSTS FINALIZADO COM SUCESSO!');
}

testLinkedInPostsConnector().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
