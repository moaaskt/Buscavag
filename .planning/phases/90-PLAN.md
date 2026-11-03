# Phase 90 Plan: Reestruturação da Dashboard Geral Admin com Foco em Negócio

## Vision & Goal
Reestruturar a Dashboard Geral Administrativa (`/admin` e `/admin/dashboard`) para transformá-la em um verdadeiro **Painel Executivo de Negócio SaaS**. Com a migração de toda a operação de scrapers, monitoramento em tempo real e streaming SSE para a Central Exclusiva de Scrapers (`/admin/scrapers`), a rota `/admin` deve focar exclusivamente em métricas de alto nível: crescimento da base de talentos, parcerias B2B, eficiência da inteligência artificial (Hermes IA), volume de vagas no pipeline, métricas financeiras de conversão e atalhos executivos.

---

## Requirements Addressed

- **`REQ-90-01` (Endpoint Agregador de Métricas Executivas de Negócio)**:
  - Criar o endpoint autenticado `GET /api/admin/dashboard/metrics` com validação de sessão admin via `getAdminSessionUser(req)`.
  - Agregar em uma única requisição de alta performance os dados dos repositórios:
    - **Vagas & Pipeline**: Total de vagas, vagas aprovadas, taxa de fit IA (%), distribuição de estágios do Kanban (`statusCounts`), distribuição por canal (`platformCounts`) e top empresas contratantes.
    - **Talentos / Usuários**: Total de usuários cadastrados, total de candidatos, administradores e novos cadastros nos últimos 7 dias via `AdminUserRepository`.
    - **Empresas & B2B**: Total de empresas mapeadas, empresas ativas, parceiras comerciais e prospects via `AdminCompanyRepository`.
    - **Métricas Financeiras**: MRR consolidado, receita total e assinantes ativos via `AdminPaymentRepository`.
    - **Saúde da Infraestrutura**: Resumo executivo de fontes conectadas, latência média e taxa de integridade via `AdminScraperRepository`.
  - Configurar headers de prevenção de cache (`no-store, no-cache`).

- **`REQ-90-02` (Reestruturação Executiva da Página `/admin`)**:
  - Limpar controles operacionais e modais manuais:
    - Remover botões de disparo de scraping ("Iniciar Varredura").
    - Remover botão de expurgo manual com confirmação por `window.confirm` / `alert`.
    - Remover o modal flutuante de terminal `ScraperTerminalModal` e dependências.
    - Remover monitor pesado de scrapers da tela inicial.
  - Implementar Grid de KPIs Executivos com `VelzonStatWidget`:
    1. **Total de Vagas no Pipeline** (com indicador de vagas aprovadas pela triagem).
    2. **Base de Candidatos** (total de talentos e novos perfis em 7 dias).
    3. **Empresas & Parceiros B2B** (total de empresas e parceiras ativas).
    4. **Taxa de Fit IA (Hermes AI)** (% de aprovação semântica com badge de status).
    5. **Receita / MRR** (métrica financeira do SaaS e assinantes).
  - Implementar Blocos Analíticos Centrais no Design System Velzon:
    - **Card de Status da Infraestrutura & Coleta**: Resumo elegante da saúde dos 36 conectores com CTA destacado: *"Gerenciar Conectores na Central de Scrapers"* levando para `/admin/scrapers`.
    - **Card de Pipeline Geral do Kanban**: Resumo visual dos estágios das vagas com barras e badges semânticas (Pendentes, Em Processo, Entrevistas, Propostas).
    - **Card de Distribuição por Canal**: Gráfico/barras de volume por plataforma (`PlatformDistribution`) otimizado para tema claro e escuro.
    - **Card de Top Empresas Contratantes**: Empresas com mais oportunidades abertas com badges de vagas.
    - **Card de Atalhos Rápidos de Gestão**: Acesso rápido a Vagas (`/admin/vagas`), Empresas (`/admin/empresas`), Usuários (`/admin/usuarios`), Pagamentos (`/admin/pagamentos`) e Logs (`/admin/logs`).

- **`REQ-90-03` (Redirecionamento Seguro de `/admin/dashboard`)**:
  - Criar `src/app/admin/dashboard/page.tsx` executando redirecionamento nativo do Next.js via `redirect('/admin')`.

- **`REQ-90-04` (Suíte Determinística de Testes)**:
  - Desenvolver a suíte determinística `src/test-phase90.ts` garantindo 100% de cobertura dos novos endpoints, redirect, higienização do código da home e ausência de regressões no projeto.

