# Phase 20: Ações e Seleção em Lote (Bulk Actions) nos Cards

## Objetivo
Implementar a experiência visual e interativa de:
1. Checkbox de seleção em lote em cada card (`JobCard`).
2. Botão de exclusão rápida individual no card (`JobCard`).
3. Floating Action Bar que surge suavemente quando 1 ou mais vagas estão selecionadas.
4. Ações em lote:
   - Excluir selecionadas (chama `DELETE /api/jobs` com lista de IDs).
   - Mudar status em lote (chama atualização para as vagas selecionadas).
   - Desmarcar todas.

## Componentes a Atualizar / Criar
- `src/components/JobCard.tsx`:
  - Receber props `isSelected`, `onToggleSelect`, `onDelete`.
  - Exibir checkbox estilizado (sem disparar o modal ao clicar no checkbox ou no delete).
  - Exibir botão de delete individual (ícone de lixeira com confirmação ou ação rápida).
- `src/components/ui/card-hover-effect.tsx`:
  - Repassar seleções e callbacks para cada `JobCard`.
- `src/components/FloatingActionBar.tsx`:
  - Barra flutuante animada com framer-motion na parte inferior da tela.
  - Exibe contador de selecionadas, botões de ação e botão de cancelar seleção.
- `src/app/jobs/page.tsx`:
  - Gerenciar estado `selectedIds: Set<string>`.
  - Integrar com `DELETE /api/jobs` para exclusão individual e em lote.
  - Integrar atualização em lote de status.

## Status dos Requisitos
- [ ] ACT-02: Exclusão Individual no JobCard
- [ ] ACT-03: Seleção em Lote (Bulk Actions) nos Cards
- [ ] ACT-04: Barra Flutuante de Ações em Lote
