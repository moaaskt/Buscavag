# Phase 78: Gestão de Vagas Expostas & Job de Expurgo Seguro no SQLite (/admin/vagas) — Sumário de Entrega

**Data de Conclusão:** 29/09/2026  
**Milestone:** 21.0 — Expansão do Painel Administrativo, Sessão Isolada, Mensageria & Expurgo Automático  
**Branch:** `dev`  
**Status:** Concluído com 100% de Sucesso (10/10 Testes Aprovados)

---

## 1. Visão Geral da Entrega
A Phase 78 estabeleceu a central operacional de controle de vagas em `/admin/vagas` com o **Design System Velzon Interactive (Themesbrand)**, combinada a um motor de expurgo seguro em lotes projetado especificamente para as limitações de disco e memória de instâncias VPS. Foi introduzido o ciclo de vida da vaga com a coluna `status` (`'active'` | `'expired'` | `'hidden'`), a blindagem de consultas públicas de candidatos, a edição in-place de falhas de scraping, a ação instantânea de soft-hide com 1 clique e a manutenção progressiva de disco com `PRAGMA incremental_vacuum(1000)`.

---

## 2. Arquitetura e Componentes Desenvolvidos

### 2.1 Esquema e Ciclo de Vida no SQLite ([src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts))
- Adição da coluna `status TEXT DEFAULT 'active'` na tabela `jobs`.
- Migração automática e idempotente garantindo que registros legados recebam `status = 'active'`.
- Índice de alta performance `idx_jobs_status ON jobs(status)`.
- Configuração de `PRAGMA auto_vacuum = INCREMENTAL;` garantindo que exclusões liberem páginas sem duplicação de arquivo.
- Seed de `job_retention_days = '21'` na tabela `admin_settings`.

### 2.2 Blindagem de Rotas Públicas & Candidatos ([src/db/repository.ts](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts), [src/types/job.ts](file:///home/moa-dev/projetos/buscavag/src/types/job.ts))
- Campo `status: z.enum(['active', 'expired', 'hidden'])` adicionado ao `ProcessedJobSchema`.
- `JobRepository.getAllJobs` agora filtra compulsoriamente:
  `AND (jobs.status IS NULL OR jobs.status = 'active')` quando `!filters?.adminMode`.
- Vagas marcadas como `'hidden'` (soft-hide de operador) ou `'expired'` desaparecem instantaneamente da vitrine do candidato.

### 2.3 Repositório Administrativo de Vagas ([src/db/adminJobRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/adminJobRepository.ts))
- `getAdminJobs(params)`: Paginação limpa, contagem de registros, filtros combinados por plataforma, status, modelo de trabalho e busca textual ampla (`title`, `company`, `tech_stack`, `location`).
- `getAdminJobStats(retentionDays)`: Métricas agregadas em tempo real (Total, Ativas, Ocultas, Expiradas, Elegíveis para Expurgo e contagem por plataforma).
- `updateJob(id, patch)`: Edição rápida in-place de título, empresa, modelo, localização, senioridade, stack e status.
- `toggleJobHide(id)`: Ação rápida alternando entre `'active'` e `'hidden'`.
- `deleteJobPermanent(id)`: Exclusão física definitiva com remoção limpa de relações órfãs em `user_saved_jobs` e `user_hidden_jobs`.
- `previewPurge(retentionDays)`: Contagem de vagas elegíveis sem realizar exclusões.
- `executeBatchPurge(retentionDays, batchSize = 500)`:
  - Subquery compatível com SQLite padrão sem exigir limites diretos em `DELETE`:
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
  - **Proteção Inviolável**: Vagas favoritadas ou aplicadas por candidatos (`user_saved_jobs`) jamais são expurgadas.
  - Execução de `PRAGMA incremental_vacuum(1000);` ao final do loop para devolver páginas livres ao sistema operacional.

### 2.4 Endpoints REST Administrativos
- **`GET /api/admin/vagas`** ([src/app/api/admin/vagas/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/vagas/route.ts)):
  - Protegido por `getAdminSessionUser`.
  - Retorno unificado de listagem paginada e objeto `stats`.
- **`PATCH /api/admin/vagas/[id]`** ([src/app/api/admin/vagas/[id]/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/vagas/%5Bid%5D/route.ts)):
  - Suporta toggle de visibilidade (`action: 'toggle_hide'`) ou atualização de campos, auditado via `logAdminAction`.
