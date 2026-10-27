import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { ScraperLogger } from '@/services/scraperLogger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let runId = '';
    let scraperName = '';
    try {
      const body = await request.json();
      runId = body?.runId || '';
      scraperName = body?.scraperName || '';
    } catch {
      // Body vazio é aceitável
    }

    const logger = new ScraperLogger(scraperName || 'Pipeline', runId || undefined);
    const resolvedRunId = logger.getRunId();

    const cwd = process.cwd();
    const nodeModulesBin = path.join(cwd, 'node_modules', '.bin');
    const env = {
      ...process.env,
      PATH: `${nodeModulesBin}:${process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'}`,
      SCRAPER_RUN_ID: resolvedRunId,
      SCRAPER_TARGET: scraperName || '',
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
    };

    // Emite log inicial informando disparo do processo autônomo
    logger.info(
      scraperName
        ? `Iniciando conector individual [${scraperName}] via processo isolado...`
        : 'Iniciando pipeline de scraper completo via processo isolado...',
      {
        step: 'START',
        data: { runId: resolvedRunId, scraperName: scraperName || 'ALL' },
      }
    );

    const spawnArgs = ['tsx', 'src/index.ts'];
    if (scraperName) {
      spawnArgs.push('--scraper', scraperName);
    }

    // Spawn do processo via npx tsx para execução direta no runtime
    const child = spawn('npx', spawnArgs, {
      cwd,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) logger.warn(`[Pipeline Stderr]: ${msg}`);
      });
    }

    child.on('error', (err) => {
      logger.error('Erro de execução ao disparar pipeline de scraper (binário ou runtime ausente):', {
        details: err.stack || err.message,
      });
    });

    child.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        logger.error(`Processo do scraper finalizado com código de erro ${code}`, {
          details: code === 127
            ? 'Erro 127: Comando ou runtime (npx/tsx) não encontrado no container. Verifique os binários disponíveis.'
            : `Signal: ${signal || 'nenhum'}`,
        });
      } else {
        logger.info('Processo do scraper finalizado com sucesso.', { step: 'FINISH' });
      }
    });

    child.unref();

    return NextResponse.json({
      success: true,
      runId: resolvedRunId,
      message: 'Sincronização iniciada com sucesso.',
    });
  } catch (error) {
    console.error('[API /api/scraper/run error]:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
