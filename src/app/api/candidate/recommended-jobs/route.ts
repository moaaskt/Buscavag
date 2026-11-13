import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { CandidateRepository } from '@/db/candidateRepository';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const minScore = searchParams.get('minScore') ? Number(searchParams.get('minScore')) : 0;
    const search = searchParams.get('search') || undefined;
    const workModel = searchParams.get('workModel') || undefined;
    const platform = searchParams.get('platform') || undefined;
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 40;
    const offset = (page - 1) * limit;

    const repo = new CandidateRepository();
    const user = repo.getUserById(session.userId);
    const tier = user?.tier || session.tier || 'premium';
    const isCompleted = repo.isOnboardingComplete(session.userId);

    if (!user || !isCompleted) {
      return NextResponse.json({ success: false, error: 'onboarding_required' }, { status: 403 });
    }

    const result = repo.getRecommendedJobs(session.userId, {
      minScore,
      search,
      workModel,
      platform,
      limit,
      offset,
    });

    const processedItems = result.items.map((item) => ({
      ...item,
      isLocked: false,
    }));

    return NextResponse.json({
      success: true,
      count: processedItems.length,
      totalCount: result.totalCount,
      tier,
      unlockedCount: processedItems.length,
      candidate: result.candidate,
      data: processedItems,
    });
  } catch (error: any) {
    console.error('Error in GET /api/candidate/recommended-jobs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar vagas recomendadas' },
      { status: 500 }
    );
  }
}
