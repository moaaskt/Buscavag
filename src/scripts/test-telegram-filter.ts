import dotenv from 'dotenv';
dotenv.config();

import { TelegramNotifier } from '../services/telegramNotifier.js';
import { ProcessedJob, PlatformSource } from '../types/job.js';

async function runFilterTests() {
  console.log('=== TESTE DE FILTRAGEM RESTRITA DO TELEGRAM (moacirneto59@gmail.com) ===\n');

  const notifier = new TelegramNotifier();
  const target = notifier.getTargetCandidateContext();

  console.log(`Perfil Carregado:`);
  console.log(`- Usuário: ${target.userId}`);
  console.log(`- Nível de Senioridade: ${target.seniority}`);
  console.log(`- Stacks Principais: ${target.skills.join(', ')}\n`);

  // Cenário 1: Vaga Full Stack Júnior (deve APROVAR)
  const jobA: ProcessedJob = {
    id: 'test-job-junior-fullstack',
    url: 'https://example.com/jobs/1',
    title: 'Desenvolvedor Full Stack Júnior',
    company: 'Tech Solutions Corp',
    platform: PlatformSource.LINKEDIN,
    description: 'Vaga para desenvolvedor full stack júnior com conhecimentos em React, Node.js, TypeScript e PostgreSQL.',
    publishedAt: new Date(),
    location: 'Remoto / Florianópolis SC',
    isJuniorFullStack: true,
    notified: false,
    scoreIa: 85,
    overallScore: 85,
    stackScore: 90,
    seniorityScore: 95,
    locationScore: 100,
    category: 'desenvolvimento',
    gaps: [],
    resumeTips: '',
    applicationStatus: 'pending',
    aiReasoning: 'Excelente aderência para perfil júnior de desenvolvimento web full stack.',
    createdAt: new Date(),
    requiredSeniority: 'Júnior',
    techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    workModel: 'remoto',
    isTechSoftware: true,
  };

  // Cenário 2: Vaga Sênior / Lead (deve BLOQUEAR)
  const jobB: ProcessedJob = {
    id: 'test-job-senior-lead',
    url: 'https://example.com/jobs/2',
    title: 'Senior Software Architect / Tech Lead',
    company: 'Enterprise MegaCorp',
    platform: PlatformSource.GUPY,
    description: 'Buscamos Arquiteto e Tech Lead Sênior com mais de 8 anos de experiência em Java, Spring Boot e Microsserviços.',
    publishedAt: new Date(),
    location: 'São Paulo - SP',
    isJuniorFullStack: false,
    notified: false,
    scoreIa: 25,
    overallScore: 25,
    stackScore: 20,
    seniorityScore: 10,
    locationScore: 50,
    category: 'arquitetura',
    gaps: ['Senioridade 8+ anos', 'Java/Spring'],
    resumeTips: '',
    applicationStatus: 'pending',
    aiReasoning: 'Incompatível com o nível júnior.',
    createdAt: new Date(),
    requiredSeniority: 'Sênior',
    techStack: ['Java', 'Spring Boot', 'Kubernetes'],
    workModel: 'presencial',
    isTechSoftware: true,
  };

  // Cenário 3: Vaga Não-Tech / Operacional (deve BLOQUEAR)
  const jobC: ProcessedJob = {
    id: 'test-job-almoxarifado',
    url: 'https://example.com/jobs/3',
    title: 'Assistente Administrativo / Almoxarife',
    company: 'Logística Express',
    platform: PlatformSource.CATHO,
    description: 'Organização de estoque físico, conferência de notas fiscais e controle de inventário.',
    publishedAt: new Date(),
    location: 'Joinville - SC',
    isJuniorFullStack: false,
    notified: false,
    scoreIa: 0,
    overallScore: 0,
    stackScore: 0,
    seniorityScore: 0,
    locationScore: 0,
    category: 'operacional',
    gaps: ['Não é área de TI'],
    resumeTips: '',
    applicationStatus: 'pending',
    aiReasoning: 'Vaga de almoxarifado operacional.',
    createdAt: new Date(),
    requiredSeniority: 'Assistente',
    techStack: [],
    workModel: 'presencial',
    isTechSoftware: false,
  };

  const evalA = notifier.evaluateJobEligibility(jobA);
  console.log(`[Cenário A] Vaga: "${jobA.title}"`);
  console.log(`  -> Elegível: ${evalA.eligible ? '✅ SIM (Aprovada)' : '❌ NÃO'}`);
  console.log(`  -> Motivo: ${evalA.reason}`);
  console.log(`  -> Match Score: ${evalA.matchResult.overallScore}% | Stack: ${evalA.matchResult.stackScore}%\n`);

  const evalB = notifier.evaluateJobEligibility(jobB);
  console.log(`[Cenário B] Vaga: "${jobB.title}"`);
  console.log(`  -> Elegível: ${evalB.eligible ? '✅ SIM' : '❌ NÃO (Bloqueada com sucesso)'}`);
  console.log(`  -> Motivo: ${evalB.reason}\n`);

  const evalC = notifier.evaluateJobEligibility(jobC);
  console.log(`[Cenário C] Vaga: "${jobC.title}"`);
  console.log(`  -> Elegível: ${evalC.eligible ? '✅ SIM' : '❌ NÃO (Bloqueada com sucesso)'}`);
  console.log(`  -> Motivo: ${evalC.reason}\n`);

  console.log('--- Testando disparo simulado (Mock ou Live) com sendNotification ---');
  const dispatchedA = await notifier.sendNotification(jobA);
  console.log(`Disparo Cenário A (Júnior): ${dispatchedA ? '✅ DISPARADO' : '❌ REJEITADO'}`);

  const dispatchedB = await notifier.sendNotification(jobB);
  console.log(`Disparo Cenário B (Sênior): ${dispatchedB ? '❌ DISPARADO (Falha de Trava)' : '✅ BLOQUEADO (Correto)'}`);

  const dispatchedC = await notifier.sendNotification(jobC);
  console.log(`Disparo Cenário C (Não-Tech): ${dispatchedC ? '❌ DISPARADO (Falha de Trava)' : '✅ BLOQUEADO (Correto)'}`);

  if (evalA.eligible && !evalB.eligible && !evalC.eligible && dispatchedA && !dispatchedB && !dispatchedC) {
    console.log('\n🎉 TODOS OS TESTES DE VALIDAÇÃO PASSARAM COM 100% DE SUCESSO!');
  } else {
    console.error('\n⚠️ Houve inconsistência em um ou mais cenários.');
    process.exit(1);
  }
}

runFilterTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
