import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionUser } from '@/lib/admin-auth';
import { whatsappService } from '@/services/whatsappService';
import { TelegramNotifier } from '@/services/telegramNotifier';
import { logAdminAction } from '@/lib/logger';
import { AdminJobRepository } from '@/db/adminJobRepository';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionData = await getAdminSessionUser(req);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Sessão administrativa ausente ou inválida' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da vaga não informado' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { canal, destinatario, mensagem, parseMode } = body;

    if (!canal || !mensagem) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros canal e mensagem são obrigatórios.' },
        { status: 400 }
      );
    }

    // Valida se a vaga existe
    const repo = new AdminJobRepository();
    const existingJob = repo.getJobById(id);
    if (!existingJob) {
      return NextResponse.json(
        { success: false, error: 'Vaga não encontrada' },
        { status: 404 }
      );
    }

    let sendResult: { success: boolean; messageId?: string; mock?: boolean; error?: string };

    if (canal === 'whatsapp') {
      sendResult = await whatsappService.sendMessage(destinatario || '', mensagem);
    } else if (canal === 'telegram') {
      const notifier = new TelegramNotifier();
      sendResult = await notifier.sendMessage(destinatario || '', mensagem, parseMode || 'HTML');
    } else {
      return NextResponse.json(
        { success: false, error: `Canal inválido: ${canal}. Utilize 'whatsapp' ou 'telegram'.` },
        { status: 400 }
      );
    }

    // Auditoria de Ação do Administrador
    logAdminAction(
      sessionData.user,
      `Disparo de vaga para canal (${canal}): ${existingJob.title} (${existingJob.company})`,
      {
        jobId: id,
        jobTitle: existingJob.title,
        company: existingJob.company,
        canal,
        destinatario: destinatario || 'default',
        mensagemPreview: mensagem.slice(0, 120),
        resultSuccess: sendResult.success,
        mock: !!sendResult.mock,
      },
      req
    );

    return NextResponse.json({
      success: sendResult.success,
      messageId: sendResult.messageId,
      mock: sendResult.mock,
      error: sendResult.error,
    });
  } catch (err: any) {
    console.error('[API Admin Vagas Dispatch Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar disparo da vaga' },
      { status: 500 }
    );
  }
}
