import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionUser } from '@/lib/admin-auth';
import { AdminCompanyRepository } from '@/db/adminCompanyRepository';
import { logAdminAction } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionData = await getAdminSessionUser(req);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const repo = new AdminCompanyRepository();

    if (searchParams.get('statsOnly') === 'true') {
      const stats = repo.getAdminCompanyStats();
      return NextResponse.json({ success: true, stats });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const planTier = searchParams.get('planTier') || 'all';
    const sortBy = (searchParams.get('sortBy') as any) || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

    const result = repo.getAdminCompanies({
      page,
      limit,
      search,
      status,
      planTier,
      sortBy,
      sortOrder,
    });

    const stats = repo.getAdminCompanyStats();

    return NextResponse.json({
      success: true,
      ...result,
      stats,
    });
  } catch (err: any) {
    console.error('[API Admin Empresas GET Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao consultar empresas B2B' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionData = await getAdminSessionUser(req);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const repo = new AdminCompanyRepository();

    // Ação Especial: Sincronização em lote a partir das vagas
    if (body.action === 'sync_jobs') {
      const syncResult = repo.syncCompaniesFromJobs();
      logAdminAction(
        sessionData.user,
        'Sincronização de Empresas B2B a partir de Vagas',
        {
          syncedCount: syncResult.syncedCount,
          totalJobsScanned: syncResult.totalJobsScanned,
          adminEmail: sessionData.user.email,
        },
        req
      );

      return NextResponse.json({
        success: true,
        message: `${syncResult.syncedCount} novas empresas sincronizadas com sucesso.`,
        ...syncResult,
      });
    }

    // Cadastro Manual de Empresa
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'O nome da empresa é obrigatório' },
        { status: 400 }
      );
    }

    const company = repo.createCompany({
      name: body.name,
      slug: body.slug,
      logo_url: body.logo_url,
      website: body.website,
      industry: body.industry,
      description: body.description,
      recruiter_name: body.recruiter_name,
      recruiter_email: body.recruiter_email,
      recruiter_phone: body.recruiter_phone,
      plan_tier: body.plan_tier,
      status: body.status,
      featured_job_limit: body.featured_job_limit ? parseInt(body.featured_job_limit, 10) : 0,
      notes: body.notes,
    });

    logAdminAction(
      sessionData.user,
      'Cadastro de Empresa B2B',
      {
        companyId: company.id,
        name: company.name,
        plan_tier: company.plan_tier,
        status: company.status,
        adminEmail: sessionData.user.email,
      },
      req
    );

    return NextResponse.json({
      success: true,
      company,
    });
  } catch (err: any) {
    console.error('[API Admin Empresas POST Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao salvar empresa B2B' },
      { status: 500 }
    );
  }
}
