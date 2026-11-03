# Phase 85 Plan: Módulo B2B & Gestão de Empresas (`/admin/empresas`)

## Vision & Goal
Implementar o módulo corporativo B2B no painel administrativo do BuscaVag (`/admin/empresas`), permitindo o mapeamento cadastral, relacionamento comercial e acompanhamento das empresas que publicam vagas na plataforma. O sistema integrará um modelo híbrido com tabela dedicada `companies` no SQLite, sincronização automática a partir das vagas existentes no banco de dados (`jobs`), gestão de planos de parceria B2B (`free`, `startup`, `enterprise`), contatos de recrutadores e histórico de vagas ativas vinculadas, com interface de alto padrão Velzon UI e suporte integral a tema claro e escuro.

---

## Requirements Addressed

- **`REQ-85-01` (Módulo B2B / Gestão de Empresas em `/admin/empresas`)**:
  - Criar a tabela `companies` com índices dedicados no SQLite via `src/db/index.ts`.
  - Desenvolver o repositório `AdminCompanyRepository` (`src/db/adminCompanyRepository.ts`) com métodos de listagem paginada, filtros, agregação de vagas ativas, KPIs em tempo real, CRUD e sincronização em lote.
  - Implementar as rotas de API protegidas com autenticação administrativa em `src/app/api/admin/empresas/route.ts` e `src/app/api/admin/empresas/[id]/route.ts`.
  - Integrar o item "Empresas B2B" na barra lateral de navegação (`AdminSidebar.tsx`).
  - Desenvolver a interface visual administrativa `src/app/admin/empresas/page.tsx` com widgets de métricas no topo, busca, filtros por plano e status, tabela paginada, modal de cadastro/edição e modal de detalhes com vagas associadas, utilizando a biblioteca de componentes Velzon UI (`VelzonInput`, `VelzonSelect`, `VelzonTextarea`, `VelzonLabel`, `VelzonBadge`, `VelzonModal`).
  - Desenvolver a suíte de testes automatizados `src/test-phase85.ts` e garantir regressão total.

---

## Proposed Changes

### Component 1: Esquema de Banco de Dados & Repositório B2B

