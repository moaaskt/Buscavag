# Phase 11 Plan: Orquestração Paralela e Resiliência

## Objective
Aprimorar a classe `ScraperOrchestrator` em `src/scrapers/index.ts` para suportar execução concorrente/paralela com limite de concorrência (ex: pool com p-limit ou chunks de Promise.allSettled) e mecanismo de retry/timeout por scraper individual. Isso reduzirá drasticamente o tempo total de execução da coleta das 20+ fontes sem sobrecarregar a máquina host (evitando concorrência descontrolada de instâncias Playwright).

## Context & Architecture
- Atualmente, o orchestrator executa 20 scrapers de forma estritamente sequencial (`for ... of`), totalizando quase 3 minutos.
- Alguns scrapers usam Playwright (consumo de CPU/memória) enquanto outros usam HTTP/Cheerio (muito leve).
- A orquestração deve:
  1. Executar scrapers concorrentemente com controle de concorrência (ex: 4 a 6 scrapers simultâneos).
  2. Implementar timeout defensivo individual para cada scraper (ex: 45s a 60s por scraper) para evitar travamento infinito do loop.
  3. Manter isolamento completo de erros (falha em uma fonte não aborta as demais).
  4. Manter alerta automático de falha via `TelegramNotifier`.
  5. Coletar e consolidar métricas de execução (duração de cada scraper, total de vagas por fonte e tempo total).

## Implementation Steps

### 1. Mecanismo de Pool de Concorrência e Timeout
- Criar helper de pool de concorrência/execução paralela controlada (ou função utilitária `pLimit` simples em TypeScript puro sem dependências desnecessárias) em `src/utils/concurrency.ts`.
- Criar wrapper de execução segura com `timeoutPromise` para garantir que nenhum scraper prenda a fila indefinidamente.

### 2. Refatoração do `ScraperOrchestrator` (`src/scrapers/index.ts`)
- Configurar parâmetro opcional de concorrência no construtor (default: `concurrency = 4` ou `5`).
- Implementar execução paralela controlada usando o limitador de concorrência.
- Coletar status (`fulfilled` vs `rejected`), registrar métricas de performance e emitir log consolidado.

### 3. Teste e Validação de Performance (`src/test-phase11.ts`)
- Criar script de benchmark comparativo medindo tempo sequencial vs paralelo.
- Garantir que todas as 20 fontes funcionem harmonicamente em paralelo sem conflito de portas ou exaustão de recursos.

## Verification
- Executar `src/test-phase11.ts` e verificar redução no tempo total de ciclo (de ~160s para ~30-50s).
- Confirmar que nenhum erro em scraper individual causa quebra da execução global.
- Garantir 0 erros de compilação com `npm run build`.
