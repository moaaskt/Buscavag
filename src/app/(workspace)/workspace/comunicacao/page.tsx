'use client';

import React from 'react';
import { StatusPlaceholderCard } from '@/components/workspace/StatusPlaceholderCard';
import { MessageSquareIcon } from 'lucide-react';

export default function ComunicacaoWorkspacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Comunicação & Mensageria</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Hub central de notificação automática de vagas e alertas instantâneos para Telegram e WhatsApp.
        </p>
      </div>

      <StatusPlaceholderCard
        title="Hub de Notificações & Integrações"
        category="Comunicação"
        description="Gestão de disparos automáticos para bots do Telegram e Meta Cloud API (WhatsApp), com filtros estritos de relevância por senioridade e stack tecnológica."
        icon={MessageSquareIcon}
        targetPhase="Migração Programada: Phase 104"
        legacyRoute="/admin/mensageria"
        legacyTitle="Central de Mensageria Legada (/admin/mensageria)"
        features={[
          'Filtro estrito de notificações Telegram por score de matching e teto de senioridade',
          'Integração oficial Meta Cloud API para WhatsApp Business com templates aprovados',
          'Fila de disparos com reprocessamento automático e controle de rate-limiting',
          'Histórico e log de mensagens entregues, falhas de envio e reenvios manuais',
          'Ferramenta interativa de teste de disparo para canais configurados (/admin/mensageria)',
          'Configuração dinâmica de canais públicos e privados de transmissão de vagas',
        ]}
      />
    </div>
  );
}

