# Phase 85 Context: Módulo B2B & Gestão de Empresas (`/admin/empresas`)

## Resumo e Alinhamento da Discussão

Na discussão da **Phase 85**, foram definidas as decisões de arquitetura de dados, escopo de funcionalidades e design de interface para a criação da gestão de empresas e parcerias corporativas (B2B) no BuscaVag.

---

## Decisões Técnicas e Arquiteturais

### 1. Modelo de Dados e Origem Híbrida (`companies`)
- **Tabela Dedicada no SQLite**: Criar a tabela `companies` com campos cadastrais e comerciais completos.
- **Origem Híbrida & Auto-Sincronização**:
  - A tabela será populada/sincronizada a partir das empresas já existentes na tabela `jobs` (`INSERT OR IGNORE INTO companies ... SELECT DISTINCT company FROM jobs WHERE company != ''`).
  - Permite cadastro manual direto de novos clientes e parceiros B2B pelo painel administrativo, mesmo antes de publicarem vagas.
  - Vagas ativas são vinculadas à empresa dinamicamente por correspondência de nome (`LOWER(jobs.company) = LOWER(companies.name)`).

### 2. Esquema da Tabela `companies`
- `id TEXT PRIMARY KEY` (prefixo `comp_` + timestamp/hash aleatório).
- `name TEXT NOT NULL`
- `slug TEXT UNIQUE NOT NULL`
- `logo_url TEXT`
- `website TEXT`
- `industry TEXT` (ex: 'Tecnologia & Software', 'Fintech', 'Consultoria & RH', 'E-commerce', etc.)
- `description TEXT`
- `recruiter_name TEXT`
- `recruiter_email TEXT`
- `recruiter_phone TEXT` (WhatsApp para contato direto de suporte ou comercial)
- `plan_tier TEXT DEFAULT 'free'` (`free`, `startup`, `enterprise`)
- `status TEXT DEFAULT 'active'` (`active`, `prospect`, `inactive`)
- `featured_job_limit INTEGER DEFAULT 0` (quantidade contratada de vagas em destaque)
- `notes TEXT` (anotações internas da equipe de vendas/suporte)
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- **Índices**: `idx_companies_name`, `idx_companies_slug`, `idx_companies_status`, `idx_companies_plan_tier`, `idx_companies_created_at`.

### 3. Camada de Repositório (`src/db/adminCompanyRepository.ts`)
- `getAdminCompanies(params)`: Listagem paginada com contagem agregada de vagas ativas no BuscaVag (`COUNT(j.id) as active_jobs_count`), busca textual por nome/website/indústria, filtros por `status` e `plan_tier`, e ordenação.
- `getAdminCompanyStats()`: Consolidação de KPIs em tempo real (Total de Empresas cadastradas, Parceiras B2B Ativas, Empresas em Prospecção, Total de Vagas Vinculadas).
- `getCompanyDetail(id)`: Retorna os dados cadastrais da empresa e as últimas vagas ativas associadas a ela.
- `createCompany(data)`: Criação com geração segura de slug único.
- `updateCompany(id, data)`: Atualização de dados cadastrais, comerciais e anotações.
- `deleteCompany(id)`: Exclusão com limpeza ou arquivamento seguro.
- `syncCompaniesFromJobs()`: Rotina idempotente que escaneia `jobs` e cadastra novas empresas ainda não mapeadas com plano default `free` e status `active`.

### 4. Endpoints da API Administrativa (`src/app/api/admin/empresas/**`)
- Autenticação e autorização isoladas via `verifyAdminSession` (cookie `admin_session`).
- `GET /api/admin/empresas`: Retorna lista paginada e contadores de KPI.
- `POST /api/admin/empresas`: Cadastra nova empresa ou aceita ação `{ action: 'sync_jobs' }` para sincronização em lote.
- `GET /api/admin/empresas/[id]`: Detalhes completos da empresa e histórico de vagas.
- `PUT /api/admin/empresas/[id]`: Atualização cadastral.
- `DELETE /api/admin/empresas/[id]`: Exclusão de registro.

### 5. Interface Visual do Painel B2B (`src/app/admin/empresas/page.tsx`)
- Integrado ao `AdminLayout` Velzon com suporte completo a tema Claro e Escuro.
- **Top Header**: Título "Gestão de Empresas & Parcerias B2B", descrição sóbria sem badges de sprint, botões "Sincronizar Vagas" e "Nova Empresa".
- **4 Cards de Métricas (KPIs)**:
  1. *Total de Empresas Mapeadas* (com ícone `Building2`)
  2. *Parceiras B2B Ativas* (Planos Startup / Enterprise)
  3. *Empresas em Prospecção* (Lead/Prospect)
  4. *Vagas Associadas Ativas* (Volume do ecossistema)
- **Barra de Filtros & Ações Rápidas**: Campo de busca com ícone e filtros dropdown para Status (`Todos`, `Ativo`, `Prospecção`, `Inativo`) e Plano (`Todos`, `Free`, `Startup`, `Enterprise`), utilizando componentes padronizados `VelzonInput` e `VelzonSelect`.
- **Tabela de Empresas**:
  - Avatar/Logo com fallback para iniciais da empresa.
  - Nome da empresa, setor/indústria e link para website externo.
  - Tag de Plano B2B estilizada com `VelzonBadge`.
  - Tag de Status com indicador visual (ativo verde, prospecção amarelo, inativo cinza/vermelho).
  - Contagem de vagas ativas com link para visualizar na gestão de vagas.
  - Ações rápidas: Ver Detalhes, Editar, Excluir.
- **Modal de Cadastro / Edição**:
  - Utiliza `VelzonInput`, `VelzonSelect`, `VelzonTextarea` e `VelzonLabel` para contraste impecável em Light/Dark mode.
  - Campos: Nome da Empresa*, Website, Setor/Indústria, Nome do Recrutador, Email do Recrutador, Telefone/WhatsApp, Plano B2B, Status, Limite de Destaques e Anotações Internas.
- **Modal de Detalhes da Empresa**:
  - Apresentação estruturada do cadastro da empresa, dados de contato e listagem das vagas ativas daquela empresa indexadas na plataforma.

### 6. Integração na Barra Lateral (`src/components/admin/layout/AdminSidebar.tsx`)
- Adicionar o item de navegação no grupo "Operações SaaS":
  - `{ name: 'Empresas B2B', href: '/admin/empresas', icon: Building2 }` (usando ícone `Building2` do `lucide-react`), sem qualquer badge.

---

## Plano de Validação
- **Suíte Determinística**: `src/test-phase85.ts` cobrindo criação da tabela, operações do repositório, cálculo de KPIs B2B, sincronização de vagas e rotas de API.
- **Regressão Global**: Execução dos testes das fases 76 a 84, `npm test`, checagem de tipos `npx tsc --noEmit` e build de produção `npm run build:next`.
