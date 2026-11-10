import { NextRequest, NextResponse } from 'next/server';
import { validateTrustedOrigin } from '@/lib/csrf';
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import { getAdminSessionUser, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { AdminRepository } from '@/db/adminRepository';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export interface WorkspaceLogoutResponse {
  success: boolean;
  status: 'complete' | 'partial_failure';
  databaseRevocation: 'revoked' | 'skipped' | 'failed';
  cookiesCleared: boolean;
  message: string;
  securityNote?: string;
}

/**
 * Endpoint Unificado de Logout do Workspace.
 *
 * Política de Segurança:
 * 1. Valida estritamente a origem normalizada (CSRF protection).
 * 2. Se admin_session estiver ativa, tenta revogá-la no SQLite (admin_sessions) e verifica a exclusão.
 * 3. Expira incondicionalmente ambos os cookies (buscavag_session e admin_session) com seus atributos reais.
 * 4. Se a revogação no banco falhar, NÃO declara sucesso completo: retorna status 'partial_failure' (HTTP 207)
 *    e orienta o usuário a tentar novamente ou fechar o navegador.
 * 5. Documenta que buscavag_session é stateless (HMAC) e a remoção ocorre via expiração do cookie HTTP.
 */
export async function POST(req: NextRequest) {
  const csrfCheck = validateTrustedOrigin(req);
  if (!csrfCheck.valid) {
    logger.security('admin-auth', `Bloqueio CSRF em workspace/logout: ${csrfCheck.reason}`, { req });
    return NextResponse.json(
      {
        success: false,
        status: 'partial_failure',
        databaseRevocation: 'skipped',
        cookiesCleared: false,
        message: 'Requisição de logout bloqueada por política de origem (CSRF).',
      } satisfies WorkspaceLogoutResponse,
      { status: 403 }
    );
  }

  let databaseRevocation: 'revoked' | 'skipped' | 'failed' = 'skipped';

  try {
    const adminSessionData = await getAdminSessionUser(req, { allowConflict: true });
    if (adminSessionData) {
      const repo = new AdminRepository();
      repo.revokeSession(adminSessionData.session.id);

      // Confirma que a linha foi efetivamente removida do SQLite
      const stillPresent = repo.getSessionByTokenHash(adminSessionData.session.token_hash);
      if (stillPresent) {
        databaseRevocation = 'failed';
        logger.error(
          'admin-auth',
          `Sessão administrativa ${adminSessionData.session.id} permaneceu no banco após comando de logout`,
          { user_id: adminSessionData.user.id, req }
        );
      } else {
        databaseRevocation = 'revoked';
        logger.info('admin-auth', `Logout do Workspace concluído para admin: ${adminSessionData.user.email}`, {
          user_id: adminSessionData.user.id,
          req,
        });
      }
    }
  } catch (err: any) {
    databaseRevocation = 'failed';
    logger.error('admin-auth', `Exceção ao revogar admin_session no logout: ${err.message}`, { req });
  }

  const isFailed = databaseRevocation === 'failed';

  const body: WorkspaceLogoutResponse = {
    success: !isFailed,
    status: isFailed ? 'partial_failure' : 'complete',
    databaseRevocation,
    cookiesCleared: true,
    message: isFailed
      ? 'Os cookies do navegador foram expirados, mas ocorreu uma falha ao revogar a sessão administrativa no banco de dados. Recomendamos tentar novamente ou fechar o navegador.'
      : 'Sessões encerradas com segurança.',
    securityNote:
      'O cookie buscavag_session foi expirado no navegador (mecanismo stateless HMAC; cópias externas não possuem revogação individual server-side).',
  };

  const response = NextResponse.json(body, { status: isFailed ? 207 : 200 });

  // Expira buscavag_session com atributos reais
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

  // Expira admin_session com atributos reais
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
