import { HermesEvaluator } from './services/hermesEvaluator';
import { CandidateMatcher, CandidateContext } from './services/candidateMatcher';
import { JobRepository } from './db/repository';
import { PlatformSource, RawJob } from './types/job';
import assert from 'node:assert';

async function runPhase68Tests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO TESTES DA PHASE 68: PARSER TÉCNICO & INGESTÃO MULTI-TENANT');
  console.log('====================================================\n');

  const evaluator = new HermesEvaluator();
  const matcher = new CandidateMatcher();
  const repo = new JobRepository();

  // Perfis de teste para o CandidateMatcher
  const juniorCandidate: CandidateContext = {
    userId: 'user-junior-1',
    targetRole: 'Desenvolvedor Full Stack',
    seniority: 'junior',
    skills: ['TypeScript', 'Node.js', 'React', 'Next.js', 'PostgreSQL', 'TailwindCSS'],
    preferredWorkModels: ['Remoto', 'Híbrido', 'Presencial'],
    expectedSalary: 'R$ 2.500',
  };

  const seniorCandidate: CandidateContext = {
    userId: 'user-senior-1',
    targetRole: 'Engenheiro de Software Sênior',
    seniority: 'senior',
    skills: ['Python', 'FastAPI', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL'],
    preferredWorkModels: ['Remoto', 'Híbrido'],
    expectedSalary: 'R$ 12.000',
  };

  // ----------------------------------------------------
  // CENÁRIO 1: Vaga Tech Sênior (Python / FastAPI / AWS)
  // ----------------------------------------------------
  console.log('[TESTE 1] Avaliando Vaga Tech Sênior...');
  const seniorJobRaw: RawJob = {
    title: 'Desenvolvedor Python Sênior',
    company: 'Cloud Corp',
    platform: PlatformSource.PROGRAMATHOR,
    url: 'https://example.com/senior-python-1',
    location: 'Remoto',
    publishedAt: new Date(),
    description: 'Buscamos Desenvolvedor Sênior com sólida experiência em Python, FastAPI, Docker, Kubernetes e AWS. Trabalho 100% remoto. Salário R$ 14.000.',
  };

  const seniorEval = evaluator.evaluateHeuristic(seniorJobRaw);
  console.log(`  -> isTechSoftware: ${seniorEval.isTechSoftware}`);
  console.log(`  -> requiredSeniority: ${seniorEval.requiredSeniority}`);
  console.log(`  -> category: ${seniorEval.category}`);
  console.log(`  -> techStack: [${seniorEval.techStack?.join(', ')}]`);
  console.log(`  -> workModel: ${seniorEval.workModel}`);

  assert.strictEqual(seniorEval.isTechSoftware, true, 'A vaga sênior deve ser classificada como tech software');
  assert.strictEqual(seniorEval.requiredSeniority, 'Sênior', 'A senioridade exigida deve ser Sênior');
  assert.ok(seniorEval.techStack?.includes('python'), 'Tech stack deve conter python');

  // Validação de Ingestão: Vagas sênior NÃO devem ser descartadas pelo filtro de escopo
  const isAcceptedInIngestion1 = seniorEval.isTechSoftware && seniorEval.category !== 'Other';
  assert.strictEqual(isAcceptedInIngestion1, true, 'Vaga sênior deve ser aceita na ingestão multi-tenant');
  console.log('  ✓ Ingestão: Vaga Sênior aceita para o banco de dados global');

  // Validação de Match em tempo real: Jr vs Sr
  const matchSeniorForJunior = matcher.calculateMatch({
    ...seniorJobRaw,
    requiredSeniority: seniorEval.requiredSeniority,
    techStack: seniorEval.techStack,
    workModel: seniorEval.workModel,
  }, juniorCandidate);

  console.log(`  -> Match para Candidato Júnior: Score = ${matchSeniorForJunior.overallScore}%, HardBlocked = ${matchSeniorForJunior.isHardBlocked}`);
  assert.strictEqual(matchSeniorForJunior.isHardBlocked, true, 'Candidato Júnior deve ser HARD BLOCKED para vaga Sênior');
  assert.ok(matchSeniorForJunior.overallScore <= 35, 'Score de candidato Júnior para vaga Sênior deve ser cravado em no máximo 35%');
  console.log('  ✓ Hard Constraint preservada: Candidato Júnior bloqueado com teto de 35%');

  const matchSeniorForSenior = matcher.calculateMatch({
    ...seniorJobRaw,
    requiredSeniority: seniorEval.requiredSeniority,
    techStack: seniorEval.techStack,
    workModel: seniorEval.workModel,
    salary: 'R$ 14000',
  }, seniorCandidate);

  console.log(`  -> Match para Candidato Sênior: Score = ${matchSeniorForSenior.overallScore}%, HardBlocked = ${matchSeniorForSenior.isHardBlocked}`);
  assert.strictEqual(matchSeniorForSenior.isHardBlocked, false, 'Candidato Sênior não deve sofrer hard block para vaga Sênior');
  assert.ok(matchSeniorForSenior.overallScore >= 70, 'Score de candidato Sênior compatível deve ser >= 70%');
  console.log('  ✓ Match Multi-Tenant: Candidato Sênior compatível com score alto');

  // ----------------------------------------------------
  // CENÁRIO 2: Vaga Tech Júnior (TypeScript / React / Node.js)
  // ----------------------------------------------------
  console.log('\n[TESTE 2] Avaliando Vaga Tech Júnior...');
  const juniorJobRaw: RawJob = {
    title: 'Desenvolvedor Full Stack Júnior',
    company: 'Tech Startup Floripa',
    platform: PlatformSource.VAGAS_FLORIPA,
    url: 'https://example.com/junior-fullstack-1',
    location: 'Florianópolis - SC',
    publishedAt: new Date(),
    description: 'Vaga para desenvolvedor júnior com conhecimento em TypeScript, Node.js, React e PostgreSQL. Modelo híbrido em Florianópolis. Salário R$ 3.500.',
  };

  const juniorEval = evaluator.evaluateHeuristic(juniorJobRaw);
  console.log(`  -> isTechSoftware: ${juniorEval.isTechSoftware}`);
  console.log(`  -> requiredSeniority: ${juniorEval.requiredSeniority}`);
  console.log(`  -> category: ${juniorEval.category}`);
  console.log(`  -> techStack: [${juniorEval.techStack?.join(', ')}]`);

  assert.strictEqual(juniorEval.isTechSoftware, true, 'A vaga júnior deve ser classificada como tech software');
  assert.strictEqual(juniorEval.requiredSeniority, 'Júnior', 'A senioridade exigida deve ser Júnior');

  const matchJuniorForJunior = matcher.calculateMatch({
    ...juniorJobRaw,
    requiredSeniority: juniorEval.requiredSeniority,
    techStack: juniorEval.techStack,
    workModel: juniorEval.workModel,
    salary: 'R$ 3500',
  }, juniorCandidate);

  console.log(`  -> Match para Candidato Júnior: Score = ${matchJuniorForJunior.overallScore}%, HardBlocked = ${matchJuniorForJunior.isHardBlocked}`);
  assert.strictEqual(matchJuniorForJunior.isHardBlocked, false, 'Candidato Júnior não deve ser bloqueado para vaga Júnior');
  assert.ok(matchJuniorForJunior.overallScore >= 75, 'Score de candidato Júnior deve ser >= 75%');
  console.log('  ✓ Match Jr: Compatibilidade alta confirmada');

  // ----------------------------------------------------
  // CENÁRIO 3: Vagas Não-Tech em Empresa de Tecnologia (Anti-Falso-Positivo)
  // ----------------------------------------------------
  console.log('\n[TESTE 3] Validando Barreira Anti-Falso-Positivo para Vagas Não-Tech...');

  const nonTechJobs: RawJob[] = [
    {
      title: 'SDR - Inside Sales B2B',
      company: 'SaaS Tech Brasil',
      platform: PlatformSource.LINKEDIN,
      url: 'https://example.com/sdr-1',
      location: 'Remoto',
      publishedAt: new Date(),
      description: 'Responsável por prospecção ativa de clientes B2B para software empresarial, qualificação de leads via CRM e agendamento de reuniões.',
    },
    {
      title: 'Tech Recruiter / Analista de RH',
      company: 'Software House Global',
      platform: PlatformSource.LINKEDIN,
      url: 'https://example.com/recruiter-1',
      location: 'São Paulo - SP',
      publishedAt: new Date(),
      description: 'Buscamos Tech Recruiter para atuar na atração e seleção de desenvolvedores React, Python e Node.js.',
    },
    {
      title: 'Auxiliar Administrativo e Financeiro',
      company: 'Fintech Inovação',
      platform: PlatformSource.INDEED,
      url: 'https://example.com/admin-1',
      location: 'Florianópolis - SC',
      publishedAt: new Date(),
      description: 'Rotinas de contas a pagar, contas a receber, conciliação bancária e suporte fiscal.',
    }
  ];

  for (const nonTech of nonTechJobs) {
    const evalRes = evaluator.evaluateHeuristic(nonTech);
    console.log(`  -> "${nonTech.title}": isTechSoftware = ${evalRes.isTechSoftware}, category = ${evalRes.category}`);
    assert.strictEqual(evalRes.isTechSoftware, false, `Vaga "${nonTech.title}" DEVE ter isTechSoftware = false`);
    assert.ok(evalRes.category === 'Other' || evalRes.category === 'Não-Tech', `Vaga "${nonTech.title}" DEVE ter category 'Other' ou 'Não-Tech' (atual: ${evalRes.category})`);

    // Validação do filtro de descarte na ingestão
    const isDiscardedInIngestion = !evalRes.isTechSoftware || evalRes.category === 'Other' || evalRes.category === 'Não-Tech';
    assert.strictEqual(isDiscardedInIngestion, true, `Vaga "${nonTech.title}" DEVE ser descartada na ingestão`);
  }
  console.log('  ✓ Todas as vagas não-tech foram corretamente descartadas na ingestão');

  // ----------------------------------------------------
  // CENÁRIO 4: Persistência e Recuperação no SQLite com Metadados Neutros
  // ----------------------------------------------------
  console.log('\n[TESTE 4] Validando Persistência no SQLite com Metadados da Fase 68...');
  const testJobRaw: RawJob = {
    title: 'Desenvolvedor Frontend Pleno',
    company: 'Web Innovations',
    platform: PlatformSource.PROGRAMATHOR,
    url: `https://example.com/test-phase68-${Date.now()}`,
    location: 'Florianópolis - SC',
    publishedAt: new Date(),
    description: 'Desenvolvimento de interfaces modernas utilizando Vue.js, TailwindCSS e TypeScript. Modelo híbrido.',
  };

  const testEval = evaluator.evaluateHeuristic(testJobRaw);
  const insertedJob = repo.insert(testJobRaw, testEval);

  assert.ok(insertedJob.id, 'Job inserido deve possuir ID');
  assert.strictEqual(insertedJob.requiredSeniority, 'Pleno', 'Senioridade persistida deve ser Pleno');
  assert.ok(insertedJob.techStack?.includes('typescript'), 'Tech stack persistido deve incluir typescript');
  assert.strictEqual(insertedJob.isTechSoftware, true, 'isTechSoftware persistido deve ser true');

  // Buscar do banco pelo ID
  const retrievedJob = repo.getJobById(insertedJob.id);
  assert.ok(retrievedJob, 'Vaga deve ser recuperada do banco pelo ID');
  assert.strictEqual(retrievedJob.requiredSeniority, 'Pleno', 'Senioridade lida do SQLite deve ser Pleno');
  assert.ok(retrievedJob.techStack?.includes('typescript'), 'Tech stack lida do SQLite deve conter typescript');
  assert.strictEqual(retrievedJob.isTechSoftware, true, 'isTechSoftware lido do SQLite deve ser true');
  console.log('  ✓ Persistência no SQLite confirmada com required_seniority e tech_stack intactos');

  console.log('\n====================================================');
  console.log('🎉 TODOS OS TESTES DA PHASE 68 PASSARAM COM SUCESSO!');
  console.log('====================================================\n');
}

runPhase68Tests().catch((err) => {
  console.error('❌ ERRO NA EXECUÇÃO DOS TESTES DA PHASE 68:', err);
  process.exit(1);
});