---

## Proposed Changes

### Component 1: Endpoint de Métricas Executivas
#### [NEW] [src/app/api/admin/dashboard/metrics/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/dashboard/metrics/route.ts)
- Sessão admin validada via `getAdminSessionUser(req)`.
- Instancia e agrega os métodos dos repositórios:
  - `JobRepository.getStats()`
  - `AdminUserRepository.getUserMetrics()`
  - `AdminCompanyRepository.getCompanyMetrics()`
  - `AdminPaymentRepository.getPaymentMetrics()`
  - `AdminScraperRepository.getMonitoringMetrics()`
- Resposta tipada contendo:
  ```typescript
  export interface AdminDashboardMetrics {
    jobs: {
      total: number;
      approved: number;
      fitRate: number;
      statusCounts: Record<string, number>;
      platformCounts: Record<string, number>;
      topCompanies: Array<{ company: string; count: number }>;
    };
    users: {
      total: number;
      candidates: number;
      admins: number;
      newLast7Days: number;
    };
    companies: {
      total: number;
      activePartners: number;
      prospects: number;
      mappedJobs: number;
    };
    financial: {
      mrr: number;
      totalRevenue: number;
      activeSubscribers: number;
    };
    infrastructure: {
      totalConnectors: number;
      activeConnectors: number;
      avgLatencyMs: number;
      healthyCount: number;
    };
  }
  ```

---

### Component 2: Redirecionamento `/admin/dashboard`
#### [NEW] [src/app/admin/dashboard/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/dashboard/page.tsx)
- Redireciona imediatamente para `/admin` via `redirect('/admin')` do `next/navigation`.

---

### Component 3: Reestruturação de `src/app/admin/page.tsx`
#### [MODIFY] [src/app/admin/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/page.tsx)
- Consumo unificado do endpoint `/api/admin/dashboard/metrics`.
- Remoção definitiva de:
  - `ScraperTerminalModal`
  - Estados `isSyncing`, `isPurging`, `isTerminalOpen`
  - Funções `handleSync` e `handlePurge`
  - Componente `ScraperHealthMonitor`
- Implementação de:
  - 5 widgets superiores `VelzonStatWidget` (Vagas, Candidatos, Empresas B2B, Taxa de Fit IA, MRR).
  - Card Executivo de Infraestrutura com link/botão para `/admin/scrapers`.
  - Pipeline Geral do Kanban.
  - Distribuição de Canais (`PlatformDistribution`).
  - Top Empresas Contratantes com badges.
  - Hub de Atalhos Administrativos.
  - Paridade estética perfeita nos modos Claro e Escuro Velzon.

---

### Component 4: Suíte Determinística de Testes
#### [NEW] [src/test-phase90.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase90.ts)
- Testes automatizados executáveis com `npx tsx src/test-phase90.ts`:
  1. Verificação da existência de `src/app/api/admin/dashboard/metrics/route.ts`.
  2. Teste de segurança do endpoint de métricas (bloqueio 401 sem sessão admin).
  3. Validação da estrutura de resposta de `AdminDashboardMetrics`.
  4. Validação dos cálculos agregados (jobs, users, companies, financial, infrastructure).
  5. Verificação da existência e conformidade do redirect em `src/app/admin/dashboard/page.tsx`.
  6. Validação de remoção de botões e modais operacionais em `src/app/admin/page.tsx` (sem `handleSync`, `handlePurge`, `ScraperTerminalModal`).
  7. Validação da presença dos 5 widgets executivos de topo.
  8. Validação da presença do Card de Infraestrutura com link para `/admin/scrapers`.
  9. Validação da presença do Pipeline do Kanban e Top Empresas.

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase90.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
   npx tsx src/test-phase89.ts
   npx tsx src/test-phase88.ts
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
4. **Verificação Estrita de Tipagem TypeScript**:
   ```bash
   npx tsc --noEmit
   ```

### Manual / Browser Verification
1. Acessar `/admin` e validar a apresentação dos 5 widgets executivos com dados reais.
2. Conferir o Card de Infraestrutura e clicar no botão "Gerenciar Conectores na Central de Scrapers" para confirmar navegação fluida para `/admin/scrapers`.
3. Navegar para `/admin/dashboard` e verificar o redirecionamento automático instantâneo para `/admin`.
4. Testar a alternância entre Tema Claro e Tema Escuro no cabeçalho e verificar contraste e nitidez visual.
