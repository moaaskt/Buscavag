# Plan — Phase 53: Design System Tokens & Base Theme Adaptability em `/candidate`

## Context & Objectives
A área do candidato (`/candidate`) possui componentes com estilos hardcoded escuros (`bg-zinc-800`, `bg-zinc-700`, `text-zinc-400`), criando blocos pesados e baixo contraste quando o usuário utiliza o Light Mode.
O objetivo da **Fase 53** é estabelecer os tokens de design adaptativos na casca estrutural do painel, refatorar o cabeçalho do candidato (Hero Banner), a navegação por abas (`Navigation Tabs`), os cards de métricas de topo e modernizar o modal de upgrade (`UpgradeModal.tsx`) para garantir uma experiência visual coesa e profissional nos modos claro e escuro.

---

## Inputs & Dependencies
- `src/app/candidate/page.tsx` (Casca estrutural, Hero Banner, Tabs e Métricas)
- `src/components/UpgradeModal.tsx` (Modal de ativação e upgrade do plano Pro)
- `.planning/REQUIREMENTS.md` (Requisitos REQ-1401, REQ-1402 e REQ-1403)

---

## Tasks

### Task 1: Adaptação Estrutural da Casca & Tela de Bloqueio/Login (`src/app/candidate/page.tsx`)
1. Refatorar o container principal (`max-w-6xl`) e os wrappers com classes adaptativas (`bg-white dark:bg-zinc-900/60`, `border-zinc-200 dark:border-zinc-800/80`, `backdrop-blur-xl`, `shadow-sm`).
2. Ajustar o estado de carregamento (`loading`) com spinner `Loader2` esmeralda e texto semântico claro.
3. Ajustar o card de acesso para visitantes não autenticados (`!user`) com títulos em `text-zinc-900 dark:text-zinc-100`, textos de apoio legíveis (`text-zinc-600 dark:text-zinc-400`) e botões com bordas e elevações padronizadas.

### Task 2: Refatoração do Hero Banner do Candidato & Ações de Perfil (`src/app/candidate/page.tsx`)
1. Atualizar o avatar do usuário com borda sutil (`border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`).
2. Ajustar o título com o nome do usuário (`text-zinc-900 dark:text-zinc-100`) e email (`text-zinc-500 dark:text-zinc-400`).
3. Estilizar a badge do plano:
   - **Plano Free**: `border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300`.
   - **Premium Pro**: `border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300`.
4. Refatorar o botão "Sair" com padrão adaptativo neutro e hover sutil avermelhado (`hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400`).

### Task 3: Refatoração da Barra de Navegação por Abas (`Navigation Tabs`)
1. Atualizar o container de abas com `border-b border-zinc-200 dark:border-zinc-800`.
2. Estilizar a aba ativa: `border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10 rounded-t-xl font-semibold`.
3. Estilizar as abas inativas: `border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 rounded-t-xl`.
4. Atualizar os chips contadores numéricos das abas com `bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700`.

### Task 4: Adaptação das Estatísticas Rápidas, Banner Pro & `UpgradeModal.tsx`
1. Refatorar os 3 cards de métricas de topo (`Aderência Média`, `Super Match`, `Top Competências`) com fundos adaptativos `bg-white dark:bg-zinc-900/50`, labels em `text-zinc-500 dark:text-zinc-400` e valores numéricos em `text-zinc-900 dark:text-zinc-100`.
2. Refatorar o banner de incentivo ao plano Pro para ter excelente legibilidade no tema claro (`text-amber-900 dark:text-amber-200`, descrição em `text-amber-800/80 dark:text-zinc-400`, borda sutil).
3. Atualizar `src/components/UpgradeModal.tsx`:
   - Fundo adaptativo `bg-white dark:bg-zinc-950 border-zinc-200 dark:border-emerald-500/40`.
   - Títulos e textos de benefícios em `text-zinc-900 dark:text-zinc-100` e `text-zinc-600 dark:text-zinc-400`.
   - Seletor de período (Mensal/Anual) e card de preço com contraste balanceado em ambos os modos.

### Task 5: Validação, Linting & Build
1. Executar checagem de tipos com `npm run build` (`tsc`).
2. Executar compilação com `npm run build:next`.
3. Validar se a alternância entre Light e Dark Mode na rota `/candidate` ocorre sem quebras de contraste ou blocos pretos soltos na estrutura base.

---

## Verification Criteria
- [ ] Casca estrutural de `/candidate` renderiza com fundo limpo e bordas suaves no tema claro.
- [ ] Hero Banner do candidato apresenta excelente contraste de nome, email, badge de plano e botão de logout nos dois modos.
- [ ] Barra de navegação por abas destaca a aba ativa em verde esmeralda com fundo sutil e mantém as inativas perfeitamente legíveis no tema claro.
- [ ] Cards de métricas rápidas exibem dados de forma clean sem blocos escuros indesejados no Light Mode.
- [ ] `UpgradeModal` abre com styling adaptativo nos modos claro e escuro.
- [ ] `tsc` e `npm run build:next` passam com 0 erros.
