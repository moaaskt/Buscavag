# Phase 78 Plan: Gestão de Vagas Expostas & Job de Expurgo Seguro no SQLite (/admin/vagas)

## Vision & Goal
Disponibilizar uma central de controle operacional de vagas expostas em `/admin/vagas` sob o **Design System Velzon Interactive (Themesbrand)**, combinada com um motor de expurgo seguro em lotes no SQLite para instâncias VPS limitadas. O sistema introduz controle estrito de ciclo de vida com a coluna `status` (`'active'` | `'expired'` | `'hidden'`), blindando as consultas públicas de candidatos, permitindo edição rápida in-place de falhas de scraping, soft-hide instantâneo com 1 clique e execução de expurgo em lotes compatíveis (`LIMIT 500`) com proteção inviolável para vagas de candidatos (`user_saved_jobs`) e liberação gradual de espaço em disco via `PRAGMA incremental_vacuum(1000)`.

---

## Requirements Addressed

- **`REQ-78-01` (Esquema SQLite & Ciclo de Vida da Vaga)**:
  - Adicionar coluna `status TEXT DEFAULT 'active'` na tabela `jobs` com índice `idx_jobs_status`.
  - Configurar migração segura para preencher registros legados como `'active'`.
  - Configurar `PRAGMA auto_vacuum = INCREMENTAL;` para permitir recuperação gradual de disco.
  - Criar configuração padrão `job_retention_days = '21'` na tabela `admin_settings`.

- **`REQ-78-02` (Blindagem das Consultas Públicas & Candidato)**:
  - Atualizar `JobRepository.getAllJobs` e endpoints públicos (`/api/jobs`, `/api/candidate/recommended-jobs`, `/api/candidate/board`) para filtrar estritamente `(jobs.status IS NULL OR jobs.status = 'active')`, ocultando imediatamente vagas `'hidden'` ou `'expired'`.

- **`REQ-78-03` (Repositório de Gestão de Vagas - AdminJobRepository)**:
  - Implementar métodos dedicados em repositório:
    - `getAdminJobs(params)`: Paginação, busca textual (`title`, `company`, `tech_stack`), filtros de status (`all`, `active`, `expired`, `hidden`), plataforma e modelo de trabalho.
    - `getAdminJobStats()`: Contagem em tempo real de Total de Vagas, Vagas Ativas, Vagas Ocultas/Expiradas e Elegíveis para Expurgo.
    - `updateJob(id, patch)`: Edição rápida de campos de scraping (`title`, `company`, `location`, `work_model`, `required_seniority`, `tech_stack`, `salary`, `status`).
    - `toggleJobHide(id)`: Ação rápida alternando entre `'active'` e `'hidden'`.
    - `deleteJobPermanent(id)`: Remoção definitiva de vaga com limpeza de relações órfãs.

- **`REQ-78-04` (Motor de Expurgo Seguro & Incremental Vacuum na VPS)**:
  - `previewPurge(retentionDays)`: Retorna a quantidade exata de vagas que atendem aos critérios sem excluí-las.
  - `executeBatchPurge(retentionDays, batchSize)`: Executa exclusão em lotes de 500 registros utilizando a subquery compatível com SQLite padrão:
    ```sql
    DELETE FROM jobs 
    WHERE id IN (
      SELECT id FROM jobs 
      WHERE created_at < datetime('now', '-' || ? || ' days')
        AND status = 'expired'
        AND id NOT IN (SELECT job_id FROM user_saved_jobs)
      LIMIT ?
    );
    ```
  - Executar em loop até zerar o lote e finalizar com `PRAGMA incremental_vacuum(1000);`.
  - Registrar auditoria com `logAdminAction` detalhando vagas removidas, retenção e tempo de execução.

- **`REQ-78-05` (Endpoints REST Administrativos)**:
  - `GET /api/admin/vagas`: Listagem paginada, filtros e estatísticas consolidadas (protegido por `admin_session`).
  - `PATCH /api/admin/vagas/[id]`: Edição rápida e toggle de soft-hide.
  - `DELETE /api/admin/vagas/[id]`: Exclusão definitiva avulsa com auditoria.
  - `POST /api/admin/jobs/purge`: Disparo de expurgo (preview ou execução) com autenticação dual (`admin_session` ou header `Authorization: Bearer <CRON_SECRET>`).

- **`REQ-78-06` (Interface Velzon Interactive `/admin/vagas`)**:
  - 4 `VelzonStatWidget` de topo (Total Expostas, Vagas Ativas, Vagas Ocultas/Expiradas, Elegíveis para Expurgo).
  - Barra de operações com busca em tempo real, seleção de Plataforma, Status, Modelo de Trabalho e botão "Executar Expurgo Seguro".
  - Tabela Velzon com badges soft-tint por status e botões de ação rápida (Link externo, Soft-hide, Edição e Exclusão).
  - Modais Velzon: Edição Rápida in-place, Confirmação de Expurgo com feedback de liberação de disco e Confirmação de Exclusão Definitiva.

- **`REQ-78-07` (Suíte de Testes Automatizada)**:
  - Criar `src/test-phase78.ts` com 10 testes determinísticos cobrindo schema, pragmas SQLite, blindagem pública, paginação admin, soft-hide, edição rápida, exclusão avulsa, proteção estrita de `user_saved_jobs`, expurgo em lotes e autenticação dual da API de expurgo.

