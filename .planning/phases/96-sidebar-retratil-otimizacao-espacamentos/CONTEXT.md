# Phase 96: Sidebar Retrátil Inovadora & Otimização de Espaçamentos Globais

## Contexto & Visão Geral
Atualmente, a área principal e pública do candidato (`/`, `/candidate/**`) utiliza uma barra de navegação superior (`Navbar.tsx` / `resizable-navbar.tsx`). 
O objetivo desta fase é converter o layout de topo em uma **Sidebar lateral inovadora, retrátil e colapsável**, otimizando a área útil de tela, a hierarquia de navegação e os espaçamentos globais, mantendo 100% da identidade visual, efeitos e compatibilidade com os temas Claro e Escuro.

## Requisitos Cobertos
- **REQ-NAV-01**: Converter a navegação superior em uma Sidebar lateral moderna com toggle para colapsar/ocultar.
- **REQ-NAV-02**: Preservar a identidade visual do Buscavag (Velzon/Tailwind), ajustando os espaçamentos do container principal (`max-w-7xl` e padding responsivo).

## Critérios de Sucesso
1. Sidebar responsiva e ergonômica:
   - Estado expandido: ícone + rótulos de navegação + perfil do usuário + status/plano.
   - Estado colapsado / oculto: ícones flutuantes/tooltips de fácil acesso com botão de toggle intuitivo.
   - Suporte a telas mobile (gaveta lateral / backdrop overlay).
2. Layout do conteúdo ajustado sem sobreposição ou saltos visuais:
   - Margens dinâmicas baseadas no estado da sidebar (`ml-64` / `ml-20` ou drawer no mobile).
3. Preservação de todas as rotas e funcionalidades existentes:
   - Links: Início, Match & Vagas, Kanban, Currículo & Perfil, Acesso Admin, Troca de Tema (Dark/Light) e Logout.

