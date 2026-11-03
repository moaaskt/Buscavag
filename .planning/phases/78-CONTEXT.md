# Phase 78 Context — Gestão de Vagas Expostas & Job de Expurgo Seguro no SQLite (/admin/vagas)

## Contexto e Objetivo
O BuscaVag ingere continuamente centenas de vagas diárias de mais de 25 plataformas e comunidades. Para manter o sistema veloz, a VPS com disco enxuto e o catálogo de vagas relevante e auditável, a **Phase 78** entrega:
1. **Painel Operacional em `/admin/vagas`**: Listagem paginada no padrão Velzon Interactive com filtros avançados, KPIs analíticos, edição rápida in-place de erros de scraping e ação instantânea de soft-hide.
2. **Ciclo de Vida & Status Administrativo da Vaga**: Adição da coluna `status` (`'active'` | `'expired'` | `'hidden'`) na tabela `jobs`, blindando as rotas públicas de candidatos para expor estritamente vagas ativas.
3. **Rotina de Expurgo Seguro em Lotes**: Limpeza automatizada de vagas antigas (retenção padrão de 21 dias configurável em `admin_settings`), utilizando subquery compatível com SQLite padrão (`LIMIT 500`) para não travar o banco.
4. **Proteção Estrita de Vagas Salvas/Aplicadas**: Preservação inviolável de qualquer vaga que possua referência em `user_saved_jobs` (garantindo que candidaturas e o Kanban do candidato nunca percam histórico).
5. **Conservação de Espaço em Disco para VPS Limitada**: Configuração de `PRAGMA auto_vacuum = INCREMENTAL;` e acionamento de `PRAGMA incremental_vacuum(1000);` ao final do expurgo, evitando o perigoso `VACUUM` pleno (que duplica o arquivo do DB e pode derrubar a VPS).
6. **Mecanismo Híbrido de Execução**: Botão manual com pré-visualização no painel administrativo + endpoint protegido `/api/admin/jobs/purge` (compatível com sessão de admin e `CRON_SECRET` para chamadas via crontab do Linux).

---

## Decisões Arquiteturais e de Implementação (Locked Decisions)

### 1. Esquema de Banco de Dados e Ciclo de Vida da Vaga
- **Coluna `status` na Tabela `jobs`**:
  - `status TEXT DEFAULT 'active'`
  - Valores válidos: `'active'`, `'expired'`, `'hidden'`.
  - Migração idempotente em `src/db/index.ts` adicionando a coluna e preenchendo vagas existentes com `'active'` caso nulo.
  - Índice dedicado: `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`.
- **Blindagem das APIs Públicas & Candidato**:
  - Em `JobRepository.getAllJobs` e endpoints públicos (`/api/jobs`, `/api/candidate/recommended-jobs`), aplicar cláusula obrigatória:
    `AND (jobs.status IS NULL OR jobs.status = 'active')`.
  - Vagas com `status = 'hidden'` (ocultadas manualmente por operadores) ou `status = 'expired'` somem instantaneamente da vitrine do candidato.

### 2. Gestão de Espaço e Pragma SQLite na VPS
- **Evitar `VACUUM` Pleno**: O comando `VACUUM` padrão cria uma cópia completa do arquivo do banco antes de renomeá-lo. Em instâncias VPS limitadas, isso pode esgotar o disco ou travar I/O.
- **Configuração de `auto_vacuum = INCREMENTAL`**:
  - Configurado na inicialização ou migração controlada do banco (`PRAGMA auto_vacuum = INCREMENTAL`).
  - Permite recuperar páginas livres sob demanda sem lock prolongado e sem duplicar o arquivo em disco.
- **Reivindicação Gradual**:
  - Após a exclusão dos lotes de expurgo, o sistema executa `PRAGMA incremental_vacuum(1000);` liberando até 1000 páginas de freelist para o sistema operacional de forma segura.

### 3. Mecanismo de Expurgo Seguro em Lotes
- **Sintaxe Compatível com SQLite Padrão (Sem Extensão `ENABLE_UPDATE_DELETE_LIMIT`)**:
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
- **Parâmetros**:
  - `retentionDays`: lido da tabela `admin_settings` (chave `job_retention_days`, padrão `21`).
  - `batchSize`: 500 registros por loop de exclusão.
- **Proteção Estrita**:
  - A cláusula `AND id NOT IN (SELECT job_id FROM user_saved_jobs)` impede terminantemente a deleção de qualquer vaga favoritada, aplicada ou em entrevista por qualquer candidato do sistema.
