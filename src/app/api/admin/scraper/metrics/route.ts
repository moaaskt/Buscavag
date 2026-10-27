import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionUser } from '@/lib/admin-auth';
import { AdminScraperRepository } from '@/db/adminScraperRepository';

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
    const repo = new AdminScraperRepository();
    const connectorName = searchParams.get('name');

    if (connectorName) {
      const limit = parseInt(searchParams.get('limit') || '25', 10);
      const logs = repo.getConnectorLogs(connectorName, limit);
      const config = repo.getConfig(connectorName);

      return NextResponse.json(
        {
          success: true,
          connector: config,
          logs,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    const metrics = repo.getMonitoringMetrics();

    return NextResponse.json(
      {
        success: true,
        data: metrics.items,
        summary: metrics.summary,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[API Admin Scraper Metrics GET Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao consultar métricas dos conectores' },
      { status: 500 }
    );
  }
}
