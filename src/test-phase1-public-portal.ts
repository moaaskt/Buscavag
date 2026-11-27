import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import Database from 'better-sqlite3';
import { isTechJob } from './config/jobFilters';
import { generateJobFingerprint } from './utils/fingerprint';
import {
  buildPublicJobSlug,
  buildVagasHref,
  computePaginationPages,
  formatPlatformLabel,
  formatRelativePublishedAtPtBr,
  getSafeExternalJobUrl,
  normalizeOptionalJobField,
} from './utils/publicJobFormatters';

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function runPhase1PublicPortalTests() {
  console.log('\n======================================================');
  console.log('  BUSCAVAG - TESTES PHASE 1: PORTAL PÚBLICO & HIGIENE');
  console.log('======================================================\n');

  const realDbPath = path.resolve(process.cwd(), 'buscavag.db');
  const realDbExists = fs.existsSync(realDbPath);
  const preRealHash = realDbExists ? sha256File(realDbPath) : null;
  let preRealCount: number | null = null;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buscavag-phase1-test-'));
  const tempDbPath = path.join(tempDir, 'test-buscavag.db');

  let dbModule: typeof import('./db/index') | null = null;

  try {
    // 1. Clonar buscavag.db de forma segura e somente leitura para o diretório temporário isolado
    if (realDbExists) {
      const realRoDb = new Database(realDbPath, { readonly: true, fileMustExist: true });
      try {
        const countRow = realRoDb.prepare('SELECT COUNT(*) AS cnt FROM jobs').get() as { cnt: number };
        preRealCount = Number(countRow.cnt);
        await realRoDb.backup(tempDbPath);
      } finally {
        realRoDb.close();
      }
      console.log(`  ✅ [SETUP] Clone isolado criado em os.tmpdir() (${preRealCount} vagas copiadas via backup somente leitura)`);
    } else {
      console.log('  ✅ [SETUP] buscavag.db ausente; utilizando banco temporário novo em os.tmpdir()');
    }

    // Define DATABASE_PATH ANTES de qualquer importação dinâmica de ./db/index
    process.env.DATABASE_PATH = tempDbPath;

    dbModule = await import('./db/index');
    const { db, initDatabase } = dbModule;
    initDatabase();

    const dbList = db.pragma('database_list') as Array<{ name: string; file: string }>;
    assert.strictEqual(
      path.resolve(dbList[0].file),
      path.resolve(tempDbPath),
      'Singleton db DEVE apontar estritamente para a cópia temporária isolada'
    );

    const { PublicJobRepository } = await import('./db/publicJobRepository');
    const { GET: getPublicJobs } = await import('./app/api/public/jobs/route');
    const {
      deduplicateDatabase,
      createVerifiedBackupAndRestoreTest,
      computeJobsSnapshot,
      verifySqliteIntegrityAndFk,
    } = await import('./scripts/deduplicate-jobs');
    const { normalizeDatabaseLocations } = await import('./scripts/normalize-locations');
    const { sanitizeDatabase } = await import('../scripts/sanitize-db-programming');

    // =========================================================================
    // TESTE 2: Dry-Run Zero-Write, --apply Guard & Backup/Restore/Hash Integrity
    // =========================================================================
    console.log('\n--- 2. Dry-Run Read-Only, Guardas --confirm-reviewed e Backup/Restore/Hash ---');

    const snapshotBeforeDryRun = computeJobsSnapshot(db);
    const normDry = await normalizeDatabaseLocations({ dbPath: tempDbPath, apply: false });
    const dedupDry = await deduplicateDatabase({ dbPath: tempDbPath, apply: false });
    const sanDry = await sanitizeDatabase({ dbPath: tempDbPath, apply: false });

    assert.strictEqual(normDry.mode, 'dry-run', 'normalizeDatabaseLocations deve iniciar em dry-run');
    assert.strictEqual(normDry.updatedCount, 0, 'normalize dry-run deve realizar 0 atualizações');
    assert.strictEqual(dedupDry.mode, 'dry-run', 'deduplicateDatabase deve iniciar em dry-run');
    assert.strictEqual(dedupDry.duplicatesDeleted, 0, 'dedup dry-run deve deletar 0 registros');
    assert.strictEqual(sanDry.mode, 'dry-run', 'sanitizeDatabase deve iniciar em dry-run');
    assert.strictEqual(sanDry.archivedCount, 0, 'sanitize dry-run deve arquivar 0 registros');

    const snapshotAfterDryRun = computeJobsSnapshot(db);
    assert.strictEqual(
      snapshotAfterDryRun.sha256,
      snapshotBeforeDryRun.sha256,
      'Modo dry-run não pode alterar um único bit lógico do banco'
    );
    console.log('  ✅ [PASS] Todos os 3 scripts em --dry-run executaram 0 escritas');

    await assert.rejects(
      () => normalizeDatabaseLocations({ dbPath: tempDbPath, apply: true, confirmReviewed: false }),
      /confirm-reviewed/,
      'normalizeDatabaseLocations com apply=true sem confirmReviewed deve lançar erro'
    );
    await assert.rejects(
      () => deduplicateDatabase({ dbPath: tempDbPath, apply: true, confirmReviewed: false }),
      /confirm-reviewed/,
      'deduplicateDatabase com apply=true sem confirmReviewed deve lançar erro'
    );
    await assert.rejects(
      () => sanitizeDatabase({ dbPath: tempDbPath, apply: true, confirmReviewed: false }),
      /confirm-reviewed/,
      'sanitizeDatabase com apply=true sem confirmReviewed deve lançar erro'
    );
    console.log('  ✅ [PASS] --apply sem --confirm-reviewed bloqueado em todos os scripts');

    const verifiedBackup = await createVerifiedBackupAndRestoreTest(tempDbPath);
    assert.strictEqual(verifiedBackup.restoredCheckPassed, true, 'Teste de restauração deve passar');
    assert.ok(fs.existsSync(verifiedBackup.backupPath), 'Arquivo de backup verificado deve existir');

    const backupRo = new Database(verifiedBackup.backupPath, { readonly: true, fileMustExist: true });
    try {
      verifySqliteIntegrityAndFk(backupRo, 'test-backup-verify');
      const backupSnap = computeJobsSnapshot(backupRo);
      assert.strictEqual(
        backupSnap.sha256,
        verifiedBackup.snapshot.sha256,
        'SHA-256 do backup restaurável deve coincidir com o snapshot original'
      );
      assert.strictEqual(
        JSON.stringify(backupSnap.tableCounts),
        JSON.stringify(verifiedBackup.snapshot.tableCounts),
        'Contagens por tabela do backup devem coincidir com o original'
      );
      assert.strictEqual(
        JSON.stringify(backupSnap.primaryKeys),
        JSON.stringify(verifiedBackup.snapshot.primaryKeys),
        'Primary keys do backup devem coincidir com o original'
      );
    } finally {
      backupRo.close();
      fs.rmSync(verifiedBackup.backupPath, { force: true });
    }
    console.log('  ✅ [PASS] db.backup() + integrity_check + foreign_key_check + restore SHA-256 validados');

    // =========================================================================
    // SEMEADURA DE FIXTURES ISOLADAS PARA TESTES 3, 4, 5 e 6
    // =========================================================================
    const ts = Date.now();
    const prefix = `p1_iso_${ts}_`;
    const insertJob = db.prepare(`
      INSERT INTO jobs (
        id, url, title, company, platform, description, published_at, created_at,
        location, city, state, work_model, required_seniority, salary, tech_stack,
        is_tech_software, is_junior_fullstack, overall_score, status, fingerprint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedJob = (opts: {
      id: string;
      title: string;
      company?: string;
      platform?: string;
      description?: string;
      publishedAt: string;
      createdAt?: string;
      location?: string | null;
      workModel?: string | null;
      seniority?: string | null;
      salary?: string | null;
      techStack?: string[];
      isTech?: number;
      isJr?: number;
      score?: number;
      status?: string;
      fingerprint?: string;
    }) => {
      const company = opts.company ?? 'Buscavag Test Labs';
      const loc = opts.location === undefined ? 'Remoto' : opts.location;
      const fp = opts.fingerprint ?? generateJobFingerprint(opts.title, company, loc);
      insertJob.run(
        opts.id,
        `https://example.com/vagas/${opts.id}`,
        opts.title,
        company,
        opts.platform ?? 'gupy',
        opts.description ?? `Descrição técnica para ${opts.title}`,
        opts.publishedAt,
        opts.createdAt ?? opts.publishedAt,
        loc,
        null,
        null,
        opts.workModel ?? 'Remoto',
        opts.seniority ?? 'Pleno',
        opts.salary ?? 'Não informado',
        JSON.stringify(opts.techStack ?? ['TypeScript']),
        opts.isTech ?? 1,
        opts.isJr ?? 0,
        opts.score ?? 80,
        opts.status ?? 'active',
        fp
      );
    };

    // Fixtures SEARCH-01 & SEARCH-07 (datas futuras 2099 para ficarem no topo da página 1 e 2)
    const reactId = `${prefix}react`;
    const goId = `${prefix}go`;
    const csharpId = `${prefix}csharp`;

    seedJob({
      id: reactId,
      title: 'Desenvolvedor Frontend React Sênior',
      techStack: ['React', 'TypeScript'],
      seniority: 'Não especificado',
      salary: 'Não informado',
      publishedAt: '2099-02-28T12:00:00.000Z',
    });
    seedJob({
      id: goId,
      title: 'Engenheiro Backend Go Pleno',
      techStack: ['Go', 'Docker'],
      salary: 'R$ 14.000',
      publishedAt: '2099-02-27T12:00:00.000Z',
    });
    seedJob({
      id: csharpId,
      title: 'Desenvolvedor C# .NET Core',
      techStack: ['C#', '.NET'],
      publishedAt: '2099-02-26T12:00:00.000Z',
    });

    for (let i = 1; i <= 25; i++) {
      const day = String(25 - (i % 20)).padStart(2, '0');
      const hour = String(i % 24).padStart(2, '0');
      seedJob({
        id: `${prefix}page_${i}`,
        title: `Engenheiro de Software Node.js #${i}`,
        techStack: ['Node.js', 'SQLite'],
        publishedAt: `2099-01-${day}T${hour}:00:00.000Z`,
      });
    }

    // =========================================================================
    // TESTE 3: SEARCH-01 & SEARCH-07 via API GET /api/public/jobs
    // =========================================================================
    console.log('\n--- 3. SEARCH-01 & SEARCH-07 na Cópia Isolada ---');

    const resAnon = await getPublicJobs(new NextRequest('http://localhost:3000/api/public/jobs'));
    assert.strictEqual(resAnon.status, 200, 'GET /api/public/jobs anônimo deve retornar HTTP 200');
    const jsonAnon = await resAnon.json();
    assert.strictEqual(jsonAnon.success, true, 'Resposta deve conter success: true');
    assert.strictEqual(jsonAnon.pagination.limit, 24, 'Limite padrão deve ser 24');
    assert.strictEqual(jsonAnon.data.length, 24, 'Página 1 deve retornar exatamente 24 vagas');
    assert.ok(jsonAnon.pagination.totalCount >= 28, 'totalCount deve contabilizar acervo ativo');
    assert.strictEqual(
      jsonAnon.pagination.totalPages,
      Math.ceil(jsonAnon.pagination.totalCount / 24),
      'totalPages deve corresponder ao totalCount / limit'
    );

    const page1Ids = new Set<string>(jsonAnon.data.map((j: { id: string }) => j.id));
    const resPage2 = await getPublicJobs(
      new NextRequest('http://localhost:3000/api/public/jobs?page=2')
    );
    assert.strictEqual(resPage2.status, 200);
    const jsonPage2 = await resPage2.json();
    assert.ok(jsonPage2.data.length > 0, 'Página 2 deve conter vagas');
    for (const job of jsonPage2.data) {
      assert.strictEqual(page1Ids.has(job.id), false, 'Página 2 não pode repetir IDs da Página 1');
    }

    const resOut = await getPublicJobs(
      new NextRequest('http://localhost:3000/api/public/jobs?page=9999')
    );
    assert.strictEqual(resOut.status, 200);
    const jsonOut = await resOut.json();
    assert.strictEqual(jsonOut.data.length, 0, 'Página 9999 deve retornar lista vazia');

    assert.deepStrictEqual(
      computePaginationPages(999, 5),
      [1, 2, 3, 4, 5],
      'computePaginationPages deve fazer clamping seguro'
    );

    const resReact = await getPublicJobs(
      new NextRequest('http://localhost:3000/api/public/jobs?q=react')
    );
    const jsonReact = await resReact.json();
    assert.ok(
      jsonReact.data.some((j: { id: string }) => j.id === reactId),
      'Busca ?q=react deve localizar vaga React'
    );

    const resGo = await getPublicJobs(new NextRequest('http://localhost:3000/api/public/jobs?q=go'));
    const jsonGo = await resGo.json();
    assert.ok(
      jsonGo.data.some((j: { id: string }) => j.id === goId),
      'Busca curta ?q=go deve localizar vaga Go'
    );

    const resCsharp = await getPublicJobs(
      new NextRequest(`http://localhost:3000/api/public/jobs?q=${encodeURIComponent('c#')}`)
    );
    const jsonCsharp = await resCsharp.json();
    assert.ok(
      jsonCsharp.data.some((j: { id: string }) => j.id === csharpId),
      'Busca com símbolo ?q=c# deve localizar vaga C#'
    );

    const resLongQ = await getPublicJobs(
      new NextRequest(`http://localhost:3000/api/public/jobs?q=${'a'.repeat(121)}`)
    );
    assert.strictEqual(resLongQ.status, 400, 'q > 120 chars deve retornar HTTP 400');

    const resBadPage = await getPublicJobs(
      new NextRequest('http://localhost:3000/api/public/jobs?page=0')
    );
    assert.strictEqual(resBadPage.status, 400, 'page=0 deve retornar HTTP 400');

    const resBadLimit = await getPublicJobs(
      new NextRequest('http://localhost:3000/api/public/jobs?limit=31')
    );
    assert.strictEqual(resBadLimit.status, 400, 'limit=31 deve retornar HTTP 400');

    console.log('  ✅ [PASS] Busca anônima, termos curtos (go, c#), paginação 24/pág e validações 400 aprovados');

    // =========================================================================
    // TESTE 4: DATA-01 Deduplicação CTE, Dry-Run No-Op & Preservação Estrita de FK
    // =========================================================================
    console.log('\n--- 4. DATA-01 Deduplicação CTE e Preservação de FK (user_saved_jobs / user_hidden_jobs) ---');

    const userPrimaryId = `${prefix}usr_1`;
    const userCloneId = `${prefix}usr_2`;
    const nowIso = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, tier, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash_test', ?, 'free', 'CANDIDATE', 'active', ?, ?)`
    ).run(userPrimaryId, `${userPrimaryId}@test.local`, 'Usuário Teste Primary', nowIso, nowIso);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, tier, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash_test', ?, 'free', 'CANDIDATE', 'active', ?, ?)`
    ).run(userCloneId, `${userCloneId}@test.local`, 'Usuário Teste Clone', nowIso, nowIso);

    const dupFingerprint = `fp_dup_${ts}`;
    const dupOlderId = `${prefix}dup_older`;
    const dupNewerId = `${prefix}dup_newer`;

    // Clone mais antigo com status custom 'interviewing' + hidden do userCloneId
    seedJob({
      id: dupOlderId,
      title: 'Engenheiro Platform Dedup Test',
      company: 'Acme Dedup SA',
      publishedAt: '2099-02-20T10:00:00.000Z',
      createdAt: '2099-02-20T10:00:00.000Z',
      score: 70,
      fingerprint: dupFingerprint,
    });
    // Clone mais novo com score maior e mesma contagem de engajamento para vencer deterministicamente
    seedJob({
      id: dupNewerId,
      title: 'Engenheiro Platform Dedup Test',
      company: 'Acme Dedup SA',
      publishedAt: '2099-02-25T10:00:00.000Z',
      createdAt: '2099-02-25T10:00:00.000Z',
      score: 95,
      fingerprint: dupFingerprint,
    });

    db.prepare(
      'INSERT INTO user_saved_jobs (user_id, job_id, status, created_at) VALUES (?, ?, ?, ?)'
    ).run(userCloneId, dupOlderId, 'interviewing', '2026-11-20T10:00:00.000Z');
    db.prepare(
      'INSERT INTO user_hidden_jobs (user_id, job_id, created_at) VALUES (?, ?, ?)'
    ).run(userCloneId, dupOlderId, '2026-11-20T10:05:00.000Z');

    db.prepare(
      'INSERT INTO user_saved_jobs (user_id, job_id, status, created_at) VALUES (?, ?, ?, ?)'
    ).run(userPrimaryId, dupNewerId, 'applied', '2026-11-21T10:00:00.000Z');
    db.prepare(
      'INSERT INTO user_hidden_jobs (user_id, job_id, created_at) VALUES (?, ?, ?)'
    ).run(userPrimaryId, dupNewerId, '2026-11-21T10:05:00.000Z');

    const repo = new PublicJobRepository();
    const cteDedupSearch = repo.searchPublicJobs({ q: 'Engenheiro Platform Dedup Test', limit: 24 });
    assert.strictEqual(
      cteDedupSearch.pagination.totalCount,
      1,
      'PublicJobRepository CTE deve colapsar 2 clones de mesmo fingerprint para 1 resultado'
    );
    assert.strictEqual(
      cteDedupSearch.jobs[0].id,
      dupNewerId,
      'PublicJobRepository CTE deve retornar a publicação mais recente antes de deduplicação física'
    );

    const dedupBeforeApply = await deduplicateDatabase({ dbPath: tempDbPath, apply: false });
    assert.strictEqual(dedupBeforeApply.duplicatesDeleted, 0, 'deduplicate dry-run faz 0 deleções');
    const olderStillExists = db.prepare('SELECT id FROM jobs WHERE id = ?').get(dupOlderId);
    assert.ok(olderStillExists, 'Dry-run de deduplicação não pode remover nenhum registro');

    const dedupApplied = await deduplicateDatabase({
      dbPath: tempDbPath,
      apply: true,
      confirmReviewed: true,
    });
    if (dedupApplied.backupResult?.backupPath) {
      fs.rmSync(dedupApplied.backupResult.backupPath, { force: true });
    }
    assert.ok(dedupApplied.duplicatesDeleted >= 1, 'Apply isolado deve remover o clone duplicado');
    assert.strictEqual(
      db.prepare('SELECT id FROM jobs WHERE id = ?').get(dupOlderId),
      undefined,
      'Clone perdedor deve ter sido removido do banco isolado'
    );
    assert.ok(
      db.prepare('SELECT id FROM jobs WHERE id = ?').get(dupNewerId),
      'Registro sobrevivente deve permanecer no banco isolado'
    );

    const migratedSaved = db
      .prepare('SELECT status, created_at FROM user_saved_jobs WHERE user_id = ? AND job_id = ?')
      .get(userCloneId, dupNewerId) as { status: string; created_at: string } | undefined;
    assert.strictEqual(
      migratedSaved?.status,
      'interviewing',
      'user_saved_jobs deve preservar status customizado "interviewing" após reatribuição FK'
    );
    assert.strictEqual(
      migratedSaved?.created_at,
      '2026-11-20T10:00:00.000Z',
      'user_saved_jobs deve preservar created_at original'
    );

    const migratedHidden = db
      .prepare('SELECT created_at FROM user_hidden_jobs WHERE user_id = ? AND job_id = ?')
      .get(userCloneId, dupNewerId) as { created_at: string } | undefined;
    assert.ok(migratedHidden, 'user_hidden_jobs deve ser preservado no registro sobrevivente');
    verifySqliteIntegrityAndFk(db, 'test-after-fk-dedup');

    console.log('  ✅ [PASS] CTE dedup + dry-run no-op + reatribuição FK preservando status "interviewing" aprovados');

    // =========================================================================
    // TESTE 5: DATA-03 Revisão de Falsos Positivos & Preservação de Vagas Dev Legítimas
    // =========================================================================
    console.log('\n--- 5. DATA-03 Anti-Ruído, Revisão Seller Dev & Preservação de Vagas Dev ---');

    const expiredId = `${prefix}expired`;
    const archivedId = `${prefix}archived`;
    const nonTechId = `${prefix}nontech`;
    const bebeeId = `${prefix}bebee`;
    const sellerDevId = `${prefix}seller_dev`;
    const vendaDiretaId = `${prefix}venda_direta`;
    const techLeadId = `${prefix}tech_lead`;
    const engSoftwareId = `${prefix}eng_soft`;

    seedJob({
      id: expiredId,
      title: 'Desenvolvedor TypeScript Expirado Filtro P1',
      status: 'expired',
      publishedAt: '2099-02-24T10:00:00.000Z',
    });
    seedJob({
      id: archivedId,
      title: 'Desenvolvedor TypeScript Arquivado Filtro P1',
      status: 'archived',
      publishedAt: '2099-02-24T10:00:00.000Z',
    });
    seedJob({
      id: nonTechId,
      title: 'Vendedor de Loja Filtro P1',
      isTech: 0,
      publishedAt: '2099-02-24T10:00:00.000Z',
    });
    seedJob({
      id: bebeeId,
      title: 'Desenvolvedor React Bebee Filtro P1',
      platform: 'bebee',
      publishedAt: '2099-02-24T10:00:00.000Z',
    });
    seedJob({
      id: sellerDevId,
      title: 'Desenvolvedor(a) de Vendas Sênior - (Seller Dev Sr.)',
      isTech: 1,
      status: 'active',
      publishedAt: '2099-02-24T10:00:00.000Z',
    });
    seedJob({
      id: vendaDiretaId,
      title: 'Pessoa Desenvolvedora BackEnd NodeJs Especialista I (Venda Direta)',
      company: 'Grupo Boticário Test',
      isTech: 1,
      status: 'active',
      publishedAt: '2099-02-24T10:00:00.000Z',
    });
    seedJob({
      id: techLeadId,
      title: 'Tech Lead Platform',
      isTech: 1,
      status: 'active',
      publishedAt: '2099-02-24T10:00:00.000Z',
    });
    seedJob({
      id: engSoftwareId,
      title: 'Engenheiro de Software Sênior',
      isTech: 1,
      status: 'active',
      publishedAt: '2099-02-24T10:00:00.000Z',
    });

    assert.strictEqual(
      isTechJob('Desenvolvedor(a) de Vendas Sênior - (Seller Dev Sr.)'),
      false,
      'isTechJob deve rejeitar Seller Dev'
    );
    assert.strictEqual(
      isTechJob('Pessoa Desenvolvedora BackEnd NodeJs Especialista I (Venda Direta)'),
      true,
      'isTechJob deve preservar vaga backend legítima com contexto (Venda Direta)'
    );

    for (const hiddenQuery of [
      'Desenvolvedor TypeScript Expirado Filtro P1',
      'Desenvolvedor TypeScript Arquivado Filtro P1',
      'Vendedor de Loja Filtro P1',
      'Desenvolvedor React Bebee Filtro P1',
    ]) {
      const hiddenRes = repo.searchPublicJobs({ q: hiddenQuery, limit: 24 });
      assert.strictEqual(
        hiddenRes.pagination.totalCount,
        0,
        `PublicJobRepository deve ocultar "${hiddenQuery}"`
      );
    }

    const sanDryReport = await sanitizeDatabase({ dbPath: tempDbPath, apply: false });
    const sellerCandidate = sanDryReport.candidates.find((c) => c.id === sellerDevId);
    assert.ok(sellerCandidate, 'Dry-run deve sinalizar Seller Dev em candidates');
    assert.strictEqual(sellerCandidate?.proposedAction, 'flag_non_tech');
    assert.ok(
      sellerCandidate?.reason.includes('Seller Dev'),
      'Candidato Seller Dev deve exibir regra exata no reason'
    );

    const sellerAfterDry = db
      .prepare('SELECT status, is_tech_software FROM jobs WHERE id = ?')
      .get(sellerDevId) as { status: string; is_tech_software: number };
    assert.strictEqual(sellerAfterDry.status, 'active', 'Dry-run não pode arquivar Seller Dev');
    assert.strictEqual(sellerAfterDry.is_tech_software, 1);

    assert.ok(
      sanDryReport.borderlinePreservedJobs.some((b) => b.id === vendaDiretaId),
      'Dry-run deve listar vaga legítima (Venda Direta) em borderlinePreservedJobs'
    );
    assert.ok(
      sanDryReport.borderlinePreservedJobs.some((b) => b.id === techLeadId),
      'Dry-run deve listar Tech Lead Platform em borderlinePreservedJobs'
    );

    // Aplica sanitizeDatabase exclusivamente na cópia isolada tempDbPath
    const sanApplied = await sanitizeDatabase({
      dbPath: tempDbPath,
      apply: true,
      confirmReviewed: true,
    });
    if (sanApplied.backupResult?.backupPath) {
      fs.rmSync(sanApplied.backupResult.backupPath, { force: true });
    }

    const sellerAfterApply = db
      .prepare('SELECT status, is_tech_software FROM jobs WHERE id = ?')
      .get(sellerDevId) as { status: string; is_tech_software: number };
    assert.strictEqual(sellerAfterApply.status, 'archived', 'Seller Dev arquivado apenas no apply isolado');
    assert.strictEqual(sellerAfterApply.is_tech_software, 0);

    for (const preservedId of [vendaDiretaId, techLeadId, engSoftwareId]) {
      const row = db
        .prepare('SELECT status, is_tech_software FROM jobs WHERE id = ?')
        .get(preservedId) as { status: string; is_tech_software: number };
      assert.strictEqual(row.status, 'active', `Vaga dev legítima ${preservedId} deve continuar active`);
      assert.strictEqual(row.is_tech_software, 1, `Vaga dev legítima ${preservedId} deve continuar is_tech_software=1`);
    }

    const publicVendaDireta = repo.searchPublicJobs({ q: 'Venda Direta', limit: 24 });
    assert.ok(
      publicVendaDireta.jobs.some((j) => j.id === vendaDiretaId),
      'Vaga dev legítima (Venda Direta) deve continuar visível no catálogo público após apply'
    );
    console.log('  ✅ [PASS] Bloqueio de expiradas/bebee, dry-run Seller Dev e preservação de vagas dev aprovados');

    // =========================================================================
    // TESTE 6: Segurança ASVS V4/V5 e Sanitização de Saída Pública
    // =========================================================================
    console.log('\n--- 6. Segurança ASVS V4/V5 & Formatadores Públicos ---');

    const resSec = await getPublicJobs(
      new NextRequest('http://localhost:3000/api/public/jobs?q=React&limit=10')
    );
    const jsonSec = await resSec.json();
    assert.ok(jsonSec.data.length > 0);
    const forbiddenKeys = [
      'aiReasoning',
      'ai_reasoning',
      'gaps',
      'resumeTips',
      'resume_tips',
      'overallScore',
      'overall_score',
      'directContact',
      'direct_contact',
    ];
    for (const item of jsonSec.data) {
      for (const key of forbiddenKeys) {
        assert.strictEqual(
          Object.prototype.hasOwnProperty.call(item, key),
          false,
          `Payload público não deve expor campo privado "${key}"`
        );
      }
    }

    const reactPublicItem = jsonSec.data.find((j: { id: string }) => j.id === reactId);
    assert.strictEqual(reactPublicItem?.salary, null, 'Sentinel "Não informado" deve virar null');
    assert.strictEqual(
      reactPublicItem?.requiredSeniority,
      null,
      'Sentinel "Não especificado" deve virar null'
    );

    assert.strictEqual(getSafeExternalJobUrl('javascript:alert(1)'), null, 'Deve bloquear javascript:');
    assert.strictEqual(getSafeExternalJobUrl('data:text/html,<script>'), null, 'Deve bloquear data:');
    assert.strictEqual(
      getSafeExternalJobUrl('https://gupy.io/vaga/123'),
      'https://gupy.io/vaga/123',
      'Deve preservar URL https válida'
    );
    assert.strictEqual(normalizeOptionalJobField('Não informado'), null);
    assert.strictEqual(normalizeOptionalJobField('Não especificado'), null);
    assert.strictEqual(normalizeOptionalJobField('  Sênior  '), 'Sênior');

    // URL Builder & Encoding (buildVagasHref)
    assert.strictEqual(buildVagasHref({ q: '', page: 1 }), '/vagas');
    assert.strictEqual(buildVagasHref({ q: 'react', page: 1 }), '/vagas?q=react');
    assert.strictEqual(buildVagasHref({ q: 'c#', page: 2 }), '/vagas?q=c%23&page=2');
    assert.strictEqual(buildVagasHref({ q: 'node.js', page: 2 }), '/vagas?q=node.js&page=2');
    assert.strictEqual(buildVagasHref({ q: '', page: 3 }), '/vagas?page=3');

    // Pagination Windowing & Clamping (computePaginationPages)
    assert.deepStrictEqual(computePaginationPages(1, 5), [1, 2, 3, 4, 5]);
    assert.deepStrictEqual(
      computePaginationPages(5, 12),
      [1, 'ellipsis', 4, 5, 6, 'ellipsis', 12],
      'computePaginationPages(5, 12) deve gerar janela com ellipsis sem duplicatas'
    );
    assert.deepStrictEqual(computePaginationPages(999, 5), [1, 2, 3, 4, 5]);
    const clampedPages12 = computePaginationPages(999, 12);
    const numericClamped12 = clampedPages12.filter((item): item is number => typeof item === 'number');
    assert.ok(numericClamped12.length > 0, 'computePaginationPages(999, 12) deve retornar páginas numéricas');
    assert.ok(
      numericClamped12.every((n) => n >= 1 && n <= 12),
      'computePaginationPages(999, 12) nunca pode emitir números fora de 1..12 (como 998, 999 ou 1000)'
    );
    assert.strictEqual(
      new Set(numericClamped12).size,
      numericClamped12.length,
      'computePaginationPages(999, 12) não pode conter números duplicados'
    );
    assert.deepStrictEqual(computePaginationPages(1, 0), []);
    assert.deepStrictEqual(computePaginationPages(1, -3), []);

    // Platform Labels, Slugs & Relative Dates
    assert.strictEqual(formatPlatformLabel('gupy'), 'Gupy');
    assert.strictEqual(formatPlatformLabel('linkedin_posts'), 'LinkedIn');
    assert.strictEqual(formatPlatformLabel('catho'), 'Catho');
    assert.strictEqual(
      buildPublicJobSlug('Dev React Sênior', '12345678-abcd'),
      'dev-react-senior-12345678'
    );
    const nowIsoForDate = new Date().toISOString();
    const yesterdayIso = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 60_000).toISOString();
    assert.strictEqual(formatRelativePublishedAtPtBr(nowIsoForDate), 'Hoje');
    assert.strictEqual(formatRelativePublishedAtPtBr(yesterdayIso), 'Ontem');
    assert.strictEqual(formatRelativePublishedAtPtBr(threeDaysAgoIso), 'Há 3 dias');
    assert.strictEqual(formatRelativePublishedAtPtBr(null, null), '');

    console.log('  ✅ [PASS] Proteções ASVS V4/V5, supressão de sentinelas, paginação com clamp e formatadores aprovados');
  } finally {
    try {
      dbModule?.db.close();
    } catch {
      // ignora erro caso conexão já esteja fechada
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // ===========================================================================
  // TESTE 1 (PÓS): Garantia Incondicional de Zero Mutação no buscavag.db Real
  // ===========================================================================
  if (realDbExists && preRealHash !== null) {
    const postRealHash = sha256File(realDbPath);
    const realRoAfter = new Database(realDbPath, { readonly: true, fileMustExist: true });
    let postRealCount = -1;
    try {
      const row = realRoAfter.prepare('SELECT COUNT(*) AS cnt FROM jobs').get() as { cnt: number };
      postRealCount = Number(row.cnt);
    } finally {
      realRoAfter.close();
    }

    assert.strictEqual(
      postRealHash,
      preRealHash,
      `FATAL: Hash SHA-256 do buscavag.db real foi alterado! pré=${preRealHash} pós=${postRealHash}`
    );
    assert.strictEqual(
      postRealCount,
      preRealCount,
      `FATAL: Contagem de jobs do buscavag.db real mudou! pré=${preRealCount} pós=${postRealCount}`
    );
    console.log(`\n  ✅ [PASS] buscavag.db real 100% intocado (SHA-256: ${postRealHash}, jobs: ${postRealCount})`);
  }

  console.log('\n======================================================');
  console.log('🎉 TODOS OS TESTES DA PHASE 1 (PORTAL PÚBLICO) PASSARAM!');
  console.log('======================================================\n');
}

runPhase1PublicPortalTests().catch((err) => {
  console.error('\n❌ Erro fatal na suíte Phase 1 Portal Público:', err);
  process.exit(1);
});
