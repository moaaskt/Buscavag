# Phase 20: Context & Decisions

## Context
A Fase 20 entrega as ferramentas visuais e interativas de seleção e ações em lote no Explorador de Vagas (`/jobs`).

## Decisões Técnicas
1. **Floating Action Bar (`FloatingActionBar.tsx`)**:
   - Animação com `framer-motion` (`initial={{ y: 50 }}`, `animate={{ y: 0 }}`)
   - Fundo translúcido `backdrop-blur-md` estilo Shadcn Dark / Linear.
   - Ações integradas: Exclusão em lote e alteração rápida de status em lote (DropdownMenu).
2. **Seleção e Exclusão nos Cards (`JobCard.tsx`)**:
   - Checkbox individual posicionado com destaque suave no card.
   - Botão de lixeira individual com `opacity-0 group-hover:opacity-100` e confirmação antes de executar `DELETE /api/jobs`.
   - `e.stopPropagation()` para não disparar a abertura do modal de detalhes ao interagir com o checkbox ou o botão de exclusão.
3. **Página de Vagas (`JobsPage`)**:
   - Controle de estado com `selectedIds: Set<string>`.
   - Botão "Selecionar página / Desmarcar página" no cabeçalho de contagem de vagas.
   - Atualização otimista de estado local ao excluir ou alterar status em lote.
