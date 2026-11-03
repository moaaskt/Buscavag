# Phase 5: Orchestration, VPS Deployment & Automation - Context & Decisions

## Context
Fase final de integração e automação. Unificação de todos os componentes (Scrapers, Filtro de Data, SQLite, Avaliador Hermes IA e Notificador Telegram) em um pipeline autônomo acionável via CLI e Cron na VPS.

## Design Decisions
1. **Pipeline Unificado (`src/index.ts`)**:
   - Etapa 1: Rodar o `ScraperOrchestrator` para coletar vagas do LinkedIn, Gupy, Indeed, Google Jobs e Telegram.
   - Etapa 2: Filtrar vagas por deduplicação (`repo.exists`) e data de publicação (< 5 dias).
   - Etapa 3: Submeter vagas não existentes ao `HermesEvaluator` para pontuação e classificação.
   - Etapa 4: Gravar no SQLite como `isJuniorFullStack`.
   - Etapa 5: Buscar vagas pendentes de notificação no banco e enviar via `TelegramNotifier`.
2. **CLI & Scripts NPM**:
   - `npm run start` ou `npm run cron` para acionar o pipeline.
   - `npm run build` para compilar TypeScript em `dist/`.
3. **Automação VPS**:
   - Gerar exemplo de configuração do `crontab` (2x ao dia: 08:00 e 18:00).
   - Suporte a arquivo `.env` para fácil deploy em ambiente Linux.
