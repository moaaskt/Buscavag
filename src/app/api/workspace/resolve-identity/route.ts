import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { validateTrustedOrigin } from '@/lib/csrf';
import { getSessionUser, verifyPassword, SESSION_COOKIE_NAME } from '@/lib/auth';
import {
  getAdminSessionUser,
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
} from '@/lib/admin-auth';
import { AdminRepository } from '@/db/adminRepository';
import { verifyTotpToken, isTotpEnabledGlobally } from '@/lib/totp';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const ResolveIdentitySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('choose_candidate'),
  }),
  z.object({
    action: z.literal('choose_admin'),
    password: z.string().min(1, 'Informe a senha administrativa para confirmar sua identidade'),
    totpCode: z.string().optional().nullable(),
  }),
  z.object({
    action: z.literal('terminate_all'),
  }),
]);

/**
 * Endpoint de Resolução Efetiva Server-Side para Conflito de Sessões Concorrentes.
 *
 * Condições Obrigatórias de Segurança:
 * 1. "choose_candidate": Revoga fisicamente a sessão administrativa em admin_sessions no SQLite.
 *    Se a revogação falhar ou a sessão ainda constar no banco após o DELETE, ABORTA com erro 500,
 *    mantendo o Workspace bloqueado e sem liberar o contexto de candidato.
 * 2. "choose_admin": Exige revalidação de senha (e TOTP se ativo) pertencente EXATAMENTE ao mesmo
 *    `admin_user_id` da sessão administrativa em conflito. Não aceita outro administrador.
 *    Expira o cookie buscavag_session (observada a limitação documentada de que o token comum HMAC
 *    é stateless e cópias externas permanecem válidas até seu `exp`).
 * 3. "terminate_all": Revoga a sessão administrativa no banco e expira ambos os cookies.
 */
