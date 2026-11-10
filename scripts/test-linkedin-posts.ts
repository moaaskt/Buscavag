import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { LinkedInPostsScraper, InterceptedApiResponse } from '../src/scrapers/linkedinPosts.js';

async function main() {
  console.log('\n======================================================');
  console.log('  BUSCAVAG - TESTE ISOLADO DO LINKEDIN POSTS SCRAPER');
  console.log('======================================================\n');

  const scraper = new LinkedInPostsScraper();
  const allInterceptedResponses: InterceptedApiResponse[] = [];

  scraper.onApiResponse = (info) => {
    allInterceptedResponses.push(info);
    const status = info.matched ? `✅ CASOU (+${info.postCount} posts)` : '⚪ Não casou';
    console.log(`📡 [API ${info.sourceName}] ${status} -> ${info.url.substring(0, 110)}...`);
  };

  console.log(`⏱️ Timeout dinâmico calculado: ${scraper.timeoutMs / 1000}s (60s base + 35s × fontes)`);
  console.log('Iniciando ciclo único de extração...\n');

  const startTime = Date.now();
  const jobs = await scraper.scrape();
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n======================================================');
  console.log('  RELATÓRIO DO TESTE DE EXTRAÇÃO');
  console.log('======================================================');
  console.log(`⏱️ Tempo total gasto: ${durationSec}s / Timeout limite: ${scraper.timeoutMs / 1000}s`);
  console.log(`📌 Fontes varridas com sucesso: ${scraper.stats.sourcesCompleted}/${scraper.stats.totalSourcesTargeted}`);
  if (scraper.stats.timedOutEarly) {
    console.log(`⚠️ Ciclo interrompido preventivamente por deadline para não perder dados! As fontes restantes serão retomadas no próximo ciclo.`);
  }

  // 1. Respostas de API Voyager / GraphQL por fonte
  console.log(`\n📡 RESPOSTAS DE REDE INTERCEPTADAS POR FONTE (${allInterceptedResponses.length} total):`);
  const groupedBySource: Record<string, InterceptedApiResponse[]> = {};
  for (const resp of allInterceptedResponses) {
    if (!groupedBySource[resp.sourceName]) groupedBySource[resp.sourceName] = [];
    groupedBySource[resp.sourceName].push(resp);
  }

  for (const [sourceName, resps] of Object.entries(groupedBySource)) {
    console.log(`\n📌 Fonte: "${sourceName}" (${resps.length} chamadas JSON interceptadas):`);
    resps.forEach((r, idx) => {
      const matchBadge = r.matched ? `[MATCH: +${r.postCount} posts]` : '[SEM MATCH]';
      console.log(`   ${idx + 1}. ${matchBadge} ${r.url.substring(0, 120)}`);
    });
  }

  // 2. Estatísticas do Filtro (com limite estrito de 7 dias)
  console.log(`\n🎯 ESTATÍSTICAS DO FILTRO (Limite estrito de 7 dias):`);
  console.log(`   - Total de posts brutos únicos lidos (API + DOM): ${scraper.stats.totalRead}`);
  console.log(`   - Aprovados com sinais de vaga (<= 7 dias):       ${scraper.stats.passedRelevance}`);
  console.log(`   - Descartados por relevância / marketing:         ${scraper.stats.discardedRelevance}`);
  console.log(`   - Descartados por data antiga (> 7 dias):         ${scraper.stats.discardedByDate}`);
  console.log(`   - Descartados por falta total de data:            ${scraper.stats.discardedWithoutDate}`);
  console.log(`   - Vagas aprovadas com URN canônica:               ${scraper.stats.approvedPosts.filter(p => p.hasCanonicalUrn).length}`);
  console.log(`   - Vagas aprovadas sem URN canônica (link fonte):  ${scraper.stats.postsWithoutUrn}`);

  // 3. Lista detalhada de posts APROVADOS
  console.log(`\n======================================================`);
  console.log(`✅ POSTS APROVADOS (${scraper.stats.approvedPosts.length}):`);
  console.log(`======================================================`);
  if (scraper.stats.approvedPosts.length === 0) {
    console.log('   (Nenhum post aprovado)');
  } else {
    scraper.stats.approvedPosts.forEach((p, idx) => {
      console.log(`\n[APROVADO #${idx + 1}] "${p.title}"`);
      console.log(`   👤 Autor:          ${p.author}`);
      console.log(`   📅 Data Calculada: ${p.dateFormatted} (${p.ageDays} dias atrás)`);
      console.log(`   🔍 Info Data:      ${p.dateInfo}`);
      console.log(`   💡 Motivo:         ${p.reason}`);
      console.log(`   🔗 Link Canônico:  ${p.url}`);
    });
  }

  // 4. Lista detalhada de posts DESCARTADOS
  console.log(`\n======================================================`);
  console.log(`❌ POSTS DESCARTADOS (${scraper.stats.discardedPosts.length}):`);
  console.log(`======================================================`);
  if (scraper.stats.discardedPosts.length === 0) {
    console.log('   (Nenhum post descartado)');
  } else {
    scraper.stats.discardedPosts.forEach((p, idx) => {
      console.log(`\n[DESCARTADO #${idx + 1}] "${p.title}"`);
      console.log(`   👤 Autor:  ${p.author}`);
      console.log(`   📅 Data:   ${p.dateInfo}`);
      console.log(`   🚫 Motivo: ${p.reason}`);
    });
  }

  // 5. Estado de Retomada salvo em disco
  const statePath = path.resolve(process.cwd(), 'data', 'linkedin-state.json');
  if (fs.existsSync(statePath)) {
    console.log(`\n======================================================`);
    console.log(`🔄 ESTADO DE RETOMADA SALVO (data/linkedin-state.json):`);
    console.log(`======================================================`);
    console.log(fs.readFileSync(statePath, 'utf-8'));
  }

  console.log('\n======================================================');
  console.log('  FIM DO TESTE');
  console.log('======================================================\n');
}

main().catch(console.error);
