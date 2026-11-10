'use client';

import React from 'react';
import { StatusPlaceholderCard } from '@/components/workspace/StatusPlaceholderCard';
import { DatabaseIcon } from 'lucide-react';

export default function InteligenciaWorkspacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Inteligência de Mercado</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Curadoria do banco de dados de vagas, inteligência de contratação de empresas e trilha de auditoria.
        </p>
      </div>

      <StatusPlaceholderCard
        title="Gestão de Vagas, Empresas & Auditoria"
        category="Inteligência"
        description="Controle analítico do repositório de vagas coletadas, catalogação de empresas parceiras, expurgo de registros não-tech e monitoramento de eventos de segurança."
        icon={DatabaseIcon}
        targetPhase="Migração Programada: Phase 103"
        legacyRoute="/admin/vagas"
        legacyTitle="Gestão de Vagas Legada (/admin/vagas)"
        features={[
          'Tabela completa de vagas com filtros por stack, senioridade e modelo de trabalho (/admin/vagas)',
          'Rotina automatizada de deduplicação semântica e purga de vagas não-tech',
          'Gestão cadastral de empresas contratantes e métricas de demanda B2B (/admin/empresas)',
          'Trilha detalhada de logs de sistema, auditoria de segurança e acessos (/admin/logs)',
          'Exportação de dados consolidados para relatórios analíticos',
          'Governança centralizada de retenção de histórico no SQLite',
        ]}
      />
    </div>
  );
}

