import { NextRequest, NextResponse } from 'next/server';
import { ScraperLogger, ScraperEvent } from '@/services/scraperLogger';
import { checkAdminSessionSecurity } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Envia evento inicial de conexão estabelecida
      const initialEvent: ScraperEvent = {
        id: 'init',
        runId: 'system',
        scraperName: 'System',
        level: 'INFO',
        message: 'Conectado ao canal de streaming de logs em tempo real.',
        timestamp: new Date().toISOString(),
        step: 'START',
      };

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`));

      // Inscreve no EventEmitter do ScraperLogger
      const unsubscribe = ScraperLogger.subscribe((event: ScraperEvent) => {
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error('[SSE Stream enqueue error]:', err);
        }
      });

      // Heartbeat a cada 15s para manter a conexão ativa
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      // Tratamento quando o cliente fecha a conexão
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Evita buffering em proxies Nginx
    },
  });
}
