import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionUser } from '@/lib/admin-auth';
import { AdminCompanyRepository } from '@/db/adminCompanyRepository';
import { logAdminAction } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getAdminSessionUser(req);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const repo = new AdminCompanyRepository();
    const detail = repo.getCompanyDetail(id);

    if (!detail) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...detail,
    });
  } catch (err: any) {
    console.error('[API Admin Empresa [id] GET Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao consultar detalhes da empresa' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getAdminSessionUser(req);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const repo = new AdminCompanyRepository();

    const updated = repo.updateCompany(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada para atualização' },
        { status: 404 }
      );
    }

    logAdminAction(
      sessionData.user,
      'Atualização de Empresa B2B',
      {
        companyId: updated.id,
        name: updated.name,
        plan_tier: updated.plan_tier,
        status: updated.status,
        adminEmail: sessionData.user.email,
      },
      req
    );

    return NextResponse.json({
      success: true,
      company: updated,
    });
  } catch (err: any) {
    console.error('[API Admin Empresa [id] PUT Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar dados da empresa' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getAdminSessionUser(req);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const repo = new AdminCompanyRepository();
    const existing = repo.getCompanyById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada para exclusão' },
        { status: 404 }
      );
    }

    const deleted = repo.deleteCompany(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Falha ao remover empresa' },
        { status: 500 }
      );
    }

    logAdminAction(
      sessionData.user,
      'Exclusão de Empresa B2B',
      {
        companyId: id,
        name: existing.name,
        adminEmail: sessionData.user.email,
      },
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Empresa removida com sucesso',
    });
  } catch (err: any) {
    console.error('[API Admin Empresa [id] DELETE Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao excluir empresa' },
      { status: 500 }
    );
  }
}
