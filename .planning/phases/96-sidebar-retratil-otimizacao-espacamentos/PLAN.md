# Plan: Phase 96 — Sidebar Retrátil Inovadora & Otimização de Espaçamentos Globais

## Objetivo
Implementar uma Sidebar lateral moderna, retrátil e fluida para substituir a Navbar superior no layout público/candidato, otimizando o aproveitamento vertical da tela e os espaçamentos globais, preservando o design system existente.

---

### Task 1: Componente Inovador AppSidebar (Tracer Core)
**Arquivos Envolvidos:**
- `src/components/layout/AppSidebar.tsx` (novo)
- `src/components/layout/AppHeader.tsx` (novo ou suporte a toggle superior/mobile)

**Ações:**
1. Criar `AppSidebar` com estado colapsável (`collapsed` / persistido ou reativo com suporte a tecla/toggle).
2. Adicionar links essenciais com ícones do Lucide:
   - Início / Radar (`/`)
   - Vagas & Match (`/candidate/matching` ou busca)
   - Kanban de Candidaturas (`/candidate/kanban`)
   - Meu Perfil & Currículo (`/candidate/profile`)
   - Painel Admin (se role === 'admin')
3. Incorporar controle de tema (Dark/Light) e informações do usuário autenticado no rodapé da Sidebar.
4. Efeitos visuais refinados: bordas sutis com `border-zinc-200/50 dark:border-zinc-800/50`, glassmorphism suave e transição fluida `transition-all duration-300`.

---

### Task 2: Integração de Layout Global & Margens Responsivas
**Arquivos Envolvidos:**
- `src/app/(public)/layout.tsx`
- `src/components/Navbar.tsx` (manter como fallback ou redirecionar imports)

**Ações:**
1. Atualizar `src/app/(public)/layout.tsx` para estruturar o container em layout horizontal com Sidebar fixa/recolhível à esquerda e área de conteúdo rolável à direita.
2. Adaptar espaçamentos do container principal (`flex-1 w-full mx-auto p-4 md:p-6 lg:p-8`) evitando overflow e harmonizando com a largura dinâmica da sidebar.
3. Garantir suporte a mobile (drawer deslizante que abre via botão flutuante ou topo no mobile, sem quebrar o layout em telas menores).

---

### Task 3: Verificação & Polimento Visual
**Ações:**
1. Validar transição suave entre estado expandido e recolhido/oculto.
2. Validar consistência do Tema Claro e Escuro sem efeito de tela piscando (FOUC).
3. Testar navegação entre rotas (`/`, `/candidate/kanban`, `/candidate/profile`, `/login`) confirmando que formulários e tabelas ganham mais área de visualização vertical.

