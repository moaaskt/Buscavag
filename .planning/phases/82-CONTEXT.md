# Phase 82 Context: Isolamento de Layout Admin & Remoção da Navbar Pública (/admin/**)

## Vision & Goal
Garantir o isolamento total da área administrativa (`/admin/**` e `/admin/login`) no Next.js App Router utilizando **Route Groups (Grupos de Rotas)**. As páginas de candidatos e visitantes públicos serão agrupadas sob o grupo de rotas público (com `Navbar`, `AuroraBackground` e `footer`), enquanto o grupo `/admin` terá um layout isolado e limpo contendo estritamente os componentes de layout do Velzon Interactive (Sidebar, Header Admin e container responsivo).

---

## Decisões Arquiteturais Travadas

### 1. Organização por Route Groups do Next.js
- **Grupo Público `src/app/(public)`**:
  - Conterá as páginas públicas e de candidatos: `/`, `/jobs`, `/board`, `/pricing`, `/login`, `/register`, `/candidate`.
  - Terá seu próprio `layout.tsx` público que renderiza `<AuroraBackground>`, `<Navbar />`, `<main>` e `<footer>` público.
- **Grupo Administrativo `src/app/admin`**:
  - Terá seu próprio `layout.tsx` administrativo isolado que remove completamente a `Navbar` pública, o `AuroraBackground` e o `footer` público.
  - A rota `/admin/login` utilizará uma tela de login Velzon dedicada sem Navbar pública.

### 2. RootLayout (`src/app/layout.tsx`)
- O `RootLayout` raiz será simplificado para conter apenas a estrutura HTML base (`<html>`, `<body>`), fontes, scripts globais de hidratação de tema e o `TooltipProvider`/`SyncToast`.
- Não conterá mais elementos visuais públicos fixos (`Navbar`, `AuroraBackground`, `footer`).

---

## Directives for Planning & Execution
1. Mover rotas públicas/candidato para `src/app/(public)` mantendo as URLs públicas inalteradas (Route Groups não afetam a URL final).
2. Criar `src/app/(public)/layout.tsx` com o envelopamento público.
3. Criar `src/app/admin/layout.tsx` limpo para rotas administrativas.
4. Atualizar a suíte de testes e verificar se todas as rotas continuam compilando no `npm run build:next`.
