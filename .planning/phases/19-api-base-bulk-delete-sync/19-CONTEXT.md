# Phase 19: Context & Decisions

## Context
A Fase 19 visa prover as bases de API para as funcionalidades da Milestone 5:
- Bulk delete via `DELETE /api/jobs`
- Trigger de scraping via `POST /api/scraper/trigger`

## Decisões Técnicas
1. **Bulk Delete no SQLite (`JobRepository.deleteJobs`)**:
   - Gera placeholders dinâmicos `IN (?, ?, ...)`
   - Retorna boolean baseado em `result.changes > 0`.
2. **Scraper Trigger**:
   - `spawn('npm', ['run', 'start'], { detached: true, stdio: 'ignore' })`
   - Não bloqueia o endpoint e permite retorno instantâneo com JSON de confirmação.
