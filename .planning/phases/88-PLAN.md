# Phase 88 Plan: Tabela de Monitoramento de Conectores & Métricas em Tempo Real

## Vision & Goal
Desenvolver e integrar a camada completa de monitoramento operacional de conectores na Central de Scrapers (`/admin/scrapers`). Transformar a visão estática em uma tabela de monitoramento dinâmica com status em tempo real (`running`, `success`, `failed`, `idle`, `disabled`), métricas de latência, volume de vagas capturadas/armazenadas, timestamp relativo, auto-refresh dinâmico e modal de diagnóstico detalhado com logs específicos do conector.

---

## Requirements Addressed

- **`REQ-88-01` (Tabela de Monitoramento & Métricas de Conectores)**:
  - Implementar agregação de métricas no backend cruzando `scraper_configs`, `scraper_logs` e contagem de vagas em `jobs`.
  - Criar o endpoint de alta performance `GET /api/admin/scraper/metrics` com resumo operacional global.
  - Implementar a Tabela de Monitoramento Velzon com status ao vivo, badges de método, latência formatada, indicador de saúde e ações rápidas.
  - Adicionar suporte a polling/auto-refresh automático (toggle ligar/desligar com intervalo de 10 segundos).
  - Adicionar modal de diagnóstico técnico para exibir histórico recente e logs de erro do conector selecionado.
  - Criar a suíte determinística de testes `src/test-phase88.ts` e garantir regressão total de todas as fases.

---

## Proposed Changes

### Component 1: Métricas de Monitoramento no Repositório

#### [MODIFY] [src/db/adminScraperRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/adminScraperRepository.ts)
- Definir tipos e interfaces:
  ```typescript
  export type ScraperOperationalStatus = 'running' | 'success' | 'failed' | 'idle' | 'disabled';

  export interface ScraperMonitoringItem {
    name: string;
    is_enabled: number;
    method: ScraperMethod;
    target_url: string | null;
    timeout_ms: number;
    status: ScraperOperationalStatus;
    last_run_at: string | null;
    last_latency_ms: number | null;
    last_jobs_found: number;
    total_jobs_stored: number;
    last_error: string | null;
    last_run_id: string | null;
  }

  export interface ScraperMonitoringSummary {
    total: number;
    active: number;
    running: number;
    success: number;
    failed: number;
    disabled: number;
    avgLatencyMs: number;
    totalJobsStored: number;
  }
  ```
- Implementar métodos:
  - `getMonitoringMetrics(): { items: ScraperMonitoringItem[]; summary: ScraperMonitoringSummary }`
  - Mapear a relação entre o nome do scraper e a plataforma na tabela `jobs` (ex: `Gupy` -> `gupy`, `LinkedIn` -> `linkedin`, etc.).
  - Consultar últimos registros em `scraper_logs` por conector para determinar status operacional, tempo de execução e mensagens de erro.
  - `getConnectorLogs(scraperName: string, limit?: number)`: retornar os logs mais recentes de um conector específico para auditoria e diagnóstico.

---

### Component 2: Endpoint REST de Métricas de Scrapers

#### [NEW] [src/app/api/admin/scraper/metrics/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/scraper/metrics/route.ts)
- Autenticação de sessão admin via `getAdminSessionUser(req)`.
- Suporte a query params:
  - `name`: busca específica de histórico e logs de um conector (`getConnectorLogs`).
  - Sem params: retorna `{ success: true, data: ScraperMonitoringItem[], summary: ScraperMonitoringSummary }`.
- Cache-control apropriado para polling sem cache obsoleto (`no-store, max-age=0`).

---

### Component 3: Interface de Monitoramento em Tempo Real

#### [MODIFY] [src/app/admin/scrapers/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/page.tsx)
- Integrar consumo da API `/api/admin/scraper/metrics`.
- Adicionar controle de **Auto-Refresh** (toggle com switch e contador ou indicador de última atualização, executando fetch a cada 10 segundos quando ativo).
- Atualizar os Widgets Estatísticos superiores com os dados calculados ao vivo:
  - Total Conectores / Ativos
  - Conectores Saudáveis (Sucesso)
  - Conectores com Falhas Recentes (em destaque com alerta se > 0)
  - Latência Média Global
- Atualizar a Tabela de Monitoramento:
  - Coluna **Conector**: Nome + URL alvo discreta + badge de status ao vivo com animação pulsante se `running`.
  - Coluna **Status**: Tag visual semântica (`EM EXECUÇÃO` azul/pulso, `SUCESSO` verde, `FALHA` vermelho, `OCIOSO` cinza, `DESATIVADO` âmbar).
  - Coluna **Método**: Badge Velzon (`PLAYWRIGHT`, `SSR`, `API`, `COOKIE`).
  - Coluna **Latência**: Valor numérico formatado (ex: `1.7s`, `3.2s`) com destaque se ultrapassar 80% do timeout.
  - Coluna **Vagas (Última / Total)**: Vagas capturadas na última execução e total consolidado no banco.
  - Coluna **Última Execução**: Data/hora formatada ou tempo relativo (ex: "Há 5 min").
  - Coluna **Ações**: Toggle switch de ativação/desativação, botão "Disparar" rápido e botão "Diagnóstico" (ícone `Info` ou `Terminal`) para abrir o modal de detalhes e logs.
- Criar o **Modal de Diagnóstico do Conector** (`VelzonModal`):
  - Exibe histórico recente de execuções do conector selecionado.
  - Mostra logs detalhados, latência e eventuais mensagens de erro capturadas na execução.

---

### Component 4: Suíte Determinística de Testes

#### [NEW] [src/test-phase88.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase88.ts)
- Testes automatizados executáveis com `npx tsx src/test-phase88.ts`:
  1. Verificação da existência do endpoint `/api/admin/scraper/metrics/route.ts`.
  2. Teste de segurança (bloqueio 401 para requisições não autenticadas).
  3. Teste do método `getMonitoringMetrics()` no `AdminScraperRepository`.
  4. Validação da estrutura de `ScraperMonitoringItem` (status, latência, jobs, data).
  5. Validação do cálculo de `summary` (total, ativos, latência média, total de vagas).
  6. Teste de simulação de status `running`, `success` e `failed` a partir de logs.
  7. Teste do método `getConnectorLogs(name)` para diagnóstico.
  8. Verificação de suporte a auto-refresh e modal de diagnóstico em `src/app/admin/scrapers/page.tsx`.

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase88.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
   npx tsx src/test-phase87.ts
   npx tsx src/test-phase86.ts
   npx tsx src/test-phase85.ts
   npx tsx src/test-phase84.ts
   npx tsx src/test-phase83.ts
   npx tsx src/test-phase82.ts
   ```
3. **Regressão Global de Testes**:
   ```bash
   npm test
   ```
4. **Verificação de Tipagem TypeScript**:
   ```bash
   npx tsc --noEmit
   ```

### Manual / Browser Verification
1. Acessar `/admin/scrapers` e observar a tabela de monitoramento renderizando latências e status reais.
2. Ativar o toggle de Auto-Refresh e conferir polling silencioso sem travamento da UI.
3. Clicar no botão de diagnóstico de um conector e verificar os logs específicos exibidos no modal.
4. Acionar um disparo de conector e acompanhar a alteração imediata de status.
