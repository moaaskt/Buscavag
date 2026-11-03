# Phase 48 PLAN — Polimento de UI, Scraper Stream & Zero-State DB

Realizar ajustes finais de qualidade: Reset DB script, isolamento de status anônimo, fix do SSE stream com python -u, padronização do tema claro/escuro e limpeza de CTAs duplicados.

## Tasks
1. Criar `scripts/reset-db.js`.
2. Garantir isolamento de status em `src/db/repository.ts`.
3. Ajustar `PYTHONUNBUFFERED=1` nas rotas do scraper.
4. Executar validação e `npm run build`.
