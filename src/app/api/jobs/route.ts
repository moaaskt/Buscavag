import { NextRequest, NextResponse } from 'next/server';
import { JobRepository } from '@/db/repository';
import { CandidateRepository } from '@/db/candidateRepository';
import { getSessionUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const status = searchParams.get('status') || undefined;
    const minScore = searchParams.get('minScore') ? Number(searchParams.get('minScore')) : undefined;
    const search = searchParams.get('search') || undefined;
    const onlyApproved = searchParams.get('onlyApproved') === 'true';
    const period = searchParams.get('period') || undefined;
    const location = searchParams.get('location') || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const session = await getSessionUser(request);
    const userId = session?.userId;

    const repo = new JobRepository();
    const jobs = repo.getAllJobs({
      category,
      platform,
      status,
      minScore,
      search,
      onlyApproved,
      period,
      location,
      city,
      state,
      userId,
    });

    return NextResponse.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    logger.error('jobs', 'Erro ao listar vagas em /api/jobs GET', {
      metadata: { error: (error as Error).message },
      req: request,
    });
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionUser(request);
    if (!session?.userId) {
      logger.security('jobs', 'Tentativa de exclusão em massa sem autenticação', { req: request });
      return NextResponse.json(
        { success: false, error: 'Apenas usuários autenticados podem ocultar ou excluir vagas.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lista de IDs inválida ou vazia.' },
        { status: 400 }
      );
    }

    // Se for Administrador, realiza exclusão física no banco global
    if (session.role === 'ADMIN') {
      const repo = new JobRepository();
      const deleted = repo.deleteJobs(ids);

      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Nenhuma vaga foi encontrada para exclusão.' },
          { status: 404 }
        );
      }

      logger.info('jobs', `Admin ${session.email} excluiu permanentemente ${ids.length} vagas`, {
        userId: session.userId,
        metadata: { ids },
        req: request,
      });

      return NextResponse.json({ success: true, count: ids.length, action: 'deleted' });
    }

    // Se for Candidato/Usuário regular, oculta as vagas apenas para seu perfil (Multi-tenant)
    const candidateRepo = new CandidateRepository();
    const result = candidateRepo.hideJobs(session.userId, ids);

    logger.info('jobs', `Usuário ${session.email} ocultou ${ids.length} vagas`, {
      userId: session.userId,
      metadata: { ids, hiddenCount: result.count },
      req: request,
    });

    return NextResponse.json({ success: true, count: ids.length, action: 'hidden' });
  } catch (error) {
    logger.error('jobs', 'Erro no processamento de exclusão/ocultação em /api/jobs DELETE', {
      metadata: { error: (error as Error).message },
      req: request,
    });
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

