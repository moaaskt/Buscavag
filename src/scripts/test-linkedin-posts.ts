import dotenv from 'dotenv';
dotenv.config();

import { LinkedInPostsScraper } from '../scrapers/linkedinPosts.js';

async function testLinkedInPostsConnector() {
  console.log('=== TESTE DO CONECTOR LINKEDIN POSTS SCRAPER ===\n');

  const scraper = new LinkedInPostsScraper();
  console.log(`Nome do Conector: ${scraper.name}`);

  const jobs = await scraper.scrape();
  console.log(`Vagas coletadas: ${jobs.length}`);

  console.log('\n🎉 TESTE DO CONECTOR LINKEDIN POSTS FINALIZADO COM SUCESSO!');
}

testLinkedInPostsConnector().catch((err) => {
  console.error('Erro no teste:', err);
  process.exit(1);
});
