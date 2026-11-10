'use client';

import React from 'react';
import { StatusPlaceholderCard } from '@/components/workspace/StatusPlaceholderCard';
import { BotIcon } from 'lucide-react';

export default function OperacaoWorkspacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Operação e Coleta</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Infraestrutura autônoma de varredura contínua de vagas, automação de scrapers e console em tempo real.
        </p>
      </div>

      <StatusPlaceholderCard
        title="Central de Scrapers & Coleta Autônoma"
        category="Operação e Coleta"
        description="Gestão das 34 fontes de coleta de vagas (LinkedIn, Gupy, Facebook Groups, etc.), controle de agendamento por cron e visualização de streaming SSE em tempo real."
        icon={BotIcon}
        targetPhase="Migração Programada: Phase 103"
        legacyRoute="/admin/scrapers"
        legacyTitle="Central de Scrapers Legada (/admin/scrapers)"
        features={[
          'Painel unificado de status e execução para as 34 fontes de vagas integradas',
          'Terminal SSE com streaming de saída ao vivo dos processos em execução (/admin/scrapers/terminal)',
          'Disparo pontual ou contínuo de coletores com parametrização dinâmica',
          'Configuração de limites de requisição, timeouts e headers anti-bloqueio (/admin/scrapers/config)',
          'Métricas de rendimento de coleta: vagas novas, duplicadas e taxa de erro',
          'Integração nativa com automação Chromium e autenticação segura de sessões',
        ]}
      />
    </div>
  );
}

