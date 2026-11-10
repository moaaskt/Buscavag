'use client';

import React from 'react';
import { StatusPlaceholderCard } from '@/components/workspace/StatusPlaceholderCard';
import { Users2Icon } from 'lucide-react';

export default function GestaoWorkspacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações & Gestão</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Controle de acesso, administração de contas de usuários, histórico financeiro e métricas executivas.
        </p>
      </div>

      <StatusPlaceholderCard
        title="Administração, RBAC & Finanças"
        category="Configurações e Gestão"
        description="Painel de controle administrativo para governança de permissões, suporte a usuários via impersonate, histórico de pagamentos e acompanhamento de métricas operacionais."
        icon={Users2Icon}
        targetPhase="Migração Programada: Phase 104"
        legacyRoute="/admin/usuarios"
        legacyTitle="Gestão de Usuários Legada (/admin/usuarios)"
        features={[
          'Gestão de usuários com alteração de papéis (CANDIDATE, ADMIN) e status da conta (/admin/usuarios)',
          'Ferramenta segura de impersonação de usuários para atendimento e suporte técnico',
          'Histórico de assinaturas, concessão de cortesias e logs de webhooks de pagamento (/admin/pagamentos)',
          'Dashboard executiva com métricas de retenção, conversão e engajamento (/admin/dashboard)',
          'Configurações globais de segurança, autenticação de dois fatores (2FA) e sessões',
          'Preservação estrita das tabelas financeiras existentes sem quebras de integridade',
        ]}
      />
    </div>
  );
}

