# Phase 94 Plan: Reestruturação da Central de Scrapers & Sub-Navegação por Abas

## Vision & Goal
Reestruturar a arquitetura visual e operacional da **Central de Scrapers** (`/admin/scrapers`), desacoplando o terminal SSE de logs para uma página dedicada em tela cheia (`/admin/scrapers/terminal`), criando uma página exclusiva de governança de conectores (`/admin/scrapers/config`) e introduzindo o componente reutilizável de sub-navegação por abas (`VelzonSubTabs` / `AdminSubNav`). A tela inicial da Central de Scrapers torna-se focada exclusivamente em telemetria, status operacional e ações rápidas de alto impacto, estabelecendo o padrão que será replicado nos demais módulos administrativos na Phase 95.

---

## Requirements Addressed

- **`REQ-94-01` (Componente Reutilizável de Sub-Navegação por Abas - `VelzonSubTabs`)**:
  - Criar [src/components/admin/ui/VelzonSubTabs.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/ui/VelzonSubTabs.tsx):
    - Componente puro e reutilizável com tipagem estrita:
      ```ts
      export interface SubTabItem {
        label: string;
        href: string;
        icon?: React.ComponentType<{ className?: string }>;
        badge?: string | number;
        badgeVariant?: 'default' | 'success' | 'warning' | 'danger';
      }
      ```
    - Destaque automático da aba ativa via `usePathname()`.
    - Total conformidade com o design system Velzon: suporte estrito a Tema Claro (`bg-white`, texto `slate-700`, bordas `#e9ebec`) e Tema Escuro (`bg-[#1f2430]`, texto `slate-200`, bordas `slate-800`), com destaque primário `#405189`.

- **`REQ-94-02` (Desacoplamento e Foco Operacional na Tela Principal `/admin/scrapers`)**:
  - Atualizar [src/app/admin/scrapers/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/page.tsx):
    - Incluir o `VelzonSubTabs` no topo com as abas:
      1. `📊 Painel & Telemetria` (`/admin/scrapers`)
      2. `🖥️ Terminal SSE Ao Vivo` (`/admin/scrapers/terminal`)
      3. `⚙️ Configurações de Conectores` (`/admin/scrapers/config`)
    - Remover a renderização embutida inline do `<ScraperLiveTerminal className="mt-8" />`.
    - Adicionar card executivo com CTA direcionando para a rota `/admin/scrapers/terminal`, indicando o status da transmissão SSE e logs recentes.
    - Manter e otimizar os widgets estatísticos de topo, a barra de ações rápidas (Sync All, Disparo Individual, Expurgo) e a tabela de monitoramento operacional com modal de diagnóstico.

- **`REQ-94-03` (Página Dedicada do Terminal SSE em Tela Cheia `/admin/scrapers/terminal`)**:
  - Criar [src/app/admin/scrapers/terminal/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/terminal/page.tsx):
    - Integrar com `AdminLayout` e `VelzonSubTabs` (com a aba do terminal ativa).
    - Renderizar o `ScraperLiveTerminal` em layout amplo e otimizado para monitoramento contínuo:
      - Conexão SSE em tempo real com auto-reconnect via `/api/admin/scraper/stream`.
      - Filtros de severidade (ALL, INFO, WARN, ERROR, SUCCESS).
      - Busca textual em tempo real.
      - Controle de auto-scroll (play/pause).
      - Ferramentas de exportação (TXT e JSON) e limpeza de buffer.

- **`REQ-94-04` (Página Dedicada de Governança de Conectores `/admin/scrapers/config`)**:
  - Criar [src/app/admin/scrapers/config/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/config/page.tsx):
    - Integrar com `AdminLayout` e `VelzonSubTabs` (com a aba de configurações ativa).
    - Tabela de governança para os 35+ scrapers cadastrados no banco `scraper_configs`:
      - Toggle switch em tempo real para ativar/desativar cada conector via `PATCH /api/admin/scraper/config`.
      - Edição inline ou modal para alterar método (`playwright`, `ssr`, `cookie`, `api`) e timeout (`timeout_ms`).
      - Filtro rápido por método de coleta e status ativo/inativo.
      - Indicador da URL alvo de coleta de cada conector.
      - Toast de feedback imediato de alteração e registro de auditoria via `logAdminAction`.

