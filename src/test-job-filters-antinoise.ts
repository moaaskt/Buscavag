import assert from 'node:assert';
import { isTechJob, matchesBlacklist, matchesWhitelist, cleanJobTitle } from './config/jobFilters.js';
import { HermesEvaluator } from './services/hermesEvaluator.js';
import { PlatformSource, RawJob } from './types/job.js';

async function runFilterTests() {
  console.log('======================================================');
  console.log('🧪 TESTE DE BLINDAGEM ANTI-RUÍDO & VAGAS NÃO-TECH');
  console.log('======================================================\n');

  // 1. Limpeza de Título (cleanJobTitle)
  console.log('[1/4] Testando normalização de títulos (cleanJobTitle)...');
  assert.strictEqual(
    cleanJobTitle('Analista de Recrutamento e SeleçãoCandidatar-se'),
    'Analista de Recrutamento e Seleção'
  );
  assert.strictEqual(
    cleanJobTitle('ENCARREGADO LOGÍSTICOCandidatar-se'),
    'ENCARREGADO LOGÍSTICO'
  );
  assert.strictEqual(
    cleanJobTitle('Desenvolvedor(a) Full Stack'),
    'Desenvolvedor Full Stack'
  );
  assert.strictEqual(
    cleanJobTitle('Engenheiro(a/o) de Software'),
    'Engenheiro de Software'
  );
  assert.strictEqual(
    cleanJobTitle('Senior Swift & SwiftUI DeveloperNOVA'),
    'Senior Swift & SwiftUI Developer'
  );
  console.log('  ✓ cleanJobTitle normalizou botões, parênteses de gênero e badges corretamente.');

  // 2. Rejeição Estrita de Vagas Não-Tech e CNC
  console.log('\n[2/4] Testando rejeição estrita de títulos não-tech e usinagem/CNC...');
  const nonTechTestCases = [
    // CNC e Usinagem (Hard Exclusion)
    'Programador CNC',
    'Programador cnc',
    'Operador / Programador de Torno CNC',
    'Programador e Operador Cnc',
    'PROGRAMADOR CAM',
    'Programador de Centro de Usinagem CNC',
    'Ajudante de Torno',
    'TÉCNICO DE MONTAGEM DE SERVIDORES',
    // RH e Recrutamento
    'Analista de Recrutamento e SeleçãoCandidatar-se',
    'Estágio Recrutamento e SeleçãoCandidatar-se',
    'Auxiliar de Pessoas (RH)Candidatar-se',
    'GESTOR DE RECURSOS HUMANOSCandidatar-se',
    'Analista de Departamento Pessoal',
    // Logística e Estoque
    'ENCARREGADO LOGÍSTICOCandidatar-se',
    'OPERADOR LOGÍSTICOCandidatar-se',
    'AUXILIAR DE LOGISTICACandidatar-se',
    '5 VAGAS DE ESTÁGIO EM ENSINO MÉDIO (ESTOQUE E LOGÍSTICA) - VGABZR270Candidatar-se',
    'Almoxarife / Estoquista',
    // Fiscal, Contábil e Financeiro
    'Encarregado(a) de Departamento FiscalCandidatar-se',
    'Analista FiscalCandidatar-se',
    'ESTÁGIO - CONTABILIDADECandidatar-se',
    'Auxiliar Financeiro e Contas a Pagar',
    // Administrativo e Recepção
    'ASSISTENTE ADMINSITRATIVOCandidatar-se',
    'ESTAGIÁRIO ADMINISTRATIVOCandidatar-se',
    'Recepcionista e Atendente',
    'Host CorporativoCandidatar-se',
    'Locutor(a) de LojaCandidatar-se',
    // Vendas e Comercial
    'Consultor(a) de VendasCandidatar-se',
    'Vendedor Interno / Balconista',
    'Operador de Caixa e Atendimento',
    'BDRCandidatar-se',
    // Marketing não-tech
    'ESTAGIÁRIO DE MARKETINGCandidatar-se',
    'ESTÁGIO EM MARKETING / PUBLICIDADE E PROPAGANDA - VGACNR309Candidatar-se',
    'Social Media e Copywriter',
  ];

  for (const title of nonTechTestCases) {
    const isTech = isTechJob(title);
    assert.strictEqual(
      isTech,
      false,
      `ERRO: O título não-tech "${title}" DEVERIA ser rejeitado, mas foi aprovado como tech.`
    );
  }
  console.log(`  ✓ Todos os ${nonTechTestCases.length} cargos não-tech foram categoricamente REJEITADOS.`);

  // 3. Aprovação de Vagas Técnicas Legítimas
  console.log('\n[3/4] Testando aprovação de cargos legítimos de TI e Software...');
  const techTestCases = [
    'Desenvolvedor Full Stack Júnior',
    'Desenvolvedor(a) Full Stack Sênior | Node.js + Angular',
    'Engenheiro(a) de Software | Assistente e Júnior',
    'Desenvolvedor Mobile Android I - Serviços Financeiros',
    '11014 - Desenvolvedor Salesforce Marketing Cloud (SFMC) - Sênior',
    'Pessoa Desenvolvedora BackEnd NodeJs Especialista I (Venda Direta)',
    'Analista de Sistemas Júnior',
    'Analista Sênior de Dados - Híbrido',
    'Cientista de Dados Pleno',
    'DevOps / SRE Engineer',
    'QA Analyst Pleno',
    'Tech Lead Automação e IA | Híbrido',
    'Desenvolvedor CRM Jr - Automação e Integrações (Marketing)',
    'Solutions Engineer',
    'Senior Swift & SwiftUI DeveloperNOVA',
    'Técnico de Suporte de TI',
    'Analista de Segurança da Informação',
    '[Workana] Desenvolvimento de Sistema de Atendimento Multi-Whatsapp',
  ];

  for (const title of techTestCases) {
    const isTech = isTechJob(title);
    assert.strictEqual(
      isTech,
      true,
      `ERRO: O cargo técnico "${title}" DEVERIA ser aprovado, mas foi rejeitado.`
    );
  }
  console.log(`  ✓ Todos os ${techTestCases.length} cargos técnicos de software foram APROVADOS.`);

  // 4. Teste Heurístico do HermesEvaluator
  console.log('\n[4/4] Testando HermesEvaluator.evaluateHeuristic()...');
  const evaluator = new HermesEvaluator();

  const fakeNonTechJob: RawJob = {
    title: 'Analista de Recrutamento e SeleçãoCandidatar-se',
    company: 'Empresa Exemplo',
    platform: PlatformSource.RECRUTEI_EMPREGOS,
    url: 'https://example.com/rh-1',
    description: 'Buscamos analista de RH para atuar com atração e seleção.',
    publishedAt: new Date(),
  };

  const fakeCncJob: RawJob = {
    title: 'Programador CNC',
    company: 'Metalúrgica Exemplo',
    platform: PlatformSource.BEBEE,
    url: 'https://example.com/cnc-1',
    description: 'Operação e programação de torno CNC e fresadora.',
    publishedAt: new Date(),
  };

  const fakeTechJob: RawJob = {
    title: 'Desenvolvedor Full Stack Júnior',
    company: 'TechCorp',
    platform: PlatformSource.LINKEDIN,
    url: 'https://example.com/dev-1',
    description: 'Desenvolvimento React e Node.js para aplicações web.',
    publishedAt: new Date(),
  };

  const resNonTech = evaluator.evaluateHeuristic(fakeNonTechJob);
  assert.strictEqual(resNonTech.isTechSoftware, false);
  assert.strictEqual(resNonTech.category, 'Não-Tech');
  assert.strictEqual(resNonTech.isJuniorFullStack, false);

  const resCnc = evaluator.evaluateHeuristic(fakeCncJob);
  assert.strictEqual(resCnc.isTechSoftware, false);
  assert.strictEqual(resCnc.category, 'Não-Tech');
  assert.strictEqual(resCnc.isJuniorFullStack, false);

  const resTech = evaluator.evaluateHeuristic(fakeTechJob);
  assert.strictEqual(resTech.isTechSoftware, true);
  assert.notStrictEqual(resTech.category, 'Não-Tech');
  assert.strictEqual(resTech.isJuniorFullStack, true);

  console.log('  ✓ HermesEvaluator rejeitou vagas não-tech e CNC no fallback heurístico com sucesso.');

  console.log('\n======================================================');
  console.log('🎉 TODOS OS TESTES ANTI-RUÍDO PASSARAM COM SUCESSO!');
  console.log('======================================================\n');
}

runFilterTests().catch((err) => {
  console.error('❌ FALHA NOS TESTES ANTI-RUÍDO:', err);
  process.exit(1);
});
