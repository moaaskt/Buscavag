# Phase 33 Plan: Ponte TypeScript ↔ Python (PythonBridgeClient & ScraperOrchestrator Routing)

## Metadata
- **Phase**: 33
- **Milestone**: 9 (Motor Híbrido Scrapling & Blindagem 100% dos Scrapers)
- **Scope**: Criação do cliente de integração `PythonBridgeClient` em TypeScript, extensão da interface `JobScraper` com suporte a `requiresPython: boolean`, e modificação de `ScraperOrchestrator` para rotear dinamicamente e verificar integridade (`healthcheck`).
- **Dependencies**: Phase 32 (Scrapling Engine base)

---

## Objective
Estabelecer a camada de comunicação HTTP interna de alta resiliência entre o runtime Node.js/TypeScript e o microserviço Python `scrapling-engine`. Permitir que adaptadores de scraper no TypeScript declarem a flag `requiresPython: true` (ou usem um adaptador padrão de ponte), delegando a extração pesada e bypass de anti-bot ao motor Python, com fallback e monitoramento integrado.

---

## Detailed Task Breakdown

### Task 1: Implementação do `PythonBridgeClient` (`src/services/pythonBridge.ts`)
- **Arquivo**: `src/services/pythonBridge.ts`
- **Funcionalidades**:
  - Leitura da URL base via `process.env.SCRAPLING_ENGINE_URL || 'http://localhost:8000'`.
  - Método `isAvailable()`: faz chamada rápida `GET /health` com timeout de 2.5s para checar se o microserviço Python está ativo e saudável.
  - Método `scrape(source: string, options?: ScrapeOptions): Promise<RawJob[]>`:
    - Envia requisição `POST /scrape` com payload `{ source, query, location, limit, options }`.
    - Timeout padrão configurável (ex: 35s).
    - Validação do schema de retorno (`ScrapeResponse`), convertendo `JobResponseItem[]` para o formato estrito de `RawJob[]`.
    - Tratamento de falhas e logs descritivos.

### Task 2: Extensão da Interface e Base de Scrapers (`src/scrapers/base.ts`)
- **Arquivo**: `src/scrapers/base.ts`
- **Ações**:
  - Estender `JobScraper`:
    ```typescript
    export interface JobScraper {
      name: string;
      requiresPython?: boolean;
      pythonSourceName?: string; // Nome da fonte no motor Python (ex: 'catho')
      scrape(): Promise<RawJob[]>;
    }
    ```
  - Implementar classe base utilitária `PythonBridgeScraper` implementando `JobScraper`:
    - Permite criar adaptadores TypeScript leves que apenas delegam para o Python engine, facilitando a migração progressiva nas Fases 34 e 35.

### Task 3: Atualização do `ScraperOrchestrator` (`src/scrapers/index.ts`)
- **Arquivo**: `src/scrapers/index.ts`
- **Ações**:
  - No início de `runAll()`, verificar a disponibilidade do motor Python via `PythonBridgeClient.isAvailable()`.
  - Registrar log estruturado informando o status do motor Python (`online` vs `offline`).
  - Durante a execução de cada scraper:
    - Se `scraper.requiresPython === true`:
      - Se o motor Python estiver online, despachar via `pythonBridge.scrape(scraper.pythonSourceName || scraper.name)`.
      - Se o motor Python estiver offline, invocar o método `scraper.scrape()` TypeScript local (fallback) ou reportar log com degradação graciosa.
  - Manter compatibilidade total com os scrapers nativos em TypeScript.

### Task 4: Script de Teste e Validação de Integração (`src/test-python-bridge.ts`)
- **Arquivo**: `src/test-python-bridge.ts`
- **Ações**:
  - Script executável via `npx tsx src/test-python-bridge.ts`.
  - Testa `healthCheck`, rota `/scrape` com fonte mock/ping, e validação do fluxo no `ScraperOrchestrator`.

---

## Verification Plan

1. **TypeScript Typecheck**:
   - `npx tsc --noEmit` garantindo zero erros de tipagem.
2. **Teste Standalone de Ponte**:
   - Executar `src/test-python-bridge.ts` (com e sem o container/servidor Python rodando) para verificar tanto o caminho feliz quanto o fallback/degradação graciosa.
3. **Validação do Orquestrador**:
   - Garantir que `ScraperOrchestrator` inicializa e orquestra sem quebrar nenhum dos 35+ canais existentes.
