# Phase 12 Plan: Motor Unificado de Extração de Data e Filtro Rígido

## Objective
Aprimorar o motor de parsing e normalização de datas em `src/utils/date.ts` para lidar com todos os formatos comuns em portais brasileiros (ex: "há 2 horas", "publicada ontem", "3d atrás", "postado há 1 semana", "02/09/2026", "2 de setembro", "2026-09-01T12:00:00Z", etc) e aplicar uma camada de filtro rígido de 5 dias corridos tanto no nível de scraper quanto na entrada do pipeline principal (`src/index.ts`).

## Context & Requirements
- **Requisito FLT-01:** O sistema deve aplicar um filtro rígido de recência, rejeitando qualquer vaga com mais de 5 dias corridos de publicação.
- **Requisito FLT-02:** O mecanismo de extração de datas deve ser unificado e preciso para as 20+ plataformas integradas.

## Implementation Steps

### 1. Robustecimento de `src/utils/date.ts`
- Implementar suporte completo a:
  - Textos relativos em português: "hoje", "ontem", "anteontem", "há X minutos", "há X horas", "há X dias", "X d atrás", "há X semanas", "há X meses".
  - Textos relativos em inglês: "just now", "today", "yesterday", "X hours ago", "X days ago", "Xd", "X weeks ago".
  - Datas absolutas brasileiras: "DD/MM/YYYY", "DD/MM/YY", "DD/MM", "DD de Mês de YYYY", "DD de Mês".
  - Datas ISO 8601 e timestamps Unix.
  - Fallback explícito seguro: quando nenhuma data puder ser inferida, registrar aviso e/ou atribuir a data atual apenas se a plataforma for de feed em tempo real, ou marcar como data desconhecida.
- Implementar `isOlderThanDays(date: Date, days: number = 5): boolean` com cálculo preciso baseado em milissegundos / dias corridos.

### 2. Criação de Testes Unitários de Data (`src/test-phase12.ts`)
- Testar exaustivamente dezenas de variações de formatos de datas relativas e absolutas.
- Validar o cálculo de corte de 5 dias com datas de 1 a 10 dias atrás.

### 3. Integração e Validação no Pipeline Principal
- Garantir que `src/index.ts` e todos os scrapers usem a função normalizada `parseRelativeDate` e `isOlderThanDays`.

## Verification
- Executar `npx tsx src/test-phase12.ts` e certificar que todos os cenários de parsing e corte de 5 dias passam com 100% de sucesso.
- Executar `npm run build` para garantir integridade do TypeScript.
