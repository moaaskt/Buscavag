import { matchesBlacklist, matchesWhitelist, isTechJob } from './config/jobFilters';
import { HermesEvaluator } from './services/hermesEvaluator';
import { sanitizeDatabase } from './scripts/sanitize-nontech-jobs';
import { db, initDatabase } from './db/index';
import { RawJob, PlatformSource } from './types/job';

async function runPhase91Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 91 (FALLBACK HEURÍSTICO & BLACKLIST NÃO-TECH) ---');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (!condition) {
      console.error(`❌ [TEST ${total}] FALHOU: ${testName}`);
      process.exit(1);
    }
    passed++;
    console.log(`✅ [TEST ${total}] PASSOU: ${testName}`);
  }

  initDatabase();
  const evaluator = new HermesEvaluator();

  // 1. TESTES DE BLACKLIST NÃO-TECH
  const nonTechTitles = [
    'Assistente FiscalCandidatar-se',
    'Assistente Administrativo - VAGA EXCLUSIVA PARA PCD',
    'Assistente Financeiro / Contábil',
    'Corretor de Imóveis - JoinvilleCandidatar-se',
    'Corretor de Seguros - Balneário Camboriú',
    'Engenheiro Eletricista I - Engenharia Clínica',
    'Engenheiro Civil de Obras',
    'Enfermeiro Geral UTI Adulto',
    'Técnico em Enfermagem',
    'Vendedor Interno / Comercial',
    'Motorista Entregador Categoria B',
    'Estágio em Recursos Humanos',
    'Estágio em Direito Imobiliário',
    'Estágio em Logística e Expedição',
  ];

  for (const title of nonTechTitles) {
    const blacklistCheck = matchesBlacklist(title);
    assert(blacklistCheck.matched === true, `matchesBlacklist deve capturar cargo não-tech: "${title}" (Detectado: ${blacklistCheck.term})`);
    assert(isTechJob(title) === false, `isTechJob deve retornar false para: "${title}"`);
  }

  // 2. TESTES DE PRECEDÊNCIA TECH EM CONTEXTOS HÍBRIDOS
  const hybridAndTechTitles = [
    { title: 'Engenheiro(a) de Software | Assistente e Júnior', expectedTech: true },
    { title: '[Freela] Desenvolvimento de Sistema de Automação para Corretora de Seguros', expectedTech: true },
    { title: 'Desenvolvedor Full Stack Jr', expectedTech: true },
    { title: 'Desenvolvedor Frontend Pleno', expectedTech: true },
    { title: 'Software Engineer Backend', expectedTech: true },
    { title: 'Engenheiro de Dados Sênior', expectedTech: true },
    { title: 'Programador Python / Django', expectedTech: true },
    { title: 'Analista de QA / Automação de Testes', expectedTech: true },
  ];

  for (const item of hybridAndTechTitles) {
    const isTech = isTechJob(item.title);
    assert(isTech === item.expectedTech, `isTechJob deve validar precedência técnica para: "${item.title}"`);
    const blacklist = matchesBlacklist(item.title);
    assert(blacklist.matched === false, `matchesBlacklist NÃO deve bloquear cargo tech legítimo: "${item.title}"`);
  }

  // 3. TESTES DO FALLBACK HEURÍSTICO DO HERMESEVALUATOR
  // 3.1. Vaga Não-Tech
  const rawNonTechJob: RawJob = {
    title: 'Assistente Fiscal Sênior',
    company: 'Escritório Contábil XPTO',
    location: 'Florianópolis, SC',
    description: 'Rotinas fiscais, apuração de impostos, emissão de guias DAS, ICMS e SPED Fiscal.',
    url: 'https://exemplo.com/vaga-assistente-fiscal',
    platform: PlatformSource.GUPY,
    publishedAt: new Date(),
  };

  const nonTechEval = evaluator.evaluateHeuristic(rawNonTechJob);
  assert(nonTechEval.isTechSoftware === false, 'evaluateHeuristic deve definir isTechSoftware = false para Assistente Fiscal');
  assert(nonTechEval.isJuniorFullStack === false, 'evaluateHeuristic deve definir isJuniorFullStack = false para Não-Tech');
  assert(nonTechEval.overallScore === 0, 'evaluateHeuristic deve definir overallScore = 0 para Não-Tech');
  assert(nonTechEval.category === 'Não-Tech', `evaluateHeuristic deve categorizar como "Não-Tech" (obtido: "${nonTechEval.category}")`);
  assert(nonTechEval.reasoning.includes('Rejeitada via Heurística'), 'reasoning deve indicar rejeição via heurística');

  // 3.2. Vaga Tech Genérica (SEM termo Full Stack) -> NUNCA deve receber a tag "Full Stack"!
  const rawGenericTechJob: RawJob = {
    title: 'Programador de Sistemas C++',
    company: 'Tech Indústria',
    location: 'Remoto',
    description: 'Desenvolvimento de algoritmos em C++ de alta performance e baixo overhead.',
    url: 'https://exemplo.com/vaga-cpp',
    platform: PlatformSource.LINKEDIN,
    publishedAt: new Date(),
  };

  const genericTechEval = evaluator.evaluateHeuristic(rawGenericTechJob);
  assert(genericTechEval.isTechSoftware === true, 'evaluateHeuristic deve aprovar Programador C++ como tech');
  assert(genericTechEval.category !== 'Full Stack', 'evaluateHeuristic JAMAIS deve atribuir "Full Stack" por padrão sem menção explícita');
  assert(genericTechEval.category === 'Software Geral', `evaluateHeuristic deve categorizar vaga tech genérica como "Software Geral" (obtido: "${genericTechEval.category}")`);

  // 3.3. Vaga Expressamente Full Stack
  const rawFullStackJob: RawJob = {
    title: 'Desenvolvedor Full Stack Node & React Jr',
    company: 'Startup Inovadora',
    location: 'Remoto',
    description: 'Construção de APIs em Node.js com Express e interfaces ricas em React e Tailwind.',
    url: 'https://exemplo.com/vaga-fullstack',
    platform: PlatformSource.GUPY,
    publishedAt: new Date(),
  };

  const fullStackEval = evaluator.evaluateHeuristic(rawFullStackJob);
  assert(fullStackEval.isTechSoftware === true, 'evaluateHeuristic deve aprovar Dev Full Stack');
  assert(fullStackEval.category === 'Full Stack', 'evaluateHeuristic deve categorizar como "Full Stack" quando expressamente indicado');
  assert(fullStackEval.isJuniorFullStack === true, 'isJuniorFullStack deve ser true para vaga Full Stack Jr');

  // 4. TESTE DA ROTINA DE HIGIENIZAÇÃO DE BANCO
  const sanitizeReport = sanitizeDatabase();
  assert(typeof sanitizeReport.totalExamined === 'number', 'sanitizeDatabase deve retornar totalExamined numérico');
  assert(typeof sanitizeReport.deletedCount === 'number', 'sanitizeDatabase deve retornar deletedCount numérico');
  assert(typeof sanitizeReport.reclassifiedCount === 'number', 'sanitizeDatabase deve retornar reclassifiedCount numérico');

  // Validação no SQLite pós-higienização: Zero vagas não-tech residuais
  const leftoverNonTechs = db.prepare(`
    SELECT COUNT(*) as count 
    FROM jobs 
    WHERE LOWER(title) LIKE '%assistente fiscal%'
       OR LOWER(title) LIKE '%corretor de imóveis%'
       OR LOWER(title) LIKE '%engenheiro clínico%'
  `).get() as { count: number };

  assert(leftoverNonTechs.count === 0, `Banco de dados não deve conter nenhuma vaga residual não-tech (encontradas: ${leftoverNonTechs.count})`);

  console.log('\n======================================================');
  console.log('  RESULTADO DA SUÍTE DA PHASE 91:');
  console.log(`  Total de testes executados: ${total}`);
  console.log(`  Testes aprovados: ${passed}`);
  console.log(`  Testes reprovados: ${total - passed}`);
  console.log('  Status: 100% CONCLUÍDO E APROVADO ✓');
  console.log('======================================================\n');
}

runPhase91Tests().catch((err) => {
  console.error('Erro fatal na execução da suíte da Phase 91:', err);
  process.exit(1);
});
