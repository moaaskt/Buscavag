# Phase 5 Plan: Orchestration, VPS Deployment & Automation

## Goal
Construir o entrypoint principal `src/index.ts` unificando scrapers, deduplicação, avaliação Hermes IA e notificação Telegram. Configurar build, `.env.example` e scripts para execução em produção via Cron em VPS Linux.

## Tasks

### Task 1: Main Pipeline Orchestrator
- Criar `src/index.ts` com o fluxo E2E de execução.
- Adicionar logs estruturados de progresso e estatísticas de coleta (novas vagas, vagas aprovadas, notificações enviadas).

### Task 2: Build & Production Configuration
- Configurar scripts no `package.json` (`build`, `start`, `cron`).
- Criar `.env.example` documentando as variáveis necessárias.

### Task 3: VPS Deployment Guide & Documentation
- Criar guia de implantação em `DEPLOY.md` detalhando a instalação de dependências no Linux (Node.js, Playwright Chromium dependencies), configuração de Cron e PM2/Systemd.

## Verification
- Compilar o projeto (`npm run build`).
- Executar o pipeline ponta a ponta (`npm run start`).
