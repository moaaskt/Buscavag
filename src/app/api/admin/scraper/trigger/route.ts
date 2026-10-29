import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let runId = '';
    try {
      const body = await request.json();
      runId = body?.runId || '';
    } catch {
      // Body vazio é aceitável
    }

    const cwd = process.cwd();

    // Passa o RUN_ID via variável de ambiente para unificar logs do ciclo
    const env = {
      ...process.env,
      ...(runId ? { SCRAPER_RUN_ID: runId } : {}),
      PYTHONUNBUFFERED: '1',
    };

    // Spawn the scraper process detached so it runs in the background
    const child = spawn('npm', ['run', 'start'], {
      cwd,
      detached: true,
      stdio: 'ignore',
      env,
      shell: process.platform === 'win32',
    });

    // Unref the child process so the main Node.js process doesn't wait for it
    child.unref();

    return NextResponse.json({
      success: true,
      runId,
      message: 'Scraper iniciado em background com sucesso.',
    });
  } catch (error) {
    console.error('[API /api/scraper/trigger error]:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
