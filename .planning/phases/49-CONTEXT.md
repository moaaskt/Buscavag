# Phase 49 Context — Redesign Responsivo de Auth (/login & /register)

## Contexto e Objetivo
As páginas de autenticação (`/login` e `/register`) possuíam wrappers redundantes com fundo escuro fixo (`bg-zinc-950`), tags `<main>` duplicadas e cards com visual escuro hardcoded, que não respeitavam o modo claro (Light Mode) nem se integravam harmoniosamente ao `layout.tsx` e ao `AuroraBackground`.

Nesta fase, ambas as telas serão reestruturadas para oferecer contraste impecável, tipografia adaptativa e transição suave entre temas claro e escuro.

---

## Decisões de Design e Implementação

### 1. Layout e Integração Estrutural
- **Sem Wrappers Redundantes**: Remoção de `<div className="min-h-screen bg-zinc-950...">` e do `<main>` duplicado em `/login` e `/register`. A página delega a casca principal ao `layout.tsx`.
- **Centralização Vertical Elegante**: Container flexível centralizado com `flex-1 flex items-center justify-center min-h-[calc(100vh-14rem)] py-8 px-4 w-full max-w-md mx-auto`.
- **Limpeza de Imports**: Remoção de importações desnecessárias do componente `Navbar` nas duas rotas.

### 2. Card de Autenticação (Dual-Mode Glassmorphism)
- **Estrutura do Card**:
  - `bg-white/85 dark:bg-zinc-900/70`
  - `border border-zinc-200 dark:border-zinc-800/80`
  - `shadow-xl shadow-zinc-950/5 dark:shadow-2xl dark:shadow-black/50`
  - `backdrop-blur-xl rounded-2xl p-6 sm:p-8 relative overflow-hidden`
- **Glows Decorativos Adaptativos**:
  - Top-left: `bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl pointer-events-none`
  - Bottom-right: `bg-teal-500/10 dark:bg-cyan-500/15 blur-3xl pointer-events-none`

### 3. Tipografia e Contraste
- **Títulos**: `text-zinc-900 dark:text-zinc-100 font-bold tracking-tight text-2xl`
- **Subtítulos descritivos**: `text-zinc-600 dark:text-zinc-400 text-sm mt-1.5`
- **Badges de topo ("Portal do Candidato" / "Cadastro Gratuito")**:
  - `border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold`
- **Labels de Formulário**: `block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono`
- **Links de alternância ("Cadastre-se" / "Faça login")**:
  - `text-emerald-600 dark:text-emerald-400 font-medium hover:underline hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors`

### 4. Inputs e Componentes de Entrada
- **Background**: `bg-zinc-50 dark:bg-zinc-950/80`
- **Borda**: `border border-zinc-200 dark:border-zinc-800`
- **Texto e Placeholder**: `text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500`
- **Foco**: `focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors`
- **Ícones dos inputs (`Mail`, `Lock`, `User`)**: `text-zinc-400 dark:text-zinc-500`

### 5. Botão de Ação Primária
- **Estilo**: Sólido moderno `bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-emerald-950/20`
- **Estados**: Indicador de carregamento com `<Loader2 className="w-4 h-4 animate-spin" />` e desativação acessível enquanto `loading` ou `success`.

### 6. Alertas de Estado (Erro e Sucesso)
- **Erro**: `border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 p-3 rounded-lg text-sm flex items-center gap-2.5`
- **Sucesso**: `border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-sm flex items-center gap-2.5`

---

## Verificação
- Execução de `npm run build` (validação de TypeScript e build de produção Next.js).
- Confirmação visual da alternância entre tema claro e escuro sem quebras de layout ou contrastes ilegíveis.
