import 'dotenv/config';
import { LinkedInPostsScraper } from '../src/scrapers/linkedinPosts.js';

async function main() {
  console.log('\n======================================================');
  console.log('  BUSCAVAG - TESTE ISOLADO DO LINKEDIN POSTS SCRAPER');
  console.log('======================================================\n');

  const scraper = new LinkedInPostsScraper();
  const interceptedUrls: Array<{ url: string; count: number }> = [];

  // Registra URLs de API interceptadas
  scraper.onApiIntercepted = (url, count) => {
    interceptedUrls.push({ url, count });
    console.log(`📡 [API INTERCEPTADA] +${count} post(s) via: ${url.substring(0, 100)}...`);
  };

  console.log('Iniciando ciclo único de extração...');
  const startTime = Date.now();
  const jobs = await scraper.scrape();
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n======================================================');
  console.log('  RELATÓRIO DO TESTE DE EXTRAÇÃO');
  console.log('======================================================');
  console.log(`⏱️ Tempo total: ${durationSec}s`);
  console.log(`🌐 URLs de API interceptadas: ${interceptedUrls.length}`);
  interceptedUrls.forEach((item, idx) => {
    console.log(`   ${idx + 1}. [${item.count} posts] ${item.url.substring(0, 110)}`);
  });

  console.log(`\n📋 Total de vagas identificadas e estruturadas: ${jobs.length}`);

  jobs.forEach((job, idx) => {
    console.log(`\n------------------------------------------------------`);
    console.log(`Vaga #${idx + 1}: "${job.title}"`);
    console.log(`Autor / Empresa: ${job.company}`);
    console.log(`Link: ${job.url}`);
    console.log(`Contato direto: ${job.directContact || 'Não detectado'}`);
    console.log(`Tamanho do texto: ${job.description.length} caracteres`);
    console.log(`Prévia do texto:\n"""\n${job.description.substring(0, 280)}...\n"""`);
  });

  console.log('\n======================================================');
  console.log('  FIM DO TESTE');
  console.log('======================================================\n');
}

main().catch(console.error);
