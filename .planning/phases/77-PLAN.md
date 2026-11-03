# Phase 77 Plan: Unificação de Logs & Auditoria Admin (/admin/logs)

## Vision & Goal
Unificar todo o ecossistema de rastreamento, eventos de sistema, ações operacionais e mensageria em uma única tabela `logs` no SQLite de alta performance com índices dedicados. Implementar repositório estruturado com busca textual, paginação e agregação analítica, disponibilizar o endpoint `/api/admin/logs` protegido por `admin_session` e reformular integralmente a interface `/admin/logs` utilizando o **Design System Velzon Interactive (Themesbrand)** com widgets de KPI, inspeção de payload em modal e filtros em tempo real.

---

## Requirements Addressed

- **`REQ-77-01` (Esquema SQLite Unificado & Índices)**: Criar a tabela `logs` no `src/db/index.ts` com colunas `id`, `tipo` (`sistema` | `acao` | `mensageria`), `nivel` (`info` | `warning` | `error` | `security`), `origem`, `mensagem`, `metadata` (JSON textual estruturado) e `created_at` indexado.
- **`REQ-77-02` (LogRepository & Métodos Analíticos)**: Implementar `src/db/logRepository.ts` com métodos tipados para inserção, paginação com ordenação descendente, filtros multi-critério (tipo, nível, origem, data), busca textual com `LIKE` e cálculo de estatísticas (contadores por nível e tipo).
- **`REQ-77-03` (Integração no Logger Central & Auditoria de Ações)**: Atualizar `src/lib/logger.ts` para persistir diretamente na tabela `logs` unificada e criar utilitário `logAdminAction(adminUser, acao, recurso, detalhes, req?)` para auditoria automática de intervenções operacionais (disparos de scrapers, expurgos, reconfiguração de 2FA).
- **`REQ-77-04` (API REST de Logs `/api/admin/logs`)**: Implementar endpoint `src/app/api/admin/logs/route.ts` suportando busca textual (`search`), paginação (`page`, `limit`), filtros (`tipo`, `nivel`, `origem`, `period`) e agregação analítica (`stats=true`).
- **`REQ-77-05` (Interface Velzon Interactive `/admin/logs`)**: Reformular `src/app/admin/logs/page.tsx` dentro do `AdminLayout`, com widgets `VelzonStatWidget` (Total 24h, Ações Admin, Alertas, Erros), tabela soft-tint paginada, badges temáticos (`VelzonBadge`) e modal de inspeção de payload JSON (`VelzonModal`).
- **`REQ-77-06` (Suíte de Testes Automatizada)**: Criar `src/test-phase77.ts` com 10 testes determinísticos cobrindo schema, índices, paginação, filtros, busca textual, persistência de metadados JSON e proteção de acesso.

---

## Proposed Changes

### Component 1: Esquema de Banco de Dados Unificado

#### [MODIFY] [index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar no script de inicialização do SQLite:
  ```sql
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,       -- 'sistema' | 'acao' | 'mensageria'
    nivel TEXT NOT NULL,      -- 'info' | 'warning' | 'error' | 'security'
    origem TEXT NOT NULL,     -- 'auth', 'scraper', 'admin_action', 'telegram', etc.
    mensagem TEXT NOT NULL,
    metadata TEXT,            -- JSONB textual serializado
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_logs_tipo ON logs(tipo);
  CREATE INDEX IF NOT EXISTS idx_logs_nivel ON logs(nivel);
  CREATE INDEX IF NOT EXISTS idx_logs_origem ON logs(origem);
  CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
  ```

---

### Component 2: Repositório de Logs & Auditoria

#### [NEW] [logRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/logRepository.ts)
- Implementar classe `LogRepository` com:
  - Interfaces: `LogEntry`, `CreateLogDTO`, `LogFilterParams`, `PaginatedLogsResult`, `LogStatsSummary`.
  - Métodos:
    - `insertLog(data: CreateLogDTO): LogEntry`
    - `queryLogs(params: LogFilterParams): PaginatedLogsResult`
    - `getLogStats(periodHours?: number): LogStatsSummary`
    - `purgeLogsOlderThan(days: number): number`

