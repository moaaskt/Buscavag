import {
  cleanGeoText,
  extractStateUF,
  parseCanonicalLocation,
  BRAZILIAN_UFS,
} from './utils/geoParser';
import { JobRepository } from './db/repository';
import { db, initDatabase } from './db/index';
import { RawJob, PlatformSource } from './types/job';
import { normalizeDatabaseLocations } from './scripts/normalize-locations';

async function runPhase93Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 93 (NORMALIZADOR GEOGRÁFICO CANÔNICO & PARSER ESTRITO DE UF) ---');
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
  const repo = new JobRepository();

  // ====================================================
  // 1. TESTES UNITÁRIOS DE UFS E BLOQUEIO DE FALSOS POSITIVOS
  // ====================================================

  // 1.1 Cobertura de todas as 27 UFs brasileiras
  for (const [uf, stateName] of Object.entries(BRAZILIAN_UFS)) {
    assert(extractStateUF(stateName) === uf, `extractStateUF deve reconhecer o nome do estado '${stateName}' como UF '${uf}'`);
    assert(extractStateUF(`Cidade Qualquer - ${uf}`) === uf, `extractStateUF deve reconhecer sigla '${uf}' delimitada`);
  }

  // 1.2 Barreira estrita contra falsos positivos (palavras que contêm siglas de UF)
  const falsePositiveCandidates = [
    'Desenvolvedor JavaScript Full Stack',
    'Analista Fiscal Pleno',
    'Especialista em Spring Boot e Java',
    'Engenheiro de Software Geral',
    'Arquiteto de Soluções Cloud AWS',
    'Programador Front End Senior',
    'Consultor Comercial B2B',
  ];

  for (const text of falsePositiveCandidates) {
    const detected = extractStateUF(text);
    assert(
      detected === undefined,
      `extractStateUF não deve extrair UF de palavra comum em: "${text}" (retornou: ${detected})`
    );
  }

  // ====================================================
  // 2. DESAMBIGUAÇÃO DETERMINÍSTICA DE HOMÔNIMOS (SÃO JOSÉ)
  // ====================================================

  // 2.1 São José via conector regional de Santa Catarina
  const saoJoseSC1 = parseCanonicalLocation('São José', PlatformSource.SAO_JOSE);
  assert(saoJoseSC1.city === 'São José' && saoJoseSC1.state === 'SC', 'São José via conector sao_jose deve ser classificado em SC');

  const saoJoseSC2 = parseCanonicalLocation('São José', PlatformSource.VAGAS_FLORIPA);
  assert(saoJoseSC2.city === 'São José' && saoJoseSC2.state === 'SC', 'São José via conector vagas_floripa deve ser classificado em SC');

  const saoJoseSC3 = parseCanonicalLocation('São José - SC', PlatformSource.GUPY);
  assert(saoJoseSC3.city === 'São José' && saoJoseSC3.state === 'SC', 'São José com SC explícito deve ser classificado em SC');

  // 2.2 São José dos Campos / Rio Preto (SP)
  const saoJoseSP1 = parseCanonicalLocation('São José dos Campos', PlatformSource.GUPY);
  assert(saoJoseSP1.city === 'São José dos Campos' && saoJoseSP1.state === 'SP', 'São José dos Campos deve ser classificado em SP');

  const saoJoseSP2 = parseCanonicalLocation('São José do Rio Preto', PlatformSource.INDEED);
  assert(saoJoseSP2.city === 'São José do Rio Preto' && saoJoseSP2.state === 'SP', 'São José do Rio Preto deve ser classificado em SP');

  const saoJoseSP3 = parseCanonicalLocation('São José, SP', PlatformSource.LINKEDIN);
  assert(saoJoseSP3.city === 'São José dos Campos' && saoJoseSP3.state === 'SP', 'São José com sigla SP deve desambiguar para SP');

  // 2.3 São José dos Pinhais (PR)
  const saoJosePR1 = parseCanonicalLocation('São José dos Pinhais', PlatformSource.GUPY);
  assert(saoJosePR1.city === 'São José dos Pinhais' && saoJosePR1.state === 'PR', 'São José dos Pinhais deve ser classificado em PR');

  const saoJosePR2 = parseCanonicalLocation('São José, PR', PlatformSource.INDEED);
  assert(saoJosePR2.city === 'São José dos Pinhais' && saoJosePR2.state === 'PR', 'São José com sigla PR deve desambiguar para PR');

  // ====================================================
  // 3. INFERÊNCIA DE POLOS TECNOLÓGICOS DE SANTA CATARINA
  // ====================================================

  const scPoles = [
    { input: 'Florianópolis', expectedCity: 'Florianópolis', expectedState: 'SC' },
    { input: 'Floripa', expectedCity: 'Florianópolis', expectedState: 'SC' },
    { input: 'Palhoça', expectedCity: 'Palhoça', expectedState: 'SC' },
    { input: 'Palhoca - Santa Catarina', expectedCity: 'Palhoça', expectedState: 'SC' },
    { input: 'Joinville', expectedCity: 'Joinville', expectedState: 'SC' },
    { input: 'Blumenau', expectedCity: 'Blumenau', expectedState: 'SC' },
    { input: 'Itajaí', expectedCity: 'Itajaí', expectedState: 'SC' },
    { input: 'Balneário Camboriú', expectedCity: 'Balneário Camboriú', expectedState: 'SC' },
    { input: 'Criciúma', expectedCity: 'Criciúma', expectedState: 'SC' },
    { input: 'Chapecó', expectedCity: 'Chapecó', expectedState: 'SC' },
    { input: 'Tubarão', expectedCity: 'Tubarão', expectedState: 'SC' },
    { input: 'Biguaçu', expectedCity: 'Biguaçu', expectedState: 'SC' },
  ];

  for (const pole of scPoles) {
    const res = parseCanonicalLocation(pole.input, PlatformSource.LINKEDIN);
    assert(
      res.city === pole.expectedCity && res.state === pole.expectedState,
      `Polo catarinense '${pole.input}' deve inferir cidade '${pole.expectedCity}' e UF '${pole.expectedState}' (obteve: ${res.city}, ${res.state})`
    );
  }

  // ====================================================
  // 4. CAPITAIS E POLOS NACIONAIS
  // ====================================================

  const nationalPoles = [
    { input: 'São Paulo - SP', expectedCity: 'São Paulo', expectedState: 'SP' },
    { input: 'Campinas', expectedCity: 'Campinas', expectedState: 'SP' },
    { input: 'Curitiba, PR', expectedCity: 'Curitiba', expectedState: 'PR' },
    { input: 'Porto Alegre - RS', expectedCity: 'Porto Alegre', expectedState: 'RS' },
    { input: 'Belo Horizonte', expectedCity: 'Belo Horizonte', expectedState: 'MG' },
    { input: 'Rio de Janeiro / RJ', expectedCity: 'Rio de Janeiro', expectedState: 'RJ' },
    { input: 'Brasília - DF', expectedCity: 'Brasília', expectedState: 'DF' },
  ];

  for (const pole of nationalPoles) {
    const res = parseCanonicalLocation(pole.input, PlatformSource.LINKEDIN);
    assert(
      res.city === pole.expectedCity && res.state === pole.expectedState,
      `Polo nacional '${pole.input}' deve inferir '${pole.expectedCity}, ${pole.expectedState}'`
    );
  }

  // ====================================================
  // 5. NORMALIZAÇÃO DE VAGAS REMOTAS
  // ====================================================

  const remoteCases = [
    'Remoto',
    '100% Remoto',
    'Home Office',
    'Teletrabalho',
    'Anywhere',
    'Remoto / Brasil',
    '',
    null,
  ];

  for (const rc of remoteCases) {
    const res = parseCanonicalLocation(rc, PlatformSource.GUPY);
    assert(res.isRemote === true, `Localização '${rc}' deve ser marcada como isRemote: true`);
    assert(
      res.canonicalLocation === 'Remoto' || res.canonicalLocation === 'Remoto / Brasil',
      `Localização '${rc}' deve ter canonicalLocation padronizado (obteve: ${res.canonicalLocation})`
    );
  }

  // ====================================================
  // 6. VALIDAÇÃO DE SCHEMA E ÍNDICES NO BANCO SQLITE
  // ====================================================

  const jobCols = (db.pragma('table_info(jobs)') as Array<{ name: string }>).map((c) => c.name);
  assert(jobCols.includes('city'), "Tabela 'jobs' deve conter a coluna 'city'");
  assert(jobCols.includes('state'), "Tabela 'jobs' deve conter a coluna 'state'");

  const jobIndexes = (db.pragma('index_list(jobs)') as Array<{ name: string }>).map((idx) => idx.name);
  assert(jobIndexes.includes('idx_jobs_city'), "Tabela 'jobs' deve possuir o índice 'idx_jobs_city'");
  assert(jobIndexes.includes('idx_jobs_state'), "Tabela 'jobs' deve possuir o índice 'idx_jobs_state'");

  // ====================================================
  // 7. INGESTÃO NO REPOSITÓRIO & PERSISTÊNCIA CANÔNICA
  // ====================================================

  const testJob1: RawJob = {
    title: 'Desenvolvedor Full Stack React/Node Teste Phase 93',
    company: 'TechFloripa Inovação',
    platform: PlatformSource.VAGAS_FLORIPA,
    url: 'https://vagasfloripa.com.br/vaga-teste-phase93-1',
    description: 'Vaga presencial no centro tecnológico de Florianópolis com stack moderna.',
    publishedAt: new Date(),
    location: 'Florianópolis - SC',
  };

  const inserted1 = repo.insert(testJob1, true, 88);
  assert(inserted1.city === 'Florianópolis', 'repo.insert deve persistir city normalizada como Florianópolis');
  assert(inserted1.state === 'SC', 'repo.insert deve persistir state normalizado como SC');
  assert(inserted1.location === 'Florianópolis, SC', 'repo.insert deve persistir location canônico');

  const testJob2: RawJob = {
    title: 'Engenheiro Backend Go Teste Phase 93',
    company: 'Empresa São José Tecnologia',
    platform: PlatformSource.SAO_JOSE,
    url: 'https://saojose.sc.gov.br/vaga-teste-phase93-2',
    description: 'Oportunidade para atuar em São José na Grande Florianópolis.',
    publishedAt: new Date(),
    location: 'São José',
  };

  const inserted2 = repo.insert(testJob2, true, 92);
  assert(inserted2.city === 'São José', 'repo.insert deve desambiguar São José para SC');
  assert(inserted2.state === 'SC', 'repo.insert deve persistir state SC para São José catarinense');

  // ====================================================
  // 8. FILTROS ESTRUTURADOS NO REPOSITÓRIO (CITY / STATE / LOCATION)
  // ====================================================

  // Busca estrita por city
  const jobsFloripa = repo.getAllJobs({ city: 'Florianópolis' });
  assert(
    jobsFloripa.some((j) => j.id === inserted1.id),
    'getAllJobs com city: Florianópolis deve retornar a vaga criada'
  );

  // Busca estrita por state
  const jobsSC = repo.getAllJobs({ state: 'SC' });
  assert(
    jobsSC.some((j) => j.id === inserted1.id) && jobsSC.some((j) => j.id === inserted2.id),
    'getAllJobs com state: SC deve retornar as vagas criadas'
  );

  // Busca canônica via location 'sao_jose'
  const jobsSaoJose = repo.getAllJobs({ location: 'sao_jose' });
  assert(
    jobsSaoJose.some((j) => j.id === inserted2.id),
    'getAllJobs com location: sao_jose deve retornar a vaga de São José'
  );

  // Limpeza das vagas de teste
  repo.deleteJobs([inserted1.id, inserted2.id]);

  // ====================================================
  // 9. EXECUÇÃO DO SCRIPT DE NORMALIZAÇÃO RETROATIVA
  // ====================================================

  const normStats = normalizeDatabaseLocations();
  assert(normStats.totalAnalyzed > 0, 'normalizeDatabaseLocations deve analisar as vagas do banco');
  console.log(`Auditoria do banco: ${normStats.totalAnalyzed} vagas analisadas, ${normStats.withCity} com cidade, ${normStats.withState} com UF, ${normStats.remoteCount} remotas.`);

  // Validação de integridade: após a migração, não deve haver vagas ativas sem cidade/estado que não sejam remotas
  const sampleJobs = repo.getAllJobs();
  for (const job of sampleJobs.slice(0, 30)) {
    if (job.city) {
      assert(job.state !== undefined, `Vaga com cidade '${job.city}' deve possuir UF preenchida`);
    }
  }

  console.log(`\n🎉 TODOS OS ${passed}/${total} TESTES DA PHASE 93 FORAM CONCLUÍDOS COM 100% DE SUCESSO!`);
}

runPhase93Tests().catch((err) => {
  console.error('Erro fatal nos testes da Phase 93:', err);
  process.exit(1);
});
