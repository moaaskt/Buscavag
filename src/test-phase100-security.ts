import assert from 'assert';
import { NextRequest } from 'next/server';
import { validateTrustedOrigin } from './lib/csrf';
import {
  getAdminSessionUser,
  checkAdminSessionSecurity,
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE_NAME,
} from './lib/admin-auth';
import { createSessionToken, SESSION_COOKIE_NAME } from './lib/auth';
import { AdminRepository } from './db/adminRepository';
import { CandidateRepository } from './db/candidateRepository';
import crypto from 'crypto';

console.log('🧪 Iniciando Suíte de Testes Automatizados da Phase 100 — Segurança, Conflito e CSRF...\n');

let totalTests = 0;
let passedTests = 0;

function it(description: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          passedTests++;
          console.log(`  ✅ [PASS] ${description}`);
        })
        .catch((err) => {
          console.error(`  ❌ [FAIL] ${description}`);
          console.error(`     Erro: ${err.message}`);
          throw err;
        });
    } else {
      passedTests++;
      console.log(`  ✅ [PASS] ${description}`);
    }
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Erro: ${err.message}`);
    throw err;
  }
}

async function runTests() {
  const adminRepo = new AdminRepository();
  const candidateRepo = new CandidateRepository();

  // Garante admin seed
  const adminUser = adminRepo.ensureSeedAdmin();
  assert(adminUser, 'Admin seed deve existir');

  // Cria usuário candidato para os testes
  const testCandidateEmail = `cand_test_${Date.now()}@buscavag.com`;
  const candidateUserId = crypto.randomUUID();
  const candidateUser = candidateRepo.createUser({
    id: candidateUserId,
    name: 'Candidato Teste Segurança',
    email: testCandidateEmail,
    password_hash: 'dummy_hash',
  });
  assert(candidateUser && candidateUser.id, 'Candidato de teste deve existir');

  // Token válido de candidato
  const candidateToken = createSessionToken({
    userId: candidateUser.id,
    email: candidateUser.email,
    name: candidateUser.name,
    tier: 'free',
    role: 'CANDIDATE',
  });

  // Helper para criar sessão ativa de admin no SQLite
  function createActiveAdminSession(adminId: string) {
    const sessionId = crypto.randomUUID();
    const { token, tokenHash, expiresAt } = createAdminSessionToken({
      adminId,
      email: adminUser.email,
      name: adminUser.name,
      role: 'ADMIN',
      sessionId,
    });

    const sessionRecord = adminRepo.createSession({
      id: sessionId,
      admin_user_id: adminId,
      token_hash: tokenHash,
      ip_address: '127.0.0.1',
      user_agent: 'TestAgent',
      expires_at: expiresAt,
    });

    return { token, sessionRecord };
  }

  // -------------------------------------------------------------------------
  // 1. CSRF TESTS
  // -------------------------------------------------------------------------
  console.log('📌 [GRUPO 1] Validação Estrita de CSRF (validateTrustedOrigin):');

  it('1.1 - Deve aprovar requisição local padrão em desenvolvimento (http://localhost:3000)', () => {
    const req = new NextRequest('http://localhost:3000/api/workspace/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
      },
    });
    const check = validateTrustedOrigin(req, 'development');
    assert.strictEqual(check.valid, true);
  });

  it('1.2 - Deve rejeitar requisição com porta diferente (ex: http://localhost:4000)', () => {
    const req = new NextRequest('http://localhost:3000/api/workspace/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:4000',
        'sec-fetch-site': 'same-site',
      },
    });
    const check = validateTrustedOrigin(req, 'development');
    assert.strictEqual(check.valid, false);
    assert(check.reason?.includes('Origem não autorizada'));
  });

  it('1.3 - Deve rejeitar requisição de origem externa maliciosa (ex: https://attacker.com)', () => {
    const req = new NextRequest('http://localhost:3000/api/workspace/logout', {
      method: 'POST',
      headers: {
        origin: 'https://attacker.com',
        'sec-fetch-site': 'cross-site',
      },
    });
    const check = validateTrustedOrigin(req, 'development');
    assert.strictEqual(check.valid, false);
  });

  it('1.4 - Deve rejeitar Sec-Fetch-Site cross-site mesmo se Origin for falsificado', () => {
    const req = new NextRequest('http://localhost:3000/api/workspace/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'cross-site',
      },
    });
    const check = validateTrustedOrigin(req, 'development');
    assert.strictEqual(check.valid, false);
    assert(check.reason?.includes('Sec-Fetch-Site'));
  });

  it('1.5 - Deve rejeitar se Origin e Referer estiverem ausentes em POST', () => {
    const req = new NextRequest('http://localhost:3000/api/workspace/logout', {
      method: 'POST',
    });
    const check = validateTrustedOrigin(req, 'development');
    assert.strictEqual(check.valid, false);
    assert(check.reason?.includes('ausentes'));
  });

  it('1.6 - Em produção, deve exigir estritamente HTTPS e APP_URL canônica, rejeitando localhost', () => {
    const req = new NextRequest('https://buscavag.com/api/workspace/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
      },
    });
    const check = validateTrustedOrigin(req, 'production', 'https://buscavag.com');
    assert.strictEqual(check.valid, false, 'Não deve aceitar localhost em produção');

    const validReq = new NextRequest('https://buscavag.com/api/workspace/logout', {
      method: 'POST',
      headers: {
        origin: 'https://buscavag.com',
        'sec-fetch-site': 'same-origin',
      },
    });
    const validCheck = validateTrustedOrigin(validReq, 'production', 'https://buscavag.com');
    assert.strictEqual(validCheck.valid, true);
  });

  // -------------------------------------------------------------------------
  // 2. CONFLITO DE SESSÕES & AUTENTICAÇÃO CENTRALIZADA
  // -------------------------------------------------------------------------
  console.log('\n📌 [GRUPO 2] Conflito de Sessões & Proteção Centralizada de APIs Administrativas:');

  await it('2.1 - Somente sessão administrativa válida: deve autorizar acesso admin normalmente', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    const req = new NextRequest('http://localhost:3000/api/admin/empresas', {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const check = await checkAdminSessionSecurity(req);
    assert.strictEqual(check.success, true);
    assert.strictEqual(check.conflict, false);
    assert.strictEqual(check.data?.user.id, adminUser.id);

    // Limpa sessão de teste
    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('2.2 - Sessão administrativa e comum simultaneamente válidas: DEVE BLOQUEAR por CONFLITO (conflict: true)', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    // Request contendo AMBOS os cookies válidos
    const req = new NextRequest('http://localhost:3000/api/admin/scraper/run', {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
    });

    // 1. checkAdminSessionSecurity deve reportar conflito
    const check = await checkAdminSessionSecurity(req);
    assert.strictEqual(check.success, false);
    assert.strictEqual(check.conflict, true);
    assert.strictEqual(check.reason, 'conflict');

    // 2. getAdminSessionUser padrão deve retornar null (bloqueando todas as APIs operacionais)
    const adminUserResult = await getAdminSessionUser(req);
    assert.strictEqual(adminUserResult, null, 'getAdminSessionUser DEVE retornar null em conflito');

    // 3. getAdminSessionUser com allowConflict: true deve permitir consulta diagnóstica (usado em resolve-identity)
    const allowedResult = await getAdminSessionUser(req, { allowConflict: true });
    assert(allowedResult !== null, 'allowConflict deve permitir consulta controlada');
    assert.strictEqual(allowedResult.user.id, adminUser.id);

    // Limpa sessão de teste
    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('2.3 - Cookie comum expirado ou inválido com sessão admin válida: NÃO deve gerar falso conflito', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    // Cookie comum com assinatura inválida/lixo
    const req = new NextRequest('http://localhost:3000/api/admin/vagas', {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=token_invalido_expirado_xyz`,
      },
    });

    const check = await checkAdminSessionSecurity(req);
    assert.strictEqual(check.success, true, 'Não deve bloquear quando cookie comum for inválido');
    assert.strictEqual(check.conflict, false);

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('2.4 - Cookie comum pertencente a usuário suspenso: NÃO deve gerar falso conflito', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    // Cria usuário suspenso
    const suspendedId = crypto.randomUUID();
    const suspendedCandidate = candidateRepo.createUser({
      id: suspendedId,
      name: 'Candidato Suspenso',
      email: `susp_${Date.now()}@buscavag.com`,
      password_hash: 'dummy',
    });
    const updateStmt = (adminRepo as any).db?.prepare ? (adminRepo as any).db.prepare('UPDATE users SET status = ? WHERE id = ?') : null;
    if (updateStmt) {
      updateStmt.run('suspended', suspendedCandidate.id);
    } else {
      const { db } = await import('./db');
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run('suspended', suspendedCandidate.id);
    }

    const suspendedToken = createSessionToken({
      userId: suspendedCandidate.id,
      email: suspendedCandidate.email,
      name: suspendedCandidate.name,
      tier: 'free',
      role: 'CANDIDATE',
    });

    const req = new NextRequest('http://localhost:3000/api/admin/vagas', {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${suspendedToken}`,
      },
    });

    const check = await checkAdminSessionSecurity(req);
    assert.strictEqual(check.success, true, 'Usuário suspenso não deve causar conflito de identidade ativa');
    assert.strictEqual(check.conflict, false);

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('2.5 - Sessão administrativa revogada no SQLite: deve rejeitar com unauthenticated', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    // Revoga explicitamente no banco
    adminRepo.revokeSession(sessionRecord.id);

    const req = new NextRequest('http://localhost:3000/api/admin/logs', {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const check = await checkAdminSessionSecurity(req);
    assert.strictEqual(check.success, false);
    assert.strictEqual(check.conflict, false);
    assert.strictEqual(check.reason, 'unauthenticated');
  });

  // -------------------------------------------------------------------------
  // 3. TRANSAÇÃO ATÔMICA & ROTATION
  // -------------------------------------------------------------------------
  console.log('\n📌 [GRUPO 3] Transação Atômica de Sessão (rotateSessionAtomic):');

  it('3.1 - rotateSessionAtomic deve revogar a sessão antiga e inserir a nova atomicamente', () => {
    const { token: t1, sessionRecord: s1 } = createActiveAdminSession(adminUser.id);

    const newSessionId = crypto.randomUUID();
    const rotated = adminRepo.rotateSessionAtomic(s1.id, {
      id: newSessionId,
      admin_user_id: adminUser.id,
      token_hash: 'new_token_hash_rotated',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });

    assert.strictEqual(rotated.id, newSessionId);

    // Confirma que a sessão antiga foi removida
    const oldExists = adminRepo.getSessionByTokenHash(s1.token_hash);
    assert.strictEqual(oldExists, null, 'Sessão antiga deve ter sido deletada');

    // Confirma que a nova sessão existe no banco
    const newExists = adminRepo.getSessionByTokenHash('new_token_hash_rotated');
    assert(newExists !== null, 'Nova sessão deve constar no SQLite');

    // Limpa
    adminRepo.revokeSession(newSessionId);
  });

  // -------------------------------------------------------------------------
  // 4. BLOQUEIO DAS QUATRO ROTAS DE SCRAPER
  // -------------------------------------------------------------------------
  console.log('\n📌 [GRUPO 4] Proteção Server-Side das 4 Rotas de Scraper em Conflito e Sem Auth:');

  await it('4.1 - /api/admin/scraper/run deve rejeitar com 409 Conflict se houver sessão concorrente', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    const { POST: runHandler } = await import('./app/api/admin/scraper/run/route');
    const req = new NextRequest('http://localhost:3000/api/admin/scraper/run', {
      method: 'POST',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scraperName: 'test' }),
    });

    const res = await runHandler(req);
    assert.strictEqual(res.status, 409, 'Deve responder HTTP 409 Conflict');
    const json = await res.json();
    assert.strictEqual(json.conflict, true);

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('4.2 - /api/admin/scraper/trigger deve rejeitar com 409 Conflict se houver sessão concorrente', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    const { POST: triggerHandler } = await import('./app/api/admin/scraper/trigger/route');
    const req = new NextRequest('http://localhost:3000/api/admin/scraper/trigger', {
      method: 'POST',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ runId: 'test' }),
    });

    const res = await triggerHandler(req);
    assert.strictEqual(res.status, 409, 'Deve responder HTTP 409 Conflict');
    const json = await res.json();
    assert.strictEqual(json.conflict, true);

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('4.3 - /api/admin/scraper/logs deve rejeitar com 409 Conflict se houver sessão concorrente', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    const { GET: logsHandler } = await import('./app/api/admin/scraper/logs/route');
    const req = new NextRequest('http://localhost:3000/api/admin/scraper/logs', {
      method: 'GET',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
    });

    const res = await logsHandler(req);
    assert.strictEqual(res.status, 409, 'Deve responder HTTP 409 Conflict');

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('4.4 - /api/admin/scraper/stream deve rejeitar com 409 Conflict se houver sessão concorrente', async () => {
    const { token, sessionRecord } = createActiveAdminSession(adminUser.id);

    const { GET: streamHandler } = await import('./app/api/admin/scraper/stream/route');
    const req = new NextRequest('http://localhost:3000/api/admin/scraper/stream', {
      method: 'GET',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
    });

    const res = await streamHandler(req);
    assert.strictEqual(res.status, 409, 'Deve responder HTTP 409 Conflict');

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('4.5 - Rotas de scraper devem rejeitar com 401 Unauthorized se admin_session estiver ausente', async () => {
    const { GET: logsHandler } = await import('./app/api/admin/scraper/logs/route');
    const req = new NextRequest('http://localhost:3000/api/admin/scraper/logs', {
      method: 'GET',
    });

    const res = await logsHandler(req);
    assert.strictEqual(res.status, 401, 'Deve responder 401 sem sessão');
  });

  console.log(`\n======================================================`);
  console.log(`  🎉 RESULTADO: ${passedTests}/${totalTests} TESTES APROVADOS COM SUCESSO!`);
  console.log(`======================================================\n`);
}

runTests().catch((err) => {
  console.error('\n🚨 FALHA CRÍTICA NA EXECUÇÃO DOS TESTES:');
  console.error(err);
  process.exit(1);
});
