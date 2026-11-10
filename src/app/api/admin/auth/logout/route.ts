import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionUser, ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth';
import { AdminRepository } from '@/db/adminRepository';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const sessionData = await getAdminSessionUser(req, { allowConflict: true });
    const repo = new AdminRepository();

    if (sessionData) {
      repo.revokeSession(sessionData.session.id);
      logger.info('admin-auth', `Logout administrativo realizado: ${sessionData.user.email}`, {
        user_id: sessionData.user.id,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Sessão administrativa encerrada com sucesso',
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    console.error('[Admin Logout Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao encerrar sessão' },
      { status: 500 }
    );
  }
}
