# Phase 95 Plan: Padronização Global de Sub-Navegação nos Módulos Admin

## Vision & Goal
Consolidar a padronização visual e arquitetural de sub-navegação em todo o painel administrativo do Buscavag ([`/admin/vagas`](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx), [`/admin/empresas`](file:///home/moa-dev/projetos/buscavag/src/app/admin/empresas/page.tsx), [`/admin/usuarios`](file:///home/moa-dev/projetos/buscavag/src/app/admin/usuarios/page.tsx) e [`/admin/pagamentos`](file:///home/moa-dev/projetos/buscavag/src/app/admin/pagamentos/page.tsx)). 

O componente [`VelzonSubTabs`](file:///home/moa-dev/projetos/buscavag/src/components/admin/ui/VelzonSubTabs.tsx) (também exportado sob o alias canônico `AdminSubNav`) evolui para suporte dual — operando tanto como links de navegação entre rotas (`href` com Next.js `Link`) quanto como alternador dinâmico de abas em tempo de execução (`id`/`value` com `activeTab` e callback `onTabChange`), com total conformidade aos temas Claro e Escuro do design system Velzon.

Com isso, eliminam-se os seletores isolados, botões avulsos de troca de visão e tabs ad-hoc com CSS customizado, unificando a ergonomia visual e a experiência do operador administrativo em todos os módulos.

---

## Requirements Addressed

- **`REQ-95-01` (Evolução Dual do Componente `VelzonSubTabs` / `AdminSubNav`)**:
  - Atualizar [src/components/admin/ui/VelzonSubTabs.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/ui/VelzonSubTabs.tsx):
    - Estender a interface de itens para suportar tanto links de rota (`href`) quanto identificadores de abas interativas (`id` / `value`):
      ```ts
      export interface SubTabItem {
        id?: string;
        label: string;
        href?: string;
        icon?: React.ComponentType<{ className?: string }>;
        badge?: string | number;
        badgeVariant?: 'default' | 'success' | 'warning' | 'danger';
      }

      export interface VelzonSubTabsProps {
        tabs: SubTabItem[];
        activeTab?: string;
        onTabChange?: (tabId: string) => void;
        className?: string;
      }
      ```
    - Se `href` for fornecido e `onTabChange` não estiver presente, renderizar Next.js `<Link>` e detectar a aba ativa via `usePathname()`.
    - Se `id` (ou `value`) e `onTabChange` forem fornecidos, renderizar `<button>` acessível com `aria-selected` e disparar a alternância imediata de estado.
    - Exportar o alias `AdminSubNav = VelzonSubTabs` para paridade de nomenclatura canônica.
    - Exportar `VelzonSubTabs`, `AdminSubNav` e tipos em [src/components/admin/ui/index.ts](file:///home/moa-dev/projetos/buscavag/src/components/admin/ui/index.ts).

- **`REQ-95-02` (Sub-Navegação no Módulo de Gestão de Vagas - `/admin/vagas`)**:
  - Atualizar [src/app/admin/vagas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx):
    - Substituir o bloco solto de botões "Tabela vs. Kanban" no topo por uma barra integrada de `VelzonSubTabs`:
      1. `📋 Tabela de Oportunidades` (ícone `Table`, badge com total de vagas)
      2. `📊 Kanban Visual de Vagas` (ícone `LayoutGrid`)
      3. `🧹 Expurgo Seguro & Retenção` (ícone `Trash2`, badge com `stats.eligibleForPurge`, variant `danger`)
    - Ao selecionar a aba "Expurgo Seguro & Retenção", exibir o painel dedicado de governança de retenção/expurgo direto na página com prévia e confirmação rápida (além de manter o acionamento via modal).
    - Manter sincronização com `localStorage` (`buscavag_jobs_view`).

- **`REQ-95-03` (Sub-Navegação no Módulo B2B & Gestão de Empresas - `/admin/empresas`)**:
  - Atualizar [src/app/admin/empresas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/empresas/page.tsx):
    - Introduzir `VelzonSubTabs` no cabeçalho operacional com filtros rápidos categóricos:
      1. `🏢 Todas as Empresas` (ícone `Building2`, badge com `stats.totalCompanies`)
      2. `🛡️ Parceiras Ativas` (ícone `ShieldCheck`, badge com `stats.activePartners`, variant `success`)
      3. `🎯 Prospecção & Livres` (ícone `Target`, badge com `stats.prospectCompanies`, variant `default`)
    - Ao clicar em uma aba, atualizar o filtro `status` de forma instantânea e recarregar os dados sem descontinuidade visual.

- **`REQ-95-04` (Sub-Navegação no Módulo de Usuários & Acessos - `/admin/usuarios`)**:
  - Atualizar [src/app/admin/usuarios/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/usuarios/page.tsx):
    - Introduzir `VelzonSubTabs` no cabeçalho operacional segmentando os perfis:
      1. `👥 Todos os Usuários` (ícone `Users`, badge com `stats.totalUsers`)
      2. `👑 Assinantes PRO` (ícone `Crown`, badge com `stats.proUsers`, variant `warning`)
      3. `👤 Contas Gratuitas` (ícone `UserCheck`, badge com `stats.freeUsers`)
      4. `🚫 Suspensos / Bloqueados` (ícone `ShieldAlert`, badge com `stats.suspendedUsers`, variant `danger`)
    - Alternância imediata do filtro de tier/status, atualizando a listagem e mantendo a paginação correta.

- **`REQ-95-05` (Padronização da Sub-Navegação no Módulo Financeiro - `/admin/pagamentos`)**:
  - Atualizar [src/app/admin/pagamentos/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/pagamentos/page.tsx):
    - Substituir a implementação legada de abas ad-hoc (HTML buttons com Tailwind customizado e sem coerência dark mode) pelo componente `VelzonSubTabs`:
      1. `💳 Transações & Faturas` (ícone `CreditCard`, badge com `totalPayments`)
      2. `🔄 Assinaturas Recorrentes` (ícone `Layers`, badge com `totalSubs`)
      3. `⚡ Logs de Webhooks` (ícone `Webhook`, badge com `webhooks.length`)
    - Conectar diretamente a `activeTab` e `setActiveTab`.

- **`REQ-95-06` (Suíte Determinística de Testes e Regressão Global)**:
  - Criar [src/test-phase95.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase95.ts) cobrindo:
    1. Existência e exportação de `VelzonSubTabs` e `AdminSubNav` em `src/components/admin/ui/index.ts`.
    2. Suporte a modo rota (`href` + `usePathname`) e modo interativo (`activeTab` + `onTabChange`).
    3. Importação e renderização de `VelzonSubTabs` / `AdminSubNav` em `/admin/vagas/page.tsx`.
    4. Importação e renderização de `VelzonSubTabs` / `AdminSubNav` em `/admin/empresas/page.tsx`.
    5. Importação e renderização de `VelzonSubTabs` / `AdminSubNav` em `/admin/usuarios/page.tsx`.
    6. Importação e renderização de `VelzonSubTabs` / `AdminSubNav` em `/admin/pagamentos/page.tsx`.
    7. Preservação de conformidade e não-regressão em `/admin/scrapers/page.tsx`, `/admin/scrapers/terminal/page.tsx` e `/admin/scrapers/config/page.tsx`.
    8. Execução com sucesso das suítes das fases 90, 91, 92, 93 e 94.
    9. Compilação TypeScript limpa com 0 erros (`npx tsc --noEmit`).

---

## Proposed Changes

### Component 1: Evolução Dual de `VelzonSubTabs` & Alias `AdminSubNav`
#### [MODIFY] [src/components/admin/ui/VelzonSubTabs.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/ui/VelzonSubTabs.tsx)
- Suportar itens com `id` ou `href`.
- Adicionar props opcionais `activeTab?: string` e `onTabChange?: (tabId: string) => void`.
- Quando `onTabChange` estiver presente, renderizar `<button type="button" onClick={() => onTabChange(tab.id || tab.href || '')}>` com atributo `aria-selected`.
- Exportar `export const AdminSubNav = VelzonSubTabs;`.

#### [MODIFY] [src/components/admin/ui/index.ts](file:///home/moa-dev/projetos/buscavag/src/components/admin/ui/index.ts)
- Exportar `AdminSubNav` explicitamente junto com `VelzonSubTabs`.

---

### Component 2: Sub-Navegação em `/admin/vagas`
#### [MODIFY] [src/app/admin/vagas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx)
- Importar `VelzonSubTabs` de `@/components/admin/ui`.
- Integrar abas: `table`, `kanban`, `purge`.
- Ao alternar para `purge`, renderizar seção visual dedicada de governança de retenção/expurgo com status de segurança do SQLite e disparo direto.
- Manter botões de atalho rápido e filtros sincronizados.

---

### Component 3: Sub-Navegação em `/admin/empresas`
#### [MODIFY] [src/app/admin/empresas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/empresas/page.tsx)
- Importar `VelzonSubTabs` de `@/components/admin/ui`.
- Integrar abas de filtragem rápida: `all` (Todas as Empresas), `active` (Parceiras Ativas), `prospect` (Prospecção & Livres).
- Atualizar dinamicamente `setStatus` e disparar re-fetch dos dados.

---

### Component 4: Sub-Navegação em `/admin/usuarios`
#### [MODIFY] [src/app/admin/usuarios/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/usuarios/page.tsx)
- Importar `VelzonSubTabs` de `@/components/admin/ui`.
- Integrar abas de segmentação: `all` (Todos os Usuários), `pro` (Assinantes PRO), `free` (Contas Gratuitas), `suspended` (Suspensos / Bloqueados).
- Conectar o clique à atualização imediata dos estados `tier` e `status`.

---

### Component 5: Sub-Navegação Padronizada em `/admin/pagamentos`
#### [MODIFY] [src/app/admin/pagamentos/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/pagamentos/page.tsx)
- Importar `VelzonSubTabs` de `@/components/admin/ui`.
- Substituir o bloco `div` com `<button>` legados por `<VelzonSubTabs tabs={...} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as any)} />`.
- Manter comportamento de renderização condicional de `{activeTab === 'transacoes' && ...}`, `{activeTab === 'assinaturas' && ...}`, `{activeTab === 'webhooks' && ...}`.

---

### Component 6: Suíte Determinística de Testes
#### [NEW] [src/test-phase95.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase95.ts)
- Testar existência, contratos de tipagem, exportações e renderização do `VelzonSubTabs` / `AdminSubNav`.
- Testar a presença das abas padronizadas nos 4 módulos administrativos e na Central de Scrapers.
- Executar rotinas de integridade e regressão completa.

---

## Verification Plan

### Automated Tests
1. **Execução da Suíte da Phase 95**:
   ```bash
   npx tsx src/test-phase95.ts
   ```
2. **Execução das Suítes Recentes para Garantir Regressão Zero**:
   ```bash
   npx tsx src/test-phase94.ts
   npx tsx src/test-phase93.ts
   npx tsx src/test-phase92.ts
   npx tsx src/test-phase91.ts
   npx tsx src/test-phase90.ts
   ```
3. **Regressão Global de Testes do Projeto**:
   ```bash
   npm test
   ```
4. **Validação Estrita de Compilação TypeScript**:
   ```bash
   npx tsc --noEmit
   ```

### Manual / Browser Verification
- **`/admin/vagas`**: Alternar entre "Tabela", "Kanban" e "Expurgo Seguro", verificando a troca de layout instantânea e os badges numéricos.
- **`/admin/empresas`**: Clicar nas abas "Parceiras Ativas" e "Prospecção" e conferir a atualização do grid de empresas.
- **`/admin/usuarios`**: Clicar em "Assinantes PRO", "Contas Gratuitas" e "Suspensos" e conferir os filtros aplicados.
- **`/admin/pagamentos`**: Alternar entre "Transações", "Assinaturas" e "Logs de Webhooks" e checar consistência em temas Claro e Escuro.
- **`/admin/scrapers`**: Confirmar que as rotas da Central de Scrapers (`/admin/scrapers`, `/admin/scrapers/terminal`, `/admin/scrapers/config`) continuam operando normalmente via link.