---

### Component 3: Integração no Logger e Ações de Auditoria

#### [MODIFY] [logger.ts](file:///home/moa-dev/projetos/buscavag/src/lib/logger.ts)
- Atualizar `SystemLogger.log()` para gravar tanto em `logs` quanto no formato unificado com metadados estruturados.
- Exportar helper `logAdminAction(adminUser: { id: string; email: string }, action: string, details?: Record<string, any>, req?: Request)` salvando com `tipo: 'acao'` e `nivel: 'info'`.

---

### Component 4: Endpoint REST `/api/admin/logs`

#### [NEW] [route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/logs/route.ts)
- GET `/api/admin/logs`:
  - Extrai query parameters: `page`, `limit`, `tipo`, `nivel`, `origem`, `search`, `period`, `stats`.
  - Valida permissão de acesso via sessão administrativa ativa.
  - Retorna JSON estruturado com paginação e dados de logs ou estatísticas agregadas.

---

### Component 5: Interface `/admin/logs` com Design System Velzon Interactive

#### [MODIFY] [page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/logs/page.tsx)
- Integrar com `AdminLayout` e componentes `VelzonCard`, `VelzonBadge`, `VelzonStatWidget` e `VelzonModal`.
- Seção de KPI com 4 widgets de topo:
  - Total de Logs (24h)
  - Intervenções de Administrador (`tipo = 'acao'`)
  - Alertas do Sistema (`nivel = 'warning'`)
  - Erros Críticos / Falhas (`nivel = 'error'`)
- Barra de filtros:
  - Input de busca textual em tempo real com debounce
  - Filtro de Tipo (Todos, Sistema, Ações, Mensageria)
  - Filtro de Nível (Todos, Info, Aviso, Erro, Segurança)
  - Filtro de Período (Última hora, 24 horas, 7 dias, Todos)
- Tabela com formatação de data brasileira, badges coloridos soft-tint, visualização truncada de mensagem e botão de inspeção de metadata.
- Modal para exibição formatada do payload JSON com botão para copiar para clipboard.

---

### Component 6: Suíte de Testes Automatizada

#### [NEW] [test-phase77.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase77.ts)
- Suíte automatizada com 10 testes determinísticos:
  1. **T01**: Criação da tabela `logs` e índices no SQLite.
  2. **T02**: Inserção de logs dos três tipos (`sistema`, `acao`, `mensageria`).
  3. **T03**: Paginação de logs com offset, limit e cálculo de páginas.
  4. **T04**: Filtro estrito por `tipo` (`acao` vs `sistema`).
  5. **T05**: Filtro estrito por `nivel` (`error` vs `info`).
  6. **T06**: Busca textual (`search`) por palavra-chave na mensagem ou origem.
  7. **T07**: Filtro por período temporal (`created_at` limite).
  8. **T08**: Persistência e parse de `metadata` em JSON estruturado.
  9. **T09**: Agregação analítica e contadores em `getLogStats()`.
  10. **T10**: Integração e gravação através de `logger.info()` e `logAdminAction()`.

---

## Verification Plan

### Automated Tests
1. Execução da suíte dedicada da Phase 77:
   ```bash
   npx tsx src/test-phase77.ts
   ```
2. Execução da suíte de regressão da fase anterior:
   ```bash
   npx tsx src/test-phase76.ts
   ```
3. Execução do test runner unificado do BuscaVag:
   ```bash
   npm test
   ```
4. Verificação de compilação estrita TypeScript:
   ```bash
   npx tsc --noEmit
   ```
5. Validação do build de produção Next.js:
   ```bash
   npm run build:next
   ```

### Manual Verification
- Acessar `/admin/logs` no navegador com sessão de admin ativa.
- Verificar os widgets de estatísticas no topo da página.
- Realizar buscas textuais e testar a alternância entre os filtros de tipo e nível.
- Clicar no botão "Ver Detalhes" de um log para inspecionar o modal JSON com botão de copiar.
- Disparar uma sincronização no dashboard e verificar a gravação em tempo real da ação administrativa.
