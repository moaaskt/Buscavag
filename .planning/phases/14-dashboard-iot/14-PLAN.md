# Phase 14 Plan: Dashboard de Especialidades de Hardware & IoT

## Objective
Atualizar a interface visual do Next.js (Dashboard principal, Explorador de Vagas `/jobs`, Kanban Board `/board` e componentes `JobCard`, `JobModal`) para exibir com destaque visual a nova categoria `"IoT & Automação"`, badges dedicados de hardware/ESP32, filtros de busca específicos e suporte a todas as 20 fontes integradas no seletor de plataformas.

## Context & Requirements
- **IA-04:** O dashboard de compatibilidade deve apresentar o score e feedback considerando as novas verticais de IoT e Automação Residencial.
- O seletor de plataformas atual em `/jobs` tem apenas 9 opções hardcoded, precisando ser atualizado para listar todas as 20 fontes ativas.
- O componente `JobCard` precisa de estilos de badge personalizados para as 11 novas plataformas (ex: `sao_jose`, `vagas_sc`, `vagas_floripa`, `emprega_palhoca`, `infojobs`, `chawork`, `bne`, etc.) e para a categoria `"IoT & Automação"`.

## Implementation Steps

### 1. Atualização dos Componentes de UI
- **`src/components/JobCard.tsx`:**
  - Adicionar cores/badges elegantes para todas as 20 plataformas (`sao_jose`, `vagas_sc`, `vagas_floripa`, `emprega_palhoca`, `infojobs`, `chawork`, `trabalha_brasil`, `bne`, `bebee`, `empregos`, `recruta_simples`, `recrutei_empregos`, `quickin`, `recrutei_jobs`, `pandape`).
  - Adicionar badge com visual moderno com ícone/gradiente (ex: cor âmbar/laranja de hardware) para a categoria `"IoT & Automação"`.
- **`src/components/JobModal.tsx`:**
  - Suporte a exibição do badge de `"IoT & Automação"`.

### 2. Atualização das Páginas do Dashboard
- **`src/app/jobs/page.tsx`:**
  - Atualizar o `<select>` de plataformas com todas as 20 opções organizadas por agrupamento (Principais, Regionais SC, Nacionais, ATSs).
  - Atualizar o `<select>` de categorias incluindo `"IoT & Automação"`.
- **`src/app/page.tsx` (Dashboard Home):**
  - Garantir que a distribuição por categoria e lista de vagas recomendadas renderizem a nova vertical perfeitamente.

### 3. Validação e Build do Next.js
- Executar `npm run build:next` para garantir que todas as páginas e rotas Next.js continuem compilando com tipagem TypeScript 100% válida.

## Verification
- Validar a compilação do Next.js (`npm run build:next`).
- Verificar que todos os filtros de categoria e plataforma funcionam em `/jobs` e `/board`.