- **`DELETE /api/admin/vagas/[id]`** ([src/app/api/admin/vagas/[id]/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/vagas/%5Bid%5D/route.ts)):
  - Exclusão manual permanente com auditoria via `logAdminAction`.
- **`POST /api/admin/jobs/purge`** ([src/app/api/admin/jobs/purge/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/jobs/purge/route.ts)):
  - Autenticação dual: cookie `admin_session` ou header `Authorization: Bearer <CRON_SECRET>` para crontab na VPS.
  - Suporte a `{ preview: true }` e `{ preview: false, retentionDays: N }`.

### 2.5 Interface Velzon Interactive (/admin/vagas) ([src/app/admin/vagas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx))
- **Cards Analíticos (KPIs)**: 4 `VelzonStatWidget` (Total de Vagas, Vagas Ativas, Ocultas/Expiradas, Elegíveis para Expurgo).
- **Barra de Filtros & Operações**:
  - Busca em tempo real com debounce.
  - Seleção dinâmica de Plataforma, Status e Modelo de Trabalho.
  - Botão de destaque "Expurgo Seguro" com badge numérico de vagas elegíveis.
- **Tabela com Badges Soft-Tint & Ações Rápidas**:
  - Badges: Ativa (verde esmeralda), Oculta (âmbar) e Expirada (vermelho suave).
  - Ícone de link externo para inspecionar vaga original em nova aba.
  - Ícone de olho/olho-cortado para alternar soft-hide com atualização otimista imediata.
  - Ícone de lápis para abrir modal de edição rápida.
  - Ícone de lixeira para abrir modal de confirmação de exclusão definitiva.
- **Modais Velzon**:
  1. *Modal de Edição Rápida*: formulário intuitivo para retificar título, empresa, modelo, senioridade, tech stack e status.
  2. *Modal de Expurgo Seguro*: exibição de vagas elegíveis, ajuste de retenção em dias, aviso de preservação de candidatos e feedback de execução com recuperação de disco.
  3. *Modal de Exclusão Definitiva*: confirmação com aviso de irrevogabilidade.

---

## 3. Validação e Qualidade de Código

### 3.1 Suíte de Testes da Phase 78 ([src/test-phase78.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase78.ts))
- **T01**: Coluna `status` e índice `idx_jobs_status` existem no SQLite. (PASS ✓)
- **T02**: `auto_vacuum = INCREMENTAL` ativo e `incremental_vacuum` executável. (PASS ✓)
- **T03**: `getAllJobs` público oculta estritamente vagas com status `'hidden'` e `'expired'`. (PASS ✓)
- **T04**: `getAdminJobs` realiza busca textual, paginação e filtros combinados. (PASS ✓)
- **T05**: `toggleJobHide` alterna perfeitamente entre `'active'` e `'hidden'`. (PASS ✓)
- **T06**: `updateJob` retifica dados in-place (título, empresa, stack, modelo). (PASS ✓)
- **T07**: `deleteJobPermanent` remove vaga definitiva e limpa relações órfãs. (PASS ✓)
- **T08**: Vagas salvas em `user_saved_jobs` NUNCA são deletadas pelo expurgo. (PASS ✓)
- **T09**: `executeBatchPurge` deleta apenas expiradas não-salvas além da retenção em lotes. (PASS ✓)
- **T10**: `previewPurge` retorna contagem exata sem deletar nenhuma vaga. (PASS ✓)
- **Resultado:** `10 aprovados, 0 reprovados (100% de sucesso)`.

### 3.2 Testes de Regressão e Verificações de Build
- **Phase 77 Regression (`npx tsx src/test-phase77.ts`)**: 10/10 PASS ✓
- **Phase 76 Regression (`npx tsx src/test-phase76.ts`)**: 10/10 PASS ✓
- **Suíte Geral (`npm test` / `scripts/test-runner.ts`)**: 9/9 suítes orquestradas com 100% de sucesso ✓
- **Checagem de Tipos Estrita (`npx tsc --noEmit`)**: Zero erros TypeScript ✓
- **Compilação de Produção Turbopack (`npm run build:next`)**: Sucesso em 32/32 rotas geradas, incluindo `/admin/vagas` e endpoints REST `/api/admin/vagas/**` ✓

---

## 4. Próximos Passos
Avançar para a **Phase 79: Gestão de Usuários, Permissões & Suporte (`/admin/usuarios`)**:
- Interface `/admin/usuarios` no padrão Velzon para consulta detalhada de candidatos.
- Ações administrativas: alteração de plano SaaS (Free/Pro), suspensão de conta, solicitação de reset de senha e impersonate auditável.