#### [MODIFY] [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar a definição da tabela `companies` na função `initDatabase()`:
  - `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `slug TEXT UNIQUE NOT NULL`, `logo_url TEXT`, `website TEXT`, `industry TEXT`, `description TEXT`, `recruiter_name TEXT`, `recruiter_email TEXT`, `recruiter_phone TEXT`, `plan_tier TEXT DEFAULT 'free'`, `status TEXT DEFAULT 'active'`, `featured_job_limit INTEGER DEFAULT 0`, `notes TEXT`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.
- Adicionar os índices:
  - `idx_companies_name`, `idx_companies_slug`, `idx_companies_status`, `idx_companies_plan_tier`, `idx_companies_created_at`.
- Executar sincronização inicial idempotente de empresas a partir de `jobs` na inicialização ou via repositório.

#### [NEW] [src/db/adminCompanyRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/adminCompanyRepository.ts)
- Implementar tipos TypeScript: `AdminCompany`, `AdminCompanyInput`, `AdminCompanyStats`, `AdminCompanyFilterParams`.
- Métodos da classe `AdminCompanyRepository`:
  - `getAdminCompanies(params)`: Listagem paginada com contagem dinâmica de vagas ativas (`COUNT(j.id) as active_jobs_count`), busca textual por nome, website, recrutador ou indústria, e filtros por `status` e `plan_tier`.
  - `getAdminCompanyStats()`: Métricas agregadas (total de empresas, parceiras ativas com planos `startup`/`enterprise`, empresas em prospecção e total de vagas ativas associadas).
  - `getCompanyDetail(id)`: Retorna os dados completos da empresa e as últimas vagas indexadas dela (`WHERE LOWER(jobs.company) = LOWER(companies.name)`).
  - `createCompany(data)`: Geração de ID único `comp_...`, slug limpo e único, e persistência no banco.
  - `updateCompany(id, data)`: Atualização de campos cadastrais, dados de contato e plano.
  - `deleteCompany(id)`: Exclusão segura de registro.
  - `syncCompaniesFromJobs()`: Escaneia nomes distintos na tabela `jobs` e cadastra empresas inéditas de forma idempotente.

---

### Component 2: Endpoints da API Administrativa

#### [NEW] [src/app/api/admin/empresas/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/empresas/route.ts)
- Proteção estrita via `getAdminSessionUser(req)`.
- `GET`: Retorna listagem paginada de empresas e consolidação de estatísticas/KPIs.
- `POST`: Cria nova empresa ou processa a ação especial `{ action: 'sync_jobs' }` para sincronização em lote de empresas a partir das vagas indexadas, registrando ação de auditoria (`logAdminAction`).

#### [NEW] [src/app/api/admin/empresas/[id]/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/empresas/[id]/route.ts)
- `GET`: Retorna detalhes da empresa e listagem de vagas vinculadas.
- `PUT`: Atualiza dados cadastrais, plano ou status com auditoria operacional.
- `DELETE`: Exclui a empresa do cadastro corporativo com auditoria operacional.

---

### Component 3: Navegação na Sidebar

#### [MODIFY] [src/components/admin/layout/AdminSidebar.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/layout/AdminSidebar.tsx)
- Importar `Building2` de `lucide-react`.
- Inserir o item `{ name: 'Empresas B2B', href: '/admin/empresas', icon: Building2 }` na seção "Operações SaaS", mantendo o padrão sem badges alcançado na Phase 84.

---

### Component 4: Interface Visual do Módulo B2B

#### [NEW] [src/app/admin/empresas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/empresas/page.tsx)
- Página interativa React (`'use client'`) integrada com `AdminLayout`:
  - **Banner Superior**: Título "Gestão de Empresas & Parcerias B2B", subtítulo corporativo, botões "Sincronizar Vagas" e "Nova Empresa".
  - **Widgets de KPIs Velzon**: 4 cards elegantes no topo (Total de Empresas, Parceiras Ativas, Em Prospecção, Vagas Vinculadas).
  - **Barra de Busca & Filtros**: Campo de pesquisa textual e dropdowns para Plano B2B e Status utilizando `VelzonInput` e `VelzonSelect`.
  - **Tabela de Empresas**: Avatar com logo/iniciais, nome da empresa, indústria, website, badge de plano B2B, badge de status, contagem de vagas associadas e botões de ação rápida (Ver Detalhes, Editar, Excluir).
  - **Paginação**: Controle intuitivo de navegação de páginas e contagem de registros.
  - **Modal de Cadastro / Edição**: Formulário modal utilizando `VelzonModal`, `VelzonInput`, `VelzonSelect`, `VelzonTextarea` e `VelzonLabel` com suporte a Light e Dark Mode e contraste impecável.
  - **Modal de Detalhes da Empresa**: Exibição detalhada de contatos do recrutador (com link de WhatsApp direto), dados comerciais e tabela de vagas ativas publicadas por aquela empresa no BuscaVag.

---

### Component 5: Suíte Determinística de Testes

#### [NEW] [src/test-phase85.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase85.ts)
- Testes automatizados executáveis com `npx tsx src/test-phase85.ts`:
  1. Criação e existência da tabela `companies` e seus índices no SQLite.
  2. Criação de nova empresa com slug único via `AdminCompanyRepository`.
  3. Consulta paginada, filtros por status e plano no repositório.
  4. Cálculo de estatísticas e métricas de parcerias B2B.
  5. Sincronização idempotente de empresas a partir da tabela `jobs`.
  6. Consulta de detalhes da empresa e contagem de vagas vinculadas.
  7. Atualização e exclusão de empresas.
  8. Validação de bloqueio de acesso não autenticado na API `/api/admin/empresas`.
  9. Presença do item "Empresas B2B" na `AdminSidebar.tsx`.
  10. Conformidade de componentes Velzon UI na página `/admin/empresas/page.tsx`.

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase85.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
   npx tsx src/test-phase84.ts
   npx tsx src/test-phase83.ts
   npx tsx src/test-phase82.ts
   npx tsx src/test-phase81.ts
   npx tsx src/test-phase80.ts
   npx tsx src/test-phase79.ts
   npx tsx src/test-phase78.ts
   npx tsx src/test-phase77.ts
   npx tsx src/test-phase76.ts
   ```
3. **Regressão Global do Sistema**:
   ```bash
   npm test
   ```
4. **Validação Estrita de Tipagem**:
   ```bash
   npx tsc --noEmit
   ```
5. **Build de Produção do Next.js**:
   ```bash
   npm run build:next
   ```
