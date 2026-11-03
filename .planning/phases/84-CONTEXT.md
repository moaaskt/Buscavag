# Phase 84 Context: Limpeza de Poluição Visual (Remoção de Badges "Phase XX")

## 1. Visão Geral e Contexto
A **Phase 84** tem como objetivo sanitizar a interface do console administrativo do BuscaVag (`/admin/**`), eliminando qualquer vestígio de rótulos internos de desenvolvimento ("Phase 77", "Phase 78", "Phase 79", "Phase 80", "Phase 81") e badges de prototipagem ("Velzon UI"). O resultado é uma interface limpa, corporativa, sóbria e 100% pronta para produção enterprise.

---

## 2. Decisões de Design e Implementação (Alinhadas com o Usuário)

### Decisão 1: Remoção Completa das Badges "Phase XX"
- **Escopo**:
  - Eliminar todas as badges "Phase XX" do menu lateral e dos títulos de página.
  - Páginas afetadas:
    - `/admin/vagas`: Remover `<VelzonBadge variant="primary" size="sm">Phase 78</VelzonBadge>` do `<h1>`.
    - `/admin/logs`: Remover `<VelzonBadge variant="primary" size="sm">Phase 77</VelzonBadge>` do `<h1>`.
    - `/admin/usuarios`: Remover `<VelzonBadge variant="primary" size="sm">Phase 79</VelzonBadge>` do `<h1>`.
    - `/admin/pagamentos`: Remover `<VelzonBadge variant="primary" size="sm">Phase 80</VelzonBadge>` do `<h1>`.

### Decisão 2: Remoção Total da Lógica de Badge na `AdminSidebar`
- Em [src/components/admin/layout/AdminSidebar.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/layout/AdminSidebar.tsx):
  - Remover a propriedade `badge` da lista de objetos de navegação.
  - Remover a renderização condicional do elemento `<span>` de badge nos links do menu.
  - Deixar o layout dos links mais fluido e com alinhamento perfeito de ícone e texto.

### Decisão 3: Remoção da Badge "Velzon UI" no Dashboard Principal
- Em [src/app/admin/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/page.tsx):
  - Remover `<VelzonBadge variant="primary" size="sm">Velzon UI</VelzonBadge>` do título principal `Painel Geral de Operações`.
  - O título fica limpo e com estética corporativa alinhada ao restante da aplicação.

---

## 3. Critérios de Sucesso e Validação

1. **Zero Badges de Desenvolvimento**: Nenhuma rota de `/admin/**` conterá menção visual ou código JSX renderizando "Phase XX" ou "Velzon UI" em títulos ou menus.
2. **Código Enxuto na Sidebar**: `AdminSidebar` simplificada sem blocos inoperantes de badge.
3. **Não-Regressão**:
   - `npm test` aprovando 100% das suítes.
   - Suítes de regressão das fases anteriores (76 a 83) aprovadas.
   - Nova suíte determinística `src/test-phase84.ts` validando a ausência total das badges.
   - `npx tsc --noEmit` com 0 erros.
   - `npm run build:next` compilando todas as 35 rotas com sucesso.
