# Plan — Phase 49: Redesign Responsivo de Auth (/login & /register)

## Context & Objectives
As telas de autenticação (`/login` e `/register`) usam containers rígidos com fundo escuro fixo (`bg-zinc-950`), tags `<main>` duplicadas e cards não adaptativos. O objetivo é remover os wrappers redundantes e aplicar o design system completo em dual-mode (Light Mode / Dark Mode) para contraste perfeito, tipografia refinada e transição suave.

## Inputs & Dependencies
- `.planning/phases/49-CONTEXT.md` (decisões alinhadas)
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/layout.tsx` (layout principal com `AuroraBackground` e `<main>`)

---

## Tasks

### Task 1: Redesign e Paridade Dual-Mode em `/login` (`src/app/login/page.tsx`)
1. Remover import não utilizado de `Navbar`.
2. Remover `<div className="min-h-screen bg-zinc-950...">` e `<main>` aninhado extra; adotar container flexível `min-h-[calc(100vh-14rem)] py-8 px-4 flex items-center justify-center`.
3. Atualizar card para `bg-white/85 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 shadow-xl dark:shadow-2xl backdrop-blur-xl`.
4. Ajustar glows decorativos com opacidade adaptativa para modo claro e escuro.
5. Atualizar tipografia: títulos `text-zinc-900 dark:text-zinc-100`, subtítulos `text-zinc-600 dark:text-zinc-400`, badge em esmeralda.
6. Atualizar inputs para `bg-zinc-50 dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500`.
7. Ajustar alertas de erro/sucesso e botão de submit sólido `bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold`.

### Task 2: Redesign e Paridade Dual-Mode em `/register` (`src/app/register/page.tsx`)
1. Remover import não utilizado de `Navbar`.
2. Remover wrapper `min-h-screen` e `<main>` aninhado extra; alinhar container centralizado verticalmente.
3. Atualizar card com classes dual-mode, sombras e glows decorativos consistentes com `/login`.
4. Atualizar tipografia, badge (`ShieldCheck`), labels mono e contraste nos campos de Nome, E-mail e Senha.
5. Atualizar botão primário "Começar Gratuitamente" para `bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold`.
6. Ajustar link de alternância para `/login` com cores dual-mode.

### Task 3: Verificação e Build
1. Executar `npm run build` (`tsc`) para validação de tipos estritos.
2. Executar `npm run build:next` para verificar compilação das páginas estáticas `/login` e `/register`.
3. Validar sintaxe, tags JSX e classes Tailwind.

---

## Verification Criteria
- [ ] `/login` exibe fundo claro em Light Mode e fundo escuro em Dark Mode sem fundo preto forçado.
- [ ] `/register` exibe fundo claro em Light Mode e fundo escuro em Dark Mode sem fundo preto forçado.
- [ ] Textos e labels legíveis com alto contraste em ambos os temas.
- [ ] Nenhum erro de compilação no TypeScript nem no Turbopack.
- [ ] Formulários continuam enviando credenciais e redirecionando normalmente.