---

## Proposed Changes

### Component 1: Banco de Dados & Pragmas SQLite

#### [MODIFY] [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar coluna `status TEXT DEFAULT 'active'` no DDL e na lista de colunas migráveis de `jobs`.
- Criar índice `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`.
- Configurar rotina para habilitar `PRAGMA auto_vacuum = INCREMENTAL;`.
- Inserir configuração padrão `job_retention_days = '21'` em `admin_settings` se não existir.

---

### Component 2: Blindagem das Rotas Públicas e de Candidatos

#### [MODIFY] [src/db/repository.ts](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts)
- No método `getAllJobs`, garantir que consultas públicas sempre incluam `AND (jobs.status IS NULL OR jobs.status = 'active')` a menos que um status específico tenha sido solicitado por admin.
- Atualizar tipo `JobFilterOptions` para acomodar `adminMode?: boolean`.

---

### Component 3: Repositório Administrativo de Vagas

#### [NEW] [src/db/adminJobRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/adminJobRepository.ts)
- Métodos:
  - `getAdminJobs(params: AdminJobFilterParams): PaginatedAdminJobsResult`
  - `getAdminJobStats(retentionDays?: number): AdminJobStats`
  - `updateJob(id: string, patch: Partial<ProcessedJob>): boolean`
  - `toggleJobHide(id: string): { newStatus: string }`
  - `deleteJobPermanent(id: string): boolean`
  - `previewPurge(retentionDays: number): { eligibleCount: number }`
  - `executeBatchPurge(retentionDays: number, batchSize?: number): { totalDeleted: number; batches: number }`

---

### Component 4: Endpoints REST Administrativos

#### [NEW] [src/app/api/admin/vagas/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/vagas/route.ts)
- `GET`: Retorna vagas paginadas com filtros (`search`, `platform`, `status`, `workModel`, `page`, `limit`) e `stats`.

#### [NEW] [src/app/api/admin/vagas/[id]/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/vagas/[id]/route.ts)
- `PATCH`: Edição rápida e toggle de soft-hide com auditoria `logAdminAction`.
- `DELETE`: Exclusão manual definitiva com auditoria `logAdminAction`.

#### [NEW] [src/app/api/admin/jobs/purge/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/jobs/purge/route.ts)
- `POST`: Executa ou pré-visualiza o expurgo seguro. Suporta sessão de admin ou token `CRON_SECRET`.

---

### Component 5: Interface Velzon Interactive (/admin/vagas)

#### [NEW] [src/app/admin/vagas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx)
- Desenvolvido dentro do `AdminLayout`.
- 4 `VelzonStatWidget` no topo:
  - Total de Vagas
  - Vagas Ativas
  - Vagas Ocultas / Expiradas
  - Elegíveis para Expurgo
- Barra de Operações com busca em tempo real, seleção de Plataforma, Status e Modelo.
- Botão "Executar Expurgo Seguro" com modal explicativo e contagem em tempo real.
- Tabela com paginação limpa, badges soft-tint e ações rápidas (abrir link, toggle soft-hide, editar e excluir).
- Modais Velzon:
  - Modal de Edição Rápida (formulário limpo).
  - Modal de Confirmação de Expurgo Seguro com feedback de execução.
  - Modal de Confirmação de Exclusão Definitiva.

---

### Component 6: Testes Automatizados & Validação

#### [NEW] [src/test-phase78.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase78.ts)
- Suíte completa com 10 testes determinísticos:
  1. `T01`: Coluna `status` e índice `idx_jobs_status` existem na tabela `jobs`.
  2. `T02`: Configuração de `auto_vacuum` INCREMENTAL e execução segura de `incremental_vacuum`.
  3. `T03`: `getAllJobs` público ignora vagas `'hidden'` e `'expired'`.
  4. `T04`: Consulta administrativa paginada de vagas com filtros combinados.
  5. `T05`: Ação rápida de Soft-Hide alterna perfeitamente entre `'active'` e `'hidden'`.
  6. `T06`: Edição rápida in-place atualiza campos estruturados da vaga.
  7. `T07`: Exclusão definitiva de vaga avulsa e auditoria via `logAdminAction`.
  8. `T08`: Proteção estrita de vagas em `user_saved_jobs` contra expurgo.
  9. `T09`: Execução de expurgo seguro em lotes (`LIMIT 500`) com subquery compatível.
  10. `T10`: Endpoint de expurgo valida autenticação via `admin_session` ou `CRON_SECRET`.

---

## Verification Plan

### Automated Tests
```bash
npx tsx src/test-phase78.ts
npx tsx src/test-phase77.ts
npx tsx src/test-phase76.ts
npm test
npx tsc --noEmit
npm run build:next
```

### Manual Verification
- Acessar `/admin/vagas` com a sessão administrativa.
- Testar a filtragem por busca e status.
- Testar o botão de soft-hide e verificar desaparecimento na rota pública `/jobs`.
- Testar a edição in-place no modal Velzon.
- Testar a pré-visualização e disparo do expurgo seguro.