- **`REQ-94-05` (Preservação de Destaque no Sidebar Administrativo)**:
  - Atualizar [src/components/admin/layout/AdminSidebar.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/layout/AdminSidebar.tsx):
    - Ajustar a lógica de item ativo para manter o item "Central de Scrapers" destacado quando o usuário navegar em qualquer uma das sub-rotas (`/admin/scrapers`, `/admin/scrapers/terminal`, `/admin/scrapers/config`).

- **`REQ-94-06` (Suíte Determinística de Testes)**:
  - Criar [src/test-phase94.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase94.ts) validando:
    1. Existência física dos arquivos das páginas e componentes criados.
    2. Ausência da renderização inline do `ScraperLiveTerminal` em `/admin/scrapers/page.tsx`.
    3. Presença e configuração das abas em `VelzonSubTabs`.
    4. Implementação da rota `/admin/scrapers/terminal` com `ScraperLiveTerminal`.
    5. Implementação da rota `/admin/scrapers/config` com governança e consumo da API de configurações.
    6. Validação do endpoint `PATCH /api/admin/scraper/config` (ativação/desativação de conectores).
    7. Sidebar destacando a Central de Scrapers para todas as sub-rotas.
    8. Regressão global (`npm test`) e ausência de erros em `npx tsc --noEmit`.

---

## Proposed Changes

### Component 1: UI Reutilizável de Sub-Abas
#### [NEW] [src/components/admin/ui/VelzonSubTabs.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/ui/VelzonSubTabs.tsx)
- Implementar componente `VelzonSubTabs` com suporte a temas claro e escuro, ícones, badges e navegação via Next.js `Link`.
- Exportar em [src/components/admin/ui/index.ts](file:///home/moa-dev/projetos/buscavag/src/components/admin/ui/index.ts).

---

### Component 2: Central de Scrapers Principal
#### [MODIFY] [src/app/admin/scrapers/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/page.tsx)
- Importar e renderizar `VelzonSubTabs`.
- Remover a chamada do `ScraperLiveTerminal` inline no final da página.
- Adicionar banner executivo/card informativo sobre o Terminal SSE com link de acesso direto para `/admin/scrapers/terminal`.

---

### Component 3: Página do Terminal SSE Dedicado
#### [NEW] [src/app/admin/scrapers/terminal/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/terminal/page.tsx)
- Criar a página que encapsula o `ScraperLiveTerminal` ocupando a área principal, integrada com o `AdminLayout` e `VelzonSubTabs`.

---

### Component 4: Página de Governança de Configurações
#### [NEW] [src/app/admin/scrapers/config/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/config/page.tsx)
- Criar a página que lista todos os conectores configurados, permitindo busca, filtro por método, toggle de ativação e edição de timeouts e métodos com persistência direta via `PATCH /api/admin/scraper/config`.

---

### Component 5: Sidebar Administrativo
#### [MODIFY] [src/components/admin/layout/AdminSidebar.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/layout/AdminSidebar.tsx)
- Ajustar cálculo de `isActive` para suportar rotas filhas em módulos com sub-navegação.

---

### Component 6: Suíte Determinística de Testes
#### [NEW] [src/test-phase94.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase94.ts)
- Suíte completa de testes automatizados para a Phase 94.

---

## Verification Plan

### Automated Tests
1. **Execução da Suíte da Phase 94**:
   ```bash
   npx tsx src/test-phase94.ts
   ```
2. **Execução das Suítes das Fases Recentes (Regressão)**:
   ```bash
   npx tsx src/test-phase93.ts
   npx tsx src/test-phase92.ts
   npx tsx src/test-phase91.ts
   npx tsx src/test-phase90.ts
   ```
3. **Regressão Global de Testes**:
   ```bash
   npm test
   ```
4. **Validação Estrita de Tipagem**:
   ```bash
   npx tsc --noEmit
   ```

### Manual / Browser Verification
- Acessar `/admin/scrapers` e verificar a presença da sub-navegação e remoção do terminal inline.
- Acessar `/admin/scrapers/terminal` e verificar o terminal SSE em tela cheia com logs em tempo real.
- Acessar `/admin/scrapers/config` e testar a alternância de status de conectores com persistência imediata no SQLite.