export async function POST(req: NextRequest) {
  // 1. Validação estrita de origem contra CSRF
  const csrfCheck = validateTrustedOrigin(req);
  if (!csrfCheck.valid) {
    logger.security('admin-auth', `Bloqueio CSRF em resolve-identity: ${csrfCheck.reason}`, { req });
    return NextResponse.json(
      { success: false, error: 'Ação bloqueada por política de segurança de origem (CSRF)' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Payload JSON inválido' }, { status: 400 });
  }

  const parsed = ResolveIdentitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Parâmetros de resolução inválidos' },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const adminRepo = new AdminRepository();

  // ---------------------------------------------------------------------------
  // AÇÃO 1: Continuar como Candidato (Exige revogação comprovada de admin_session)
  // ---------------------------------------------------------------------------
  if (payload.action === 'choose_candidate') {
    const candidateSession = await getSessionUser(req);
    if (!candidateSession) {
      return NextResponse.json(
        { success: false, error: 'Sessão de candidato ausente ou expirada' },
        { status: 401 }
      );
    }

    const adminSessionData = await getAdminSessionUser(req);
    if (adminSessionData) {
      const targetSessionId = adminSessionData.session.id;

      try {
        adminRepo.revokeSession(targetSessionId);

        // Verificação estrita pós-deleção no SQLite
        const stillExists = adminRepo.getSessionByTokenHash(adminSessionData.session.token_hash);
        if (stillExists) {
          throw new Error('Registro de sessão administrativa persistiu no banco após comando de revogação');
        }
      } catch (err: any) {
        logger.error(
          'admin-auth',
          `Falha crítica ao revogar admin_session (${targetSessionId}) durante choose_candidate: ${err.message}`,
          { req }
        );
        // REGRA OBRIGATÓRIA: Não liberar candidato se a revogação falhar
        return NextResponse.json(
          {
            success: false,
            error: 'FALHA_REVOGACAO_ADMIN',
            message:
              'Não foi possível revogar a sessão administrativa concorrente no banco de dados. O Workspace permanece bloqueado por segurança. Tente novamente.',
          },
          { status: 500 }
        );
      }
    }

    const response = NextResponse.json({
      success: true,
      resolvedTo: 'candidate',
      message: 'Sessão administrativa encerrada com sucesso. Contexto de candidato liberado.',
    });

    // Expira o cookie administrativo com seus atributos exatos
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  }

  // ---------------------------------------------------------------------------
  // AÇÃO 2: Continuar como Administrador (Revalida o MESMO admin_user_id)
  // ---------------------------------------------------------------------------
  if (payload.action === 'choose_admin') {
    const adminSessionData = await getAdminSessionUser(req);
    if (!adminSessionData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sessão administrativa em conflito não encontrada ou já expirada. Faça login novamente.',
        },
        { status: 401 }
      );
    }

    const { user: conflictingAdmin, session: conflictingSession } = adminSessionData;

    // Busca registro fresco do EXATO admin_user_id da sessão em conflito
    const freshAdminRecord = adminRepo.getAdminById(conflictingAdmin.id);
    if (!freshAdminRecord || freshAdminRecord.id !== conflictingSession.admin_user_id) {
      return NextResponse.json(
        { success: false, error: 'Inconsistência de vínculo do administrador em conflito' },
        { status: 403 }
      );
    }

    // Valida senha estritamente contra o admin_user_id em conflito
    const isPasswordValid = verifyPassword(payload.password, freshAdminRecord.password_hash);
    if (!isPasswordValid) {
      logger.security(
        'admin-auth',
        `Falha de reautenticação na resolução de conflito para admin ID ${freshAdminRecord.id}`,
        { user_id: freshAdminRecord.id, req }
      );
      return NextResponse.json(
        { success: false, error: 'Senha administrativa incorreta para a sessão em conflito' },
        { status: 401 }
      );
    }

    // Verifica exigência de TOTP
    const totpRequired = Boolean(
      (freshAdminRecord.totp_enabled && freshAdminRecord.totp_secret) || isTotpEnabledGlobally()
    );

    if (totpRequired) {
      if (!freshAdminRecord.totp_secret) {
        return NextResponse.json(
          {
            success: false,
            error: 'Configuração 2FA pendente para este administrador. Encerre as sessões e acesse /admin/login.',
          },
          { status: 403 }
        );
      }

      if (!payload.totpCode || !payload.totpCode.trim()) {
        return NextResponse.json(
          {
            success: false,
            requireTotp: true,
            error: 'Informe o código 2FA (TOTP) de 6 dígitos para confirmar a identidade administrativa',
          },
          { status: 401 }
        );
      }

      const isTotpValid = verifyTotpToken(payload.totpCode.trim(), freshAdminRecord.totp_secret);
      if (!isTotpValid) {
        logger.security(
          'admin-auth',
          `Código TOTP inválido na resolução de conflito para admin ID ${freshAdminRecord.id}`,
          { user_id: freshAdminRecord.id, req }
        );
        return NextResponse.json(
          { success: false, requireTotp: true, error: 'Código 2FA incorreto ou expirado' },
          { status: 401 }
        );
      }
    }

    // Rotaciona a sessão administrativa para o mesmo admin_user_id
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const newSessionId = crypto.randomUUID();

    const { token: newAdminToken, tokenHash, expiresAt } = createAdminSessionToken({
      adminId: freshAdminRecord.id,
      email: freshAdminRecord.email,
      name: freshAdminRecord.name,
      role: 'ADMIN',
      sessionId: newSessionId,
    });

    try {
      adminRepo.revokeSession(conflictingSession.id);
      adminRepo.createSession({
        id: newSessionId,
        admin_user_id: freshAdminRecord.id,
        token_hash: tokenHash,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt,
      });
    } catch (err: any) {
      logger.error('admin-auth', `Erro ao rotacionar sessão admin na resolução: ${err.message}`, { req });
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao registrar sessão administrativa revalidada no banco. Tente novamente.',
        },
        { status: 500 }
      );
    }

    logger.info(
      'admin-auth',
      `Conflito de identidade resolvido para ADMIN (${freshAdminRecord.email}). Cookie de candidato expirado.`,
      { user_id: freshAdminRecord.id, req }
    );

    const response = NextResponse.json({
      success: true,
      resolvedTo: 'admin',
      message: 'Identidade administrativa revalidada. Sessão comum desconectada deste navegador.',
      securityNote:
        'Nota técnica: O cookie buscavag_session foi removido do navegador. Por ser stateless (HMAC), eventuais cópias externas previamente extraídas permanecem válidas até sua expiração natural.',
    });

    // Expira o cookie comum buscavag_session no navegador
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    // Atualiza o cookie administrativo com o novo token rotacionado
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: newAdminToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });

    return response;
  }

  // ---------------------------------------------------------------------------
  // AÇÃO 3: Encerrar Todas as Sessões
  // ---------------------------------------------------------------------------
  const adminSessionData = await getAdminSessionUser(req);
  let dbRevocationFailed = false;

  if (adminSessionData) {
    try {
      adminRepo.revokeSession(adminSessionData.session.id);
      const verify = adminRepo.getSessionByTokenHash(adminSessionData.session.token_hash);
      if (verify) {
        dbRevocationFailed = true;
      }
    } catch (err: any) {
      dbRevocationFailed = true;
      logger.error('admin-auth', `Falha ao revogar admin_session em terminate_all: ${err.message}`, { req });
    }
  }

  const response = NextResponse.json(
    {
      success: !dbRevocationFailed,
      resolvedTo: 'none',
      status: dbRevocationFailed ? 'partial_failure' : 'complete',
      message: dbRevocationFailed
        ? 'Os cookies foram limpos do navegador, porém houve falha ao revogar a sessão administrativa no banco. Tente novamente.'
        : 'Todas as sessões foram encerradas com segurança.',
    },
    { status: dbRevocationFailed ? 207 : 200 }
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
