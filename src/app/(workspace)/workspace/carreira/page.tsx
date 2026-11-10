'use client';

import React from 'react';
import { StatusPlaceholderCard } from '@/components/workspace/StatusPlaceholderCard';
import { BriefcaseIcon } from 'lucide-react';

export default function CarreiraWorkspacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Minha Carreira</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Área unificada para gestão de oportunidades profissionais, matching algorítmico e pipeline de candidaturas.
        </p>
      </div>

      <StatusPlaceholderCard
        title="Módulo de Carreira & Oportunidades"
        category="Minha Carreira"
        description="Esta área unificará o Feed de Vagas Tech, o Quadro Kanban de Processos Seletivos e a Análise de Currículo por IA em uma experiência de alta densidade sem travas comerciais."
        icon={BriefcaseIcon}
        targetPhase="Migração Programada: Phase 102"
        legacyRoute="/candidate"
        legacyTitle="Painel do Candidato (/candidate)"
        features={[
          'Feed de Vagas com cálculo de compatibilidade IA e filtros facetados por stack técnica',
          'Quadro Kanban interativo de candidaturas com persistência de status (/board)',
          'Upload e extração automatizada de competências a partir de PDF com Gemini AI',
          'Vagas salvas, notas pessoais e histórico completo de candidaturas',
          'Acesso sem limites comerciais artificiais (Descomissionamento Pro)',
          'Navegação rápida entre vagas recomendadas e quadro visual de acompanhamento',
        ]}
      />
    </div>
  );
}