- **Auditoria Operacional**:
  - Cada execução de expurgo gera log auditável via `logAdminAction` (ou origem `'system_purge'`) com quantidade de vagas expurgadas, dias de retenção e tempo de execução.

### 4. Endpoints REST Administrativos
- **`GET /api/admin/vagas`**:
  - Listagem paginada (`page`, `limit=25`, `totalPages`, `total`).
  - Filtros: `search` (título, empresa, stack), `platform`, `status` (`'all'`, `'active'`, `'expired'`, `'hidden'`), `workModel` (`'all'`, `'remoto'`, `'hibrido'`, `'presencial'`).
  - Retorno conjunto com `stats` de vagas (Total, Ativas, Ocultas, Expiradas, Elegíveis para Expurgo).
- **`PATCH /api/admin/vagas/[id]`**:
  - Atualização rápida de campos: `title`, `company`, `location`, `work_model`, `required_seniority`, `tech_stack`, `salary`, `status`.
  - Permite soft-hide instantâneo (`status: 'hidden'` ↔ `'active'`).
  - Registrado via `logAdminAction`.
- **`DELETE /api/admin/vagas/[id]`**:
  - Exclusão manual definitiva de vaga individual (com modal de confirmação no frontend).
  - Remove vínculos órfãos de visualização/favoritos se aplicável.
  - Registrado via `logAdminAction`.
- **`POST /api/admin/jobs/purge`**:
  - Endpoint híbrido de expurgo seguro:
    - Suporta `{ preview: true }` para retornar contagem de vagas elegíveis sem deletar.
    - Suporta `{ preview: false, retentionDays: N }` para executar o expurgo e o `incremental_vacuum`.
    - Autenticação dual: cookie `admin_session` OU header `Authorization: Bearer <CRON_SECRET>`.

### 5. Interface Velzon Interactive (`/admin/vagas`)
- **Top StatWidgets**:
  - `VelzonStatWidget` 1: Total de Vagas Expostas.
  - `VelzonStatWidget` 2: Vagas Ativas (com badge verde).
  - `VelzonStatWidget` 3: Vagas Ocultas / Expiradas.
  - `VelzonStatWidget` 4: Elegíveis para Expurgo (com alerta e botão de ação rápida).
- **Barra de Operações**:
  - Campo de busca em tempo real com debounce.
  - Dropdowns estilizados: Plataforma, Status, Modelo de Trabalho.
  - Botão de Ação Rápida: "Executar Expurgo Seguro" (com contador badge).
- **Tabela de Vagas Velzon**:
  - Colunas: Vaga / Empresa, Plataforma, Modelo & Local, Publicação, Status (Badge soft-tint), Ações.
  - Ações Rápidas por linha:
    - Ícone Link Externo (abrir link original em nova aba).
    - Ícone Soft-Hide (olho / olho-cortado para alternar status entre ativo e oculto).
    - Ícone Editar (abre modal Velzon de Edição Rápida).
    - Ícone Excluir (abre modal Velzon de Confirmação de Exclusão).
- **Modais Velzon**:
  1. *Modal de Edição Rápida*: formulário intuitivo para retificar título, empresa, localização, modelo, senioridade e status.
  2. *Modal de Confirmação de Expurgo Seguro*: exibe quantidade de vagas elegíveis, confirmação de retenção (21 dias) e feedback de execução com recuperação de espaço SQLite.
  3. *Modal de Exclusão Definitiva*: confirmação com aviso de irrevogabilidade.

---

## Verificação e Suíte de Testes da Fase (`src/test-phase78.ts`)
1. **T01**: Coluna `status` e índice `idx_jobs_status` existem na tabela `jobs`.
2. **T02**: Configuração de `auto_vacuum = INCREMENTAL` e execução segura de `incremental_vacuum`.
3. **T03**: `getAllJobs` público filtra estritamente vagas com `status = 'active'`, ocultando `'hidden'` e `'expired'`.
4. **T04**: Consulta administrativa paginada de vagas com filtros combinados (`search`, `platform`, `status`).
5. **T05**: Ação rápida de Soft-Hide alterna perfeitamente entre `'active'` e `'hidden'`.
6. **T06**: Edição rápida in-place atualiza campos estruturados da vaga (título, senioridade, tech_stack).
7. **T07**: Exclusão definitiva de vaga avulsa e auditoria via `logAdminAction`.
8. **T08**: Proteção estrita de vagas salvas em `user_saved_jobs` contra expurgo.
9. **T09**: Execução de expurgo seguro em lotes (`LIMIT 500`) com subquery compatível e retenção configurável.
10. **T10**: Endpoint `/api/admin/jobs/purge` valida permissões via `admin_session` ou `CRON_SECRET`.
