import { NextRequest, NextResponse } from 'next/server';
import { JobRepository } from '@/db/repository';
import { checkAdminSessionSecurity } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionCheck = await checkAdminSessionSecurity(req);
    if (!sessionCheck.success || !sessionCheck.data) {
      if (sessionCheck.conflict) {
        return NextResponse.json(
          {
            success: false,
            error: sessionCheck.error || 'Conflito de sessão ativo. Resolva a identidade no Workspace antes de executar operações administrativas.',
            conflict: true,
            code: 'CONFLICT_DETECTED',
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const repo = new JobRepository();
    const result = repo.purgeNonTech();

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} vagas não-tech foram removidas do banco de dados com sucesso.`,
    });
  } catch (error) {
    console.error('[API /api/admin/jobs/purge-non-tech error]:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
