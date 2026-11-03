# Phase 83 Plan: Padronização Visual Velzon, Correção de Formulários & Suporte a Tema Claro

## Vision & Goal
Consolidar a excelência visual e de usabilidade (UI/UX) do console administrativo do BuscaVag (`/admin/**`). A fase introduz uma biblioteca dedicada de componentes de formulário Velzon (`VelzonInput`, `VelzonTextarea`, `VelzonSelect`, `VelzonLabel`), corrige deficiências de contraste em todos os modais do sistema (evitando texto escuro em fundo escuro ou texto claro em fundo claro), adiciona o alternador de temas Sol/Lua no `AdminHeader` sincronizado com o `localStorage`, e preserva a **Sidebar Dark Navy Permanente** (`#1f2430` / `#1a1e29`) com alto contraste para garantir a identidade consagrada do tema Velzon corporativo.

---

## Requirements Addressed

- **`REQ-83-01` (Correção de Formulários & Inputs Velzon)**:
  - Criar componentes utilitários dedicados em `src/components/admin/ui/`:
    - `VelzonInput.tsx`: Campo com padding, bordas e cores de texto padronizadas (`text-slate-800 dark:text-slate-100`, `bg-white dark:bg-[#141824]`, `border-[#e9ebec] dark:border-slate-700`).
    - `VelzonTextarea.tsx`: Campo multilinhas com contraste AA estrito e suporte a redimensionamento suave.
    - `VelzonSelect.tsx`: Dropdown com opções estilizadas sem perda de contraste em Light e Dark mode.
    - `VelzonLabel.tsx`: Rótulo de formulário tipograficamente alinhado ao padrão Velzon com suporte a indicador de obrigatoriedade.
  - Refatorar modais e formulários em:
    - `/admin/vagas`: Modal de Edição/Criação de Vagas e Modal de Expurgo.
    - `/admin/mensageria`: Simulador de Pitch e Modal de Disparo Manual de Teste.
    - `/admin/pagamentos`: Modal de Concessão de Cortesia Pro e Modal de Estorno.
    - `/admin/usuarios`: Modais de Reset de Senha, Alteração de Plano e Suspensão.
    - `/admin/logs`: Filtros rápidos da barra superior.
  - Adicionar controle interativo de Tema Claro / Escuro (Sun / Moon) em `AdminHeader.tsx`, sincronizado com `localStorage.getItem('buscavag_theme')` e a classe `dark` do `<html>`.
  - Garantir que a Sidebar Velzon permaneça no estilo Dark Navy clássico (`#1f2430` / `#1a1e29`), garantindo contraste legível em qualquer modo de exibição.

---

## Proposed Changes

### Component 1: Biblioteca de Formulários Velzon UI

#### [NEW] `src/components/admin/ui/VelzonLabel.tsx`
- Componente de rótulo para inputs com tipografia semi-bold, font-sans/mono, e indicador de campo obrigatório (`*` em tom rose/amber).

#### [NEW] `src/components/admin/ui/VelzonInput.tsx`
- Componente de input com suporte a ícones prefix/suffix, mensagens de ajuda/erro, e estilização rigorosa de tokens de contraste para Light e Dark mode.

#### [NEW] `src/components/admin/ui/VelzonTextarea.tsx`
- Componente de textarea multilinhas com suporte a redimensionamento vertical, estados de foco institucionais (`#405189`) e cores adaptadas.

#### [NEW] `src/components/admin/ui/VelzonSelect.tsx`
- Componente de select dropdown estilizado com suporte a opções estruturadas e chevron integrado.

#### [NEW] `src/components/admin/ui/index.ts`
- Exportação unificada dos novos componentes utilitários de formulário juntamente com `VelzonCard`, `VelzonModal`, `VelzonBadge`, `VelzonStatWidget`.

---

### Component 2: Alternador de Tema no AdminHeader

#### [MODIFY] [src/components/admin/layout/AdminHeader.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/layout/AdminHeader.tsx)
- Adicionar estado `theme` ('light' | 'dark') com hidratação a partir de `localStorage.getItem('buscavag_theme')` ou classe `dark` no documento.
- Renderizar botão com ícones `Sun` / `Moon` com micro-animação e tooltip descritivo.
- Ao clicar, alternar o tema instantaneamente na tag `<html>` e salvar no `localStorage`.

---

### Component 3: Refatoração de Modais e Telas do Admin

#### [MODIFY] [src/app/admin/vagas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx)
- Substituir inputs genéricos do modal de edição/criação de vaga pelos componentes `VelzonInput`, `VelzonSelect` e `VelzonLabel`.
- Eliminar qualquer contraste quebrado nos campos de título, empresa, localização, modelo, faixa salarial e stack.

#### [MODIFY] [src/app/admin/mensageria/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/mensageria/page.tsx)
- Atualizar o Simulador de Pitch e o Modal de Disparo Manual de Teste com `VelzonInput`, `VelzonTextarea` e botões de canal estilizados com alto contraste no tema claro e escuro.

#### [MODIFY] [src/app/admin/pagamentos/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/pagamentos/page.tsx)
- Atualizar o Modal de Concessão de Cortesia Pro para usar `VelzonInput`, `VelzonSelect` e `VelzonLabel`.

#### [MODIFY] [src/app/admin/usuarios/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/usuarios/page.tsx)
- Padronizar os modais de suporte e reset de credenciais com contraste nítido e botões consistentes.

#### [MODIFY] [src/app/admin/logs/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/logs/page.tsx)
- Padronizar a barra de filtros com `VelzonInput` e `VelzonSelect`.

---

### Component 4: Suíte Determinística de Testes

#### [NEW] `src/test-phase83.ts`
- Testar a existência e exportação dos componentes `VelzonInput`, `VelzonTextarea`, `VelzonSelect`, `VelzonLabel`.
- Validar via inspeção estática que os inputs contêm as classes de contraste para Light e Dark Mode (`bg-white dark:bg-[#141824]`, `text-slate-800 dark:text-slate-100`).
- Validar que o `AdminHeader.tsx` contém o toggle de tema (`Sun`, `Moon`, `buscavag_theme`).
- Validar que a `AdminSidebar.tsx` preserva o background `#1f2430`.
- Validar a renderização sem erros dos modais de `/admin/vagas`, `/admin/mensageria`, `/admin/pagamentos`, `/admin/usuarios`.

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase83.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
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
