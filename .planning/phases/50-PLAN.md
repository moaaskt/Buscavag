# Plan — Phase 50: Header Minimalista em Rotas de Autenticação

## Context & Objectives
Atualmente, a barra de navegação global (`Navbar.tsx`) exibe todos os links de navegação interna (Dashboard, Explorador, Kanban, Match IA, Planos, Admin), botões de login/cadastro e a barra flutuante mobile (`FloatingDockMobile`) mesmo quando o usuário está nas páginas `/login` ou `/register`.
O objetivo da Fase 50 é detectar dinamicamente as rotas de autenticação através do hook `usePathname()` e renderizar uma versão minimalista e focada do header (contendo apenas a Logo do Buscavag e o alternador de tema Claro/Escuro), eliminando distrações e ocultando o dock flutuante no mobile.

## Inputs & Dependencies
- `src/components/Navbar.tsx` (componente central de navegação)
- `src/app/layout.tsx` (layout raiz que hospeda a `<Navbar />`)
- `src/app/login/page.tsx` & `src/app/register/page.tsx`
- `.planning/ROADMAP.md` & `.planning/REQUIREMENTS.md`

---

## Tasks

### Task 1: Identificação de Rotas de Autenticação em `Navbar.tsx`
1. Declarar a constante booleana `isAuthRoute` avaliando `pathname === '/login' || pathname === '/register' || pathname?.startsWith('/login') || pathname?.startsWith('/register')`.
2. Otimizar a chamada inicial de `checkAuth()` para evitar requisições desnecessárias a `/api/auth/me` quando `isAuthRoute` for verdadeiro.

### Task 2: Renderização Condicional no Header Desktop
1. Em `ResizableNavbarContainer` / `NavBody`:
   - Se `isAuthRoute` for verdadeiro, suprimir o bloco `<NavItems items={navItems} />`.
   - Ocultar botões de login/cadastro e bloco de perfil do usuário.
   - Manter a Logo ("Buscavag") à esquerda e o botão de alternância de tema (`toggleTheme`) à direita, alinhados com `justify-between`.
   - Preservar o efeito de glassmorphism e animações suaves de scroll.

### Task 3: Renderização Minimalista no Mobile & Ocultação do Floating Dock
1. No cabeçalho mobile superior (`<header className="md:hidden ...">`):
   - Se `isAuthRoute` for verdadeiro, substituir os botões de auth pelo botão de alternância de tema Claro/Escuro (`toggleTheme`).
2. No componente inferior flutuante (`FloatingDockMobile`):
   - Suprimir a renderização de `<FloatingDockMobile />` quando `isAuthRoute` for verdadeiro, evitando sobreposição de teclado e opções irrelevantes para usuários não autenticados.

### Task 4: Validação Técnica e Build
1. Executar `npm run build` (`tsc`) para verificar ausência de regressões de tipagem.
2. Executar `npm run build:next` (Turbopack) para testar compilação de todas as rotas estáticas e dinâmicas.
3. Testar consistência da alternância de tema em `/login`, `/register` e nas páginas internas (`/`, `/jobs`, `/candidate`).

---

## Verification Criteria
- [ ] Em `/login` e `/register`, o header desktop exibe exclusivamente a Logo Buscavag e o alternador de tema.
- [ ] Em `/login` e `/register`, o header mobile exibe a Logo Buscavag e o alternador de tema (sem botões de login/cadastro duplicados).
- [ ] O `FloatingDockMobile` não é exibido nas rotas `/login` e `/register`.
- [ ] Em todas as outras rotas (`/`, `/jobs`, `/board`, `/candidate`, `/pricing`, `/admin`), a Navbar completa e o dock mobile continuam funcionando normalmente.
- [ ] Zero erros de compilação no TypeScript (`tsc`) e Turbopack (`npm run build:next`).
