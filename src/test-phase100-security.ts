import assert from 'assert';
import { NextRequest } from 'next/server';
import { validateTrustedOrigin } from './lib/csrf';
import {
  getAdminSessionUser,
  checkAdminSessionSecurity,
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE_NAME,
} from './lib/admin-auth';
import { createSessionToken, hashPassword, SESSION_COOKIE_NAME } from './lib/auth';
import { AdminRepository } from './db/adminRepository';
import { CandidateRepository } from './db/candidateRepository';
import { JobRepository } from './db/repository';
import { generateSecret, generateSync } from 'otplib';
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

  // Administradores específicos para testes de credenciais, isolamento e TOTP
  const isolatedAdminPassword = 'IsolatedAdminPass!2026';
  const isolatedAdmin = adminRepo.createAdminUser({
    email: `isolated_admin_${Date.now()}@buscavag.com`,
    password_hash: hashPassword(isolatedAdminPassword),
    name: 'Admin Isolado Testes',
    totp_enabled: 0,
  });

  const secondaryAdminPassword = 'SecondaryAdminPass!2026';
  const secondaryAdmin = adminRepo.createAdminUser({
    email: `secondary_admin_${Date.now()}@buscavag.com`,
    password_hash: hashPassword(secondaryAdminPassword),
    name: 'Admin Secundário Testes',
    totp_enabled: 0,
  });

  // Helper para criar sessão ativa de admin no SQLite
  function createActiveAdminSession(adminId: string, customEmail?: string, customName?: string) {
    const sessionId = crypto.randomUUID();
    const { token, tokenHash, expiresAt } = createAdminSessionToken({
      adminId,
      email: customEmail || adminUser.email,
      name: customName || adminUser.name,
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

  // -------------------------------------------------------------------------
  // 5. RESOLUÇÃO DE IDENTIDADE (/api/workspace/resolve-identity)
  // -------------------------------------------------------------------------
  console.log('\n📌 [GRUPO 5] Resolução Efetiva de Identidade (/api/workspace/resolve-identity):');

  await it('5.1 - choose_candidate: Se revogação no SQLite falhar, deve retornar HTTP 500 (FALHA_REVOGACAO_ADMIN) e NÃO liberar candidato', async () => {
    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    const origRevoke = AdminRepository.prototype.revokeSession;
    // Mock no-op: simula falha silenciosa onde o registro persiste no SQLite
    AdminRepository.prototype.revokeSession = function () {};

    const { POST: resolveHandler } = await import('./app/api/workspace/resolve-identity/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/resolve-identity', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'Content-Type': 'application/json',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
      body: JSON.stringify({ action: 'choose_candidate' }),
    });

    try {
      const res = await resolveHandler(req);
      assert.strictEqual(res.status, 500, 'Deve retornar HTTP 500 se a sessão admin persistir no SQLite');
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error, 'FALHA_REVOGACAO_ADMIN');

      // Confirma que a resposta NÃO liberou o contexto com cookie de sucesso
      assert.strictEqual(json.resolvedTo, undefined);
    } finally {
      AdminRepository.prototype.revokeSession = origRevoke;
      adminRepo.revokeSession(sessionRecord.id);
    }
  });

  await it('5.2 - choose_admin: Senha administrativa incorreta deve rejeitar com HTTP 401', async () => {
    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    const { POST: resolveHandler } = await import('./app/api/workspace/resolve-identity/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/resolve-identity', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'Content-Type': 'application/json',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
      body: JSON.stringify({
        action: 'choose_admin',
        password: 'SenhaIncorretaErrada!123',
      }),
    });

    const res = await resolveHandler(req);
    assert.strictEqual(res.status, 401, 'Deve responder HTTP 401 para senha incorreta');
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert(json.error?.includes('Senha administrativa incorreta'));

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('5.3 - choose_admin: Credenciais de outro admin devem ser rejeitadas contra a sessão em conflito', async () => {
    // Sessão pertence a isolatedAdmin
    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    const { POST: resolveHandler } = await import('./app/api/workspace/resolve-identity/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/resolve-identity', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'Content-Type': 'application/json',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
      body: JSON.stringify({
        action: 'choose_admin',
        password: secondaryAdminPassword, // Senha pertencente a secondaryAdmin, e não a isolatedAdmin
      }),
    });

    const res = await resolveHandler(req);
    assert.strictEqual(res.status, 401, 'Deve rejeitar senha de outro admin com HTTP 401');
    const json = await res.json();
    assert.strictEqual(json.success, false);

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('5.4 - choose_admin: Inconsistência de vínculo do admin_user_id deve responder HTTP 403', async () => {
    // Cria sessão forjando payload JWT com isolatedAdmin, mas persistida no banco sob secondaryAdmin.id
    const divergentSessionId = crypto.randomUUID();
    const { token: divergentToken, tokenHash, expiresAt } = createAdminSessionToken({
      adminId: isolatedAdmin.id,
      email: isolatedAdmin.email,
      name: isolatedAdmin.name,
      role: 'ADMIN',
      sessionId: divergentSessionId,
    });

    adminRepo.createSession({
      id: divergentSessionId,
      admin_user_id: secondaryAdmin.id, // Vínculo divergente
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    const { POST: resolveHandler } = await import('./app/api/workspace/resolve-identity/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/resolve-identity', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'Content-Type': 'application/json',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${divergentToken}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
      body: JSON.stringify({
        action: 'choose_admin',
        password: isolatedAdminPassword,
      }),
    });

    const res = await resolveHandler(req);
    assert.strictEqual(res.status, 403, 'Deve rejeitar com 403 se o admin_user_id não coincidir exatamente');
    const json = await res.json();
    assert(json.error?.includes('Inconsistência de vínculo'));

    adminRepo.revokeSession(divergentSessionId);
  });

  await it('5.5 - choose_admin: Com TOTP ativado mas sem totpCode, deve responder HTTP 401 com requireTotp: true', async () => {
    const totpSecret = generateSecret();
    adminRepo.updateAdminTotp(isolatedAdmin.id, totpSecret, true);

    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    const { POST: resolveHandler } = await import('./app/api/workspace/resolve-identity/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/resolve-identity', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'Content-Type': 'application/json',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
      body: JSON.stringify({
        action: 'choose_admin',
        password: isolatedAdminPassword,
      }),
    });

    const res = await resolveHandler(req);
    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert.strictEqual(json.requireTotp, true);
    assert(json.error?.includes('código 2FA'));

    adminRepo.revokeSession(sessionRecord.id);
    adminRepo.updateAdminTotp(isolatedAdmin.id, null, false);
  });

  await it('5.6 - choose_admin: Com TOTP ativado e código inválido, deve responder HTTP 401', async () => {
    const totpSecret = generateSecret();
    adminRepo.updateAdminTotp(isolatedAdmin.id, totpSecret, true);

    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    const { POST: resolveHandler } = await import('./app/api/workspace/resolve-identity/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/resolve-identity', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'Content-Type': 'application/json',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
      body: JSON.stringify({
        action: 'choose_admin',
        password: isolatedAdminPassword,
        totpCode: '000000',
      }),
    });

    const res = await resolveHandler(req);
    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert(json.error?.includes('Código 2FA incorreto'));

    adminRepo.revokeSession(sessionRecord.id);
    adminRepo.updateAdminTotp(isolatedAdmin.id, null, false);
  });

  await it('5.7 - choose_admin: Com TOTP ativado e código válido, deve aprovar (HTTP 200), rotacionar e expirar buscavag_session', async () => {
    const totpSecret = generateSecret();
    adminRepo.updateAdminTotp(isolatedAdmin.id, totpSecret, true);

    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);
    const validTotpCode = generateSync({ secret: totpSecret });

    const { POST: resolveHandler } = await import('./app/api/workspace/resolve-identity/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/resolve-identity', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        'Content-Type': 'application/json',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
      body: JSON.stringify({
        action: 'choose_admin',
        password: isolatedAdminPassword,
        totpCode: validTotpCode,
      }),
    });

    const res = await resolveHandler(req);
    assert.strictEqual(res.status, 200, 'Deve aprovar resolução de admin com credenciais e TOTP válidos');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.resolvedTo, 'admin');

    // Confirma que a sessão antiga foi removida do banco na rotação atômica
    const oldStillExists = adminRepo.getSessionByTokenHash(sessionRecord.token_hash);
    assert.strictEqual(oldStillExists, null, 'Sessão antiga em conflito deve ter sido revogada');

    // Confirma expiração do cookie de candidato
    const candidateCookie = res.cookies.get(SESSION_COOKIE_NAME);
    assert(candidateCookie?.maxAge === 0, 'Cookie do candidato deve ser expirado com maxAge: 0');

    adminRepo.updateAdminTotp(isolatedAdmin.id, null, false);
  });

  // -------------------------------------------------------------------------
  // 6. LOGOUT UNIFICADO DO WORKSPACE (/api/workspace/logout)
  // -------------------------------------------------------------------------
  console.log('\n📌 [GRUPO 6] Endpoint de Logout do Workspace (/api/workspace/logout):');

  await it('6.1 - Logout completo: deve revogar sessão no SQLite, expirar cookies e retornar HTTP 200 (complete)', async () => {
    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    const { POST: logoutHandler } = await import('./app/api/workspace/logout/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
    });

    const res = await logoutHandler(req);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.status, 'complete');
    assert.strictEqual(json.databaseRevocation, 'revoked');
    assert.strictEqual(json.cookiesCleared, true);

    // Confirma exclusão da sessão no SQLite
    const sessionInDb = adminRepo.getSessionByTokenHash(sessionRecord.token_hash);
    assert.strictEqual(sessionInDb, null, 'Sessão administrativa deve ser deletada do SQLite');

    // Confirma que ambos os cookies foram expirados
    assert(res.cookies.get(SESSION_COOKIE_NAME)?.maxAge === 0, 'buscavag_session deve ter maxAge 0');
    assert(res.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.maxAge === 0, 'admin_session deve ter maxAge 0');
  });

  await it('6.2 - Logout parcial: se a revogação no SQLite falhar, deve retornar HTTP 207 (partial_failure)', async () => {
    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    const origRevoke = AdminRepository.prototype.revokeSession;
    // Mock no-op simulando falha de revogação no banco
    AdminRepository.prototype.revokeSession = function () {};

    const { POST: logoutHandler } = await import('./app/api/workspace/logout/route');
    const req = new NextRequest('http://localhost:3000/api/workspace/logout', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
    });

    try {
      const res = await logoutHandler(req);
      assert.strictEqual(res.status, 207, 'Deve responder HTTP 207 Multi-Status em falha de revogação');
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.status, 'partial_failure');
      assert.strictEqual(json.databaseRevocation, 'failed');
      assert.strictEqual(json.cookiesCleared, true, 'Cookies devem ser expirados mesmo em partial failure');

      assert(res.cookies.get(SESSION_COOKIE_NAME)?.maxAge === 0);
      assert(res.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.maxAge === 0);
    } finally {
      AdminRepository.prototype.revokeSession = origRevoke;
      adminRepo.revokeSession(sessionRecord.id);
    }
  });

  // -------------------------------------------------------------------------
  // 7. PROTEÇÃO SERVER-SIDE DO ENDPOINT /api/admin/jobs/purge-non-tech
  // -------------------------------------------------------------------------
  console.log('\n📌 [GRUPO 7] Proteção Server-Side de /api/admin/jobs/purge-non-tech:');

  await it('7.1 - purge-non-tech deve rejeitar com HTTP 409 Conflict se houver sessão concorrente', async () => {
    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    const { POST: purgeHandler } = await import('./app/api/admin/jobs/purge-non-tech/route');
    const req = new NextRequest('http://localhost:3000/api/admin/jobs/purge-non-tech', {
      method: 'POST',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${candidateToken}`,
      },
    });

    const res = await purgeHandler(req);
    assert.strictEqual(res.status, 409, 'Deve responder HTTP 409 Conflict');
    const json = await res.json();
    assert.strictEqual(json.conflict, true);
    assert.strictEqual(json.code, 'CONFLICT_DETECTED');

    adminRepo.revokeSession(sessionRecord.id);
  });

  await it('7.2 - purge-non-tech deve rejeitar com HTTP 401 Unauthorized se admin_session estiver ausente', async () => {
    const { POST: purgeHandler } = await import('./app/api/admin/jobs/purge-non-tech/route');
    const req = new NextRequest('http://localhost:3000/api/admin/jobs/purge-non-tech', {
      method: 'POST',
    });

    const res = await purgeHandler(req);
    assert.strictEqual(res.status, 401, 'Deve responder HTTP 401 sem sessão');
    const json = await res.json();
    assert.strictEqual(json.code, 'UNAUTHORIZED');
  });

  await it('7.3 - purge-non-tech autorizado com sessão admin isolada (HTTP 200) com MOCK para NÃO executar purga real', async () => {
    const { token, sessionRecord } = createActiveAdminSession(isolatedAdmin.id, isolatedAdmin.email, isolatedAdmin.name);

    // MOCK OBRIGATÓRIO: Garante que nenhuma purga real ou alteração de dados ocorra no banco
    const origPurgeNonTech = JobRepository.prototype.purgeNonTech;
    let mockPurgeCalled = false;
    JobRepository.prototype.purgeNonTech = function () {
      mockPurgeCalled = true;
      return { deletedCount: 0 };
    };

    const { POST: purgeHandler } = await import('./app/api/admin/jobs/purge-non-tech/route');
    const req = new NextRequest('http://localhost:3000/api/admin/jobs/purge-non-tech', {
      method: 'POST',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}`,
      },
    });

    try {
      const res = await purgeHandler(req);
      assert.strictEqual(res.status, 200, 'Deve autorizar sessão administrativa legítima');
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.deletedCount, 0);
      assert.strictEqual(mockPurgeCalled, true, 'Mock deve interceptar a chamada impedindo purga no banco');
    } finally {
      JobRepository.prototype.purgeNonTech = origPurgeNonTech;
      adminRepo.revokeSession(sessionRecord.id);
    }
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
