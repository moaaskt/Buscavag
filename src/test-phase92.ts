import {
  cleanText,
  slugifyTitle,
  slugifyCompany,
  slugifyLocation,
  generateJobFingerprint,
  getJobFingerprintDetails,
} from './utils/fingerprint';
import { JobRepository } from './db/repository';
import { db, initDatabase } from './db/index';
import { RawJob, PlatformSource } from './types/job';
import { deduplicateDatabase } from './scripts/deduplicate-jobs';

async function runPhase92Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 92 (FINGERPRINTING & DEDUPLICAÇÃO MULTI-FONTE) ---');
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
  // 1. TESTES UNITÁRIOS DE NORMALIZAÇÃO DE SLUGS
  // ====================================================

  // 1.1 cleanText
  assert(cleanText('Açúcar e Café') === 'acucar e cafe', 'cleanText deve remover diacríticos e converter para minúsculas');
  assert(cleanText('  DESENVOLVEDOR  ') === 'desenvolvedor', 'cleanText deve aparar espaços extras');

  // 1.2 slugifyTitle (Invariância de ruídos)
  const title1 = '[Vaga] Desenvolvedor Full Stack Jr (Remoto)';
  const title2 = 'Desenvolvedor Full Stack Jr';
  assert(slugifyTitle(title1) === 'desenvolvedor-full-stack-jr', 'slugifyTitle deve limpar tags [Vaga] e (Remoto)');
  assert(slugifyTitle(title1) === slugifyTitle(title2), 'slugifyTitle deve gerar o mesmo slug para variações com ruído de tags');

  const titlePcd1 = 'Desenvolvedor Frontend Pleno - VAGA EXCLUSIVA PARA PCD';
  const titlePcd2 = 'Desenvolvedor Frontend Pleno (PCD)';
  const titlePcd3 = 'Desenvolvedor Frontend Pleno';
  assert(slugifyTitle(titlePcd1) === slugifyTitle(titlePcd2), 'slugifyTitle deve gerar mesmo slug para variações PCD');
  assert(slugifyTitle(titlePcd1) === slugifyTitle(titlePcd3), 'slugifyTitle deve unificar título com menção PCD ao título limpo');

  const titleCandidatar = 'Engenheiro de Software BackendCandidatar-se';
  assert(slugifyTitle(titleCandidatar) === 'engenheiro-de-software-backend', 'slugifyTitle deve expurgar "Candidatar-se" grudado no título');

  // 1.3 slugifyCompany (Invariância de sufixos societários e plataformas)
  const comp1 = 'Acme Tech Ltda.';
  const comp2 = 'Acme Tech S.A.';
  const comp3 = 'Acme Tech ME';
  const comp4 = 'Acme Tech';
  assert(slugifyCompany(comp1) === 'acme-tech', 'slugifyCompany deve remover sufixo "Ltda."');
  assert(slugifyCompany(comp1) === slugifyCompany(comp2), 'slugifyCompany deve igualar "Ltda." e "S.A."');
  assert(slugifyCompany(comp1) === slugifyCompany(comp3), 'slugifyCompany deve igualar "Ltda." e "ME"');
  assert(slugifyCompany(comp1) === slugifyCompany(comp4), 'slugifyCompany deve igualar empresa com e sem sufixo jurídico');

  const compFacebook = 'Facebook: Programadores Brasil';
  const compClean = 'Programadores Brasil';
  assert(slugifyCompany(compFacebook) === slugifyCompany(compClean), 'slugifyCompany deve limpar prefixo de agregação "Facebook:"');

  // 1.4 slugifyLocation (Invariância geográfica e de regime)
  assert(slugifyLocation('Remoto') === 'remoto', 'slugifyLocation deve normalizar "Remoto"');
  assert(slugifyLocation('100% Remoto / Home Office') === 'remoto', 'slugifyLocation deve normalizar variações de home office');
  assert(slugifyLocation(null) === 'remoto', 'slugifyLocation deve atribuir slug "remoto" para localização nula');
  assert(slugifyLocation(undefined) === 'remoto', 'slugifyLocation deve atribuir slug "remoto" para localização indefinida');

  const loc1 = 'Florianópolis - SC';
  const loc2 = 'Florianópolis, SC';
  const loc3 = 'Florianopolis / Santa Catarina';
  assert(slugifyLocation(loc1) === 'florianopolis-sc', 'slugifyLocation deve gerar "florianopolis-sc" com hífen');
  assert(slugifyLocation(loc1) === slugifyLocation(loc2), 'slugifyLocation deve igualar "Cidade - UF" e "Cidade, UF"');
  assert(slugifyLocation(loc1) === slugifyLocation(loc3), 'slugifyLocation deve igualar UF com Estado por extenso');

  // Desambiguação geográfica estrita
  assert(slugifyLocation('Florianópolis - SC') !== slugifyLocation('Joinville - SC'), 'slugifyLocation deve diferenciar cidades distintas');
  assert(slugifyLocation('São José - SC') !== slugifyLocation('São Paulo - SP'), 'slugifyLocation deve diferenciar estados distintos');

  // ====================================================
  // 2. TESTES DE GERAÇÃO DETERMINÍSTICA DO FINGERPRINT
  // ====================================================
  const fp1 = generateJobFingerprint(
    '[Vaga] Desenvolvedor Node.js Sênior (Remoto)',
    'TechCorp Brasil Ltda.',
    'Remoto / Brasil'
  );
  const fp2 = generateJobFingerprint(
    'Desenvolvedor Node.js Sênior',
    'TechCorp',
    'Remoto'
  );
  assert(fp1.length === 64, 'generateJobFingerprint deve gerar hash SHA-256 de 64 caracteres');
  assert(fp1 === fp2, 'generateJobFingerprint deve ser idêntico para a mesma vaga vinda de fontes diferentes com ruídos');

  const fpDifferentRole = generateJobFingerprint(
    'Desenvolvedor Python Sênior',
    'TechCorp',
    'Remoto'
  );
  assert(fp1 !== fpDifferentRole, 'generateJobFingerprint deve ser diferente para cargos distintos');

  const fpDifferentCompany = generateJobFingerprint(
    'Desenvolvedor Node.js Sênior',
    'OutraEmpresa',
    'Remoto'
  );
  assert(fp1 !== fpDifferentCompany, 'generateJobFingerprint deve ser diferente para empresas distintas');

  const details = getJobFingerprintDetails(
    'Desenvolvedor React Jr',
    'Startup X',
    'Florianópolis - SC'
  );
  assert(details.slugTitle === 'desenvolvedor-react-jr', 'getJobFingerprintDetails deve expor slugTitle correto');
  assert(details.slugCompany === 'startup-x', 'getJobFingerprintDetails deve expor slugCompany correto');
  assert(details.slugLocation === 'florianopolis-sc', 'getJobFingerprintDetails deve expor slugLocation correto');
  assert(details.canonicalString === 'desenvolvedor-react-jr|startup-x|florianopolis-sc', 'canonicalString deve unir tupla com pipe');

  // ====================================================
  // 3. TESTES DE INTEGRAÇÃO COM JOB REPOSITORY & SQLITE
  // ====================================================
  const uniqueSuffix = Date.now();
  const testJobLinkedIn: RawJob = {
    title: `Engenheiro de Software Cloud ${uniqueSuffix}`,
    company: `Nuvem Soluções ${uniqueSuffix}`,
    location: 'Florianópolis - SC',
    platform: PlatformSource.LINKEDIN,
    url: `https://linkedin.com/jobs/view/test-${uniqueSuffix}`,
    description: 'Vaga para atuação em infraestrutura em nuvem AWS, Kubernetes e Terraform.',
    publishedAt: new Date(),
  };

  // 3.1. Antes de inserir, não deve existir
  assert(
    !repo.exists(testJobLinkedIn.url, testJobLinkedIn.company, testJobLinkedIn.title, testJobLinkedIn.platform, testJobLinkedIn.location),
    'repo.exists deve retornar false antes da inserção da vaga'
  );

  // 3.2. Inserção
  const inserted = repo.insert(testJobLinkedIn, true, 90, 'Vaga aprovada');
  assert(typeof inserted.fingerprint === 'string' && inserted.fingerprint.length === 64, 'repo.insert deve persistir e retornar fingerprint SHA-256');

  // 3.3. Busca por fingerprint
  const foundByFp = repo.findByFingerprint(inserted.fingerprint!);
  assert(foundByFp !== null, 'repo.findByFingerprint deve localizar o registro recém-inserido');
  assert(foundByFp?.id === inserted.id, 'findByFingerprint deve retornar a mesma vaga por ID');
  assert(foundByFp?.fingerprint === inserted.fingerprint, 'findByFingerprint deve ter o fingerprint gravado no SQLite');

  // 3.4. DEDUPLICAÇÃO MULTI-FONTE: Mesma vaga vinda do Indeed com URL e plataforma completamente diferentes
  const testJobIndeed: RawJob = {
    title: `Engenheiro de Software Cloud ${uniqueSuffix} (Remoto/SC)`,
    company: `Nuvem Soluções ${uniqueSuffix} Ltda.`,
    location: 'Florianópolis, SC',
    platform: PlatformSource.INDEED,
    url: `https://br.indeed.com/viewjob?jk=diff-url-${uniqueSuffix}`,
    description: 'Mesma descrição da vaga publicada no Indeed.',
    publishedAt: new Date(),
  };

  const detectedDuplicate = repo.exists(
    testJobIndeed.url,
    testJobIndeed.company,
    testJobIndeed.title,
    testJobIndeed.platform,
    testJobIndeed.location
  );
  assert(detectedDuplicate === true, 'repo.exists DEVE detectar duplicata cross-source pelo fingerprint, mesmo com URL e plataforma distintas!');

  // 3.5. DEDUPLICAÇÃO MULTI-FONTE: Mesma vaga vinda do Recrutae
  const testJobRecrutae: RawJob = {
    title: `[Vaga] Engenheiro de Software Cloud ${uniqueSuffix}`,
    company: `Nuvem Soluções ${uniqueSuffix}`,
    location: 'Florianópolis / Santa Catarina',
    platform: PlatformSource.RECRUTEI_EMPREGOS,
    url: `https://recrutei.com.br/vaga/${uniqueSuffix}`,
    description: 'Mesma vaga no Recrutei.',
    publishedAt: new Date(),
  };

  const detectedDuplicateRecrutae = repo.exists(
    testJobRecrutae.url,
    testJobRecrutae.company,
    testJobRecrutae.title,
    testJobRecrutae.platform,
    testJobRecrutae.location
  );
  assert(detectedDuplicateRecrutae === true, 'repo.exists DEVE detectar duplicata vinda do Recrutae via fingerprint!');

  // Limpeza do teste
  db.prepare('DELETE FROM jobs WHERE id = ?').run(inserted.id);

  // ====================================================
  // 4. TESTES DO SCHEMA SQLITE & SCRIPT DE HIGIENIZAÇÃO
  // ====================================================
  // 4.1. Verificar se a coluna e o índice existem no SQLite
  const tableCols = (db.pragma('table_info(jobs)') as Array<{ name: string }>).map((c) => c.name);
  assert(tableCols.includes('fingerprint'), 'A tabela jobs do SQLite deve conter a coluna fingerprint');

  const indexList = (db.pragma('index_list(jobs)') as Array<{ name: string }>).map((idx) => idx.name);
  assert(indexList.includes('idx_jobs_fingerprint'), 'A tabela jobs do SQLite deve conter o índice idx_jobs_fingerprint');

  // 4.2. Executar script de deduplicação e validar integridade do acervo
  const deduplicateReport = deduplicateDatabase();
  assert(typeof deduplicateReport.totalExamined === 'number', 'deduplicateDatabase deve retornar totalExamined');
  assert(typeof deduplicateReport.uniqueJobsRemaining === 'number', 'deduplicateDatabase deve retornar uniqueJobsRemaining');
  assert(deduplicateReport.duplicateGroupsFound === 0, 'Após a migração, não deve haver nenhum grupo de duplicatas remanescente');

  // 4.3. Consulta direta no banco garantindo unicidade total
  const remainingDuplicateGroups = db
    .prepare(`
      SELECT fingerprint, COUNT(*) as count 
      FROM jobs 
      WHERE fingerprint IS NOT NULL AND fingerprint != ''
      GROUP BY fingerprint 
      HAVING count > 1
    `)
    .all();
  assert(remainingDuplicateGroups.length === 0, 'O banco SQLite deve possuir rigorosamente 0 duplicatas de fingerprint');

  const jobsMissingFp = db
    .prepare("SELECT COUNT(*) as count FROM jobs WHERE fingerprint IS NULL OR fingerprint = ''")
    .get() as { count: number };
  assert(jobsMissingFp.count === 0, 'O banco SQLite deve possuir 0 vagas com fingerprint nulo ou vazio');

  console.log(`\n======================================================`);
  console.log(`  RESULTADO DA SUÍTE DA PHASE 92:`);
  console.log(`  Total de testes executados: ${total}`);
  console.log(`  Testes aprovados: ${passed}`);
  console.log(`  Testes reprovados: ${total - passed}`);
  console.log(`  Status: 100% CONCLUÍDO E APROVADO ✓`);
  console.log(`======================================================\n`);
}

runPhase92Tests().catch((err) => {
  console.error('Erro ao executar suíte da Phase 92:', err);
  process.exit(1);
});
