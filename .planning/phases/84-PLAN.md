# Phase 84 Plan: Limpeza de Poluição Visual (Remoção de Badges "Phase XX")

## Vision & Goal
Eliminar integralmente todas as badges e rótulos de desenvolvimento interno ("Phase 77", "Phase 78", "Phase 79", "Phase 80", "Phase 81") e de prototipagem ("Velzon UI") do console administrativo do BuscaVag (`/admin/**`). A fase limpa a barra lateral de navegação (`AdminSidebar`), simplifica seu layout, remove as badges dos cabeçalhos das páginas e consolida uma estética 100% corporativa e enterprise para o painel.

---

## Requirements Addressed

- **`REQ-84-01` (Sanitização de Badges de Desenvolvimento)**:
  - Limpar a barra lateral [src/components/admin/layout/AdminSidebar.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/layout/AdminSidebar.tsx), removendo as tags `badge` nos itens de menu e o trecho de renderização condicional de badge.
  - Remover as badges de desenvolvimento dos títulos `<h1>` das páginas administrativas:
    - [src/app/admin/vagas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx) ("Phase 78")
    - [src/app/admin/logs/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/logs/page.tsx) ("Phase 77")
    - [src/app/admin/usuarios/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/usuarios/page.tsx) ("Phase 79")
    - [src/app/admin/pagamentos/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/pagamentos/page.tsx) ("Phase 80")
  - Remover a badge "Velzon UI" do título principal de [src/app/admin/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/page.tsx).

---

## Proposed Changes

### Component 1: Sanitização da Sidebar de Navegação

#### [MODIFY] [src/components/admin/layout/AdminSidebar.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/layout/AdminSidebar.tsx)
- Remover as propriedades `badge: 'Phase XX'` dos itens da navegação:
  - Gestão de Vagas (`Phase 78`)
  - Usuários & Acessos (`Phase 79`)
  - Financeiro (`Phase 80`)
  - Hub Mensageria (`Phase 81`)
- Remover a renderização do `item.badge` no JSX dos links de menu.

---

### Component 2: Sanitização dos Cabeçalhos das Páginas

#### [MODIFY] [src/app/admin/vagas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx)
- Remover a badge `<VelzonBadge variant="primary" size="sm">Phase 78</VelzonBadge>` do cabeçalho `<h1>`.

#### [MODIFY] [src/app/admin/logs/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/logs/page.tsx)
- Remover a badge `<VelzonBadge variant="primary" size="sm">Phase 77</VelzonBadge>` do cabeçalho `<h1>`.

#### [MODIFY] [src/app/admin/usuarios/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/usuarios/page.tsx)
- Remover a badge `<VelzonBadge variant="primary" size="sm">Phase 79</VelzonBadge>` do cabeçalho `<h1>`.

#### [MODIFY] [src/app/admin/pagamentos/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/pagamentos/page.tsx)
- Remover a badge `<VelzonBadge variant="primary" size="sm">Phase 80</VelzonBadge>` do cabeçalho `<h1>`.

#### [MODIFY] [src/app/admin/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/page.tsx)
- Remover a badge `<VelzonBadge variant="primary" size="sm">Velzon UI</VelzonBadge>` do cabeçalho `<h1>`.

---

### Component 3: Suíte Determinística de Testes

#### [NEW] `src/test-phase84.ts`
- Verificar estaticamente que `AdminSidebar.tsx` não contém nenhuma ocorrência de `Phase 78`, `Phase 79`, `Phase 80`, `Phase 81` nem renderização de `item.badge`.
- Verificar que `vagas/page.tsx`, `logs/page.tsx`, `usuarios/page.tsx`, `pagamentos/page.tsx` não possuem `<VelzonBadge>Phase XX</VelzonBadge>`.
- Verificar que `admin/page.tsx` não contém `Velzon UI` como badge no título.

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase84.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
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
