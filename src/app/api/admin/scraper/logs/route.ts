import { NextRequest, NextResponse } from 'next/server';
import { LogRepository } from '@/db/logRepository';
import { LogLevel } from '@/types/log';
import { checkAdminSessionSecurity } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionCheck = await checkAdminSessionSecurity(request);
    if (!sessionCheck.success || !sessionCheck.data) {
      if (sessionCheck.conflict) {
        return NextResponse.json(
          { success: false, error: sessionCheck.error, conflict: true },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const level = (searchParams.get('level') as LogLevel) || undefined;
    const scraperName = searchParams.get('scraperName') || undefined;
    const runId = searchParams.get('runId') || undefined;
    const period = searchParams.get('period') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;
    const getRuns = searchParams.get('runs') === 'true';

    const repo = new LogRepository();

    if (getRuns) {
      const runs = repo.getRecentRuns(20);
      return NextResponse.json({ success: true, count: runs.length, data: runs });
    }

    const { logs, total } = repo.getLogs({
      level,
      scraperName,
      runId,
      period,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      total,
      count: logs.length,
      limit,
      offset,
      data: logs,
    });
  } catch (error) {
    console.error('[API /api/scraper/logs error]:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
