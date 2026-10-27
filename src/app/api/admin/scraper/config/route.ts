import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionUser } from '@/lib/admin-auth';
import { AdminScraperRepository } from '@/db/adminScraperRepository';
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

    const repo = new AdminScraperRepository();
    const configs = repo.getAllConfigs();

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (err: any) {
    console.error('[API Admin Scraper Config GET Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao consultar configurações de scrapers' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionData = await getAdminSessionUser(req);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, is_enabled, method, timeout_ms } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Parâmetro name é obrigatório' },
        { status: 400 }
      );
    }

    const repo = new AdminScraperRepository();
    const existing = repo.getConfig(name);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Conector "${name}" não encontrado` },
        { status: 404 }
      );
    }

    let updated;
    if (is_enabled !== undefined && typeof is_enabled === 'boolean') {
      updated = repo.toggleScraper(name, is_enabled);
    } else {
      updated = repo.updateConfig(name, { method, timeout_ms });
    }

    logAdminAction(
      sessionData.user,
      `Conector ${name} ${is_enabled ? 'ativado' : 'desativado'}`,
      { name, is_enabled, method, timeout_ms }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Configuração do conector "${name}" atualizada com sucesso`,
    });
  } catch (err: any) {
    console.error('[API Admin Scraper Config PATCH Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar configuração do conector' },
      { status: 500 }
    );
  }
}
