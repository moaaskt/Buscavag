# Phase 21: Context & Decisions

## Context
A Fase 21 implementa:
1. Alteraçāo rápida de status diretamente nos cards de vaga (`JobCard`), permitindo transições instantâneas entre Inbox, Aplicado, Entrevista, Oferta e Descartado.
2. Filtro de período (recência) no Explorador (`/jobs`), filtrando vagas por 24h, 48h, 7d, 30d ou Todas as datas.

## Decisões Técnicas
- **JobCard (`src/components/JobCard.tsx`)**:
  - `statusInfo` agora pode ser acionado como um `DropdownMenu`.
  - Callback `onStatusChange(job.id, newStatus, e)` com `e.stopPropagation()` para evitar acionar a navegação/modal ao mudar de status.
- **Backend / SQLite (`JobRepository.getAllJobs`)**:
  - Parâmetro `period` aceita `'24h'`, `'48h'`, `'7d'`, `'30d'`.
  - Filtra utilizando `datetime(published_at) >= datetime('now', '-X hours/days')`.
- **Explorador (`src/app/jobs/page.tsx`)**:
  - Select de Período inserido no grid de filtros.
  - Integrado com `fetchJobs` e `clearFilters`.
