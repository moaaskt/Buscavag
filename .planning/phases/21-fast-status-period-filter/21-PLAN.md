# Phase 21: Ações Rápidas de Status e Filtro de Período no Explorador

## Objetivo
1. Adicionar dropdown/ícones de alteração rápida de status diretamente no `JobCard` (sem necessidade de abrir o modal).
2. Adicionar o filtro de período (recência) na barra de filtros da página `/jobs` e integrá-lo no backend (`JobRepository.getAllJobs` / `/api/jobs`).

## Requisitos Atendidos
- [ ] **ACT-01**: Ações Individuais de Status — Menu dropdown / seletor direto de status no `JobCard`.
- [ ] **FIL-01**: Componente de Filtro de Tempo — `<select>` na barra de filtros.
- [ ] **FIL-02**: Opções de Período — "Todas as datas", "Últimas 24 horas", "Últimas 48 horas", "Esta semana (7 dias)", "Este mês".
- [ ] **FIL-03**: Lógica Combinada — Filtro cruzado com Plataforma, Categoria, Status, Score IA comparando `published_at` / `created_at`.

## Alterações Propostas
1. **`src/db/repository.ts`**:
   - Atualizar `JobFilterOptions` para incluir `period?: string`.
   - Em `getAllJobs`, estender a consulta SQL para filtrar a data (`published_at` ou `created_at`) de acordo com o parâmetro:
     - `24h`: `>= datetime('now', '-24 hours')` ou `julianday('now') - julianday(published_at) <= 1`
     - `48h`: `>= datetime('now', '-48 hours')` ou `julianday('now') - julianday(published_at) <= 2`
     - `7d`: `>= datetime('now', '-7 days')` ou `julianday('now') - julianday(published_at) <= 7`
     - `30d`: `>= datetime('now', '-30 days')` ou `julianday('now') - julianday(published_at) <= 30`
2. **`src/app/api/jobs/route.ts`**:
   - Ler o `searchParams.get('period')` e repassar para `repo.getAllJobs({ ..., period })`.
3. **`src/components/JobCard.tsx`**:
   - Adicionar dropdown/seletor interativo no status badge do card com callback `onStatusChange(job.id, newStatus)`.
4. **`src/app/jobs/page.tsx`**:
   - Adicionar o estado `period` (default: `'all'`).
   - Adicionar o select na barra de filtros.
   - Passar `period` em `fetchJobs` e repassar `onStatusChange` para os cards através do `JobListHoverEffect`.
