import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionUser } from '@/lib/admin-auth';
import { db } from '@/db/index';
import { JobRepository } from '@/db/repository';
import { AdminUserRepository } from '@/db/adminUserRepository';
import { AdminCompanyRepository } from '@/db/adminCompanyRepository';
import { AdminPaymentRepository } from '@/db/adminPaymentRepository';
import { AdminScraperRepository } from '@/db/adminScraperRepository';

export const dynamic = 'force-dynamic';

export interface AdminDashboardMetrics {
  jobs: {
    total: number;
    approved: number;
    fitRate: number;
    statusCounts: Record<string, number>;
    platformCounts: Record<string, number>;
    topCompanies: Array<{ company: string; count: number }>;
  };
  users: {
    total: number;
    candidates: number;
    admins: number;
    newLast7Days: number;
  };
  companies: {
    total: number;
    activePartners: number;
    prospects: number;
    mappedJobs: number;
  };
  financial: {
    mrr: number;
    totalRevenue: number;
    activeSubscribers: number;
  };
  infrastructure: {
    totalConnectors: number;
    activeConnectors: number;
    avgLatencyMs: number;
    healthyCount: number;
  };
}

export async function GET(req: NextRequest) {
  try {
    const sessionData = await getAdminSessionUser(req);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }

    // 1. Métricas de Vagas e Pipeline
    const jobRepo = new JobRepository();
    const jobStats = jobRepo.getStats();
    const totalJobs = jobStats?.totalJobs || 0;
    const approvedJobs = jobStats?.approvedJobs || 0;
    const fitRate = totalJobs > 0 ? Math.round((approvedJobs / totalJobs) * 100) : 0;

    // 2. Métricas de Usuários / Talentos
    const userRow = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role != 'ADMIN' OR role IS NULL THEN 1 ELSE 0 END) as candidates,
        SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as new_last_7_days
      FROM users
    `).get() as {
      total: number;
      admins: number;
      candidates: number;
      new_last_7_days: number;
    };

    // 3. Métricas de Empresas B2B
    const companyRepo = new AdminCompanyRepository();
    const companyStats = companyRepo.getAdminCompanyStats();

    // 4. Métricas Financeiras
    const paymentRepo = new AdminPaymentRepository();
    const paymentStats = paymentRepo.getPaymentStats();

    // 5. Métricas de Infraestrutura / Scrapers
    const scraperRepo = new AdminScraperRepository();
    const scraperMonitoring = scraperRepo.getMonitoringMetrics();

    const data: AdminDashboardMetrics = {
      jobs: {
        total: totalJobs,
        approved: approvedJobs,
        fitRate,
        statusCounts: jobStats?.statusCounts || {},
        platformCounts: jobStats?.platformCounts || {},
        topCompanies: jobStats?.topCompanies || [],
      },
      users: {
        total: userRow?.total || 0,
        candidates: userRow?.candidates || 0,
        admins: userRow?.admins || 0,
        newLast7Days: userRow?.new_last_7_days || 0,
      },
      companies: {
        total: companyStats?.totalCompanies || 0,
        activePartners: companyStats?.activePartners || 0,
        prospects: companyStats?.prospectCompanies || 0,
        mappedJobs: companyStats?.totalMappedJobs || 0,
      },
      financial: {
        mrr: paymentStats?.mrr || 0,
        totalRevenue: paymentStats?.totalRevenue || 0,
        activeSubscribers: paymentStats?.activeSubscribers || 0,
      },
      infrastructure: {
        totalConnectors: scraperMonitoring?.summary?.total || 0,
        activeConnectors: scraperMonitoring?.summary?.active || 0,
        avgLatencyMs: scraperMonitoring?.summary?.avgLatencyMs || 0,
        healthyCount: scraperMonitoring?.summary?.success || 0,
      },
    };

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/admin/dashboard/metrics error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro interno ao agregar métricas do dashboard' },
      { status: 500 }
    );
  }
}
