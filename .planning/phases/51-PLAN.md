# Plan — Phase 51: Padronização Completa de Ícones (lucide-react)

## Context & Objectives
O projeto busca consistência visual e manutenibilidade em 100% de seus componentes de interface. Atualmente, dois componentes pontuais ainda utilizam SVGs inline manuais (`flash-icon.tsx` no botão de atualizar da Dashboard e `loader.tsx` no painel administrativo), além de o ícone do "Painel Admin" na Navbar reutilizar o mesmo ícone do Dashboard (`LayoutDashboard`).
O objetivo da Fase 51 é erradicar qualquer SVG inline ad-hoc remanescente, adotando 100% a biblioteca oficial `lucide-react` com dimensões uniformes, estados interativos refinados e distinção semântica de ícones.

## Inputs & Dependencies
- `src/app/page.tsx` (Dashboard principal)
- `src/app/admin/page.tsx` (Painel Administrativo)
- `src/components/Navbar.tsx` (Barra de navegação)
- `src/components/ui/flash-icon.tsx` & `src/components/ui/loader.tsx` (SVGs legados)
- `package.json` (`lucide-react: ^1.40.0`)

---

## Tasks

### Task 1: Padronização do Botão de Atualização na Dashboard (`src/app/page.tsx`)
1. Remover import de `FlashIcon` de `@/components/ui/flash-icon`.
2. Utilizar `RefreshCw` de `lucide-react` já importado, aplicando rotação (`animate-spin`) e cor esmeralda quando `refreshing || loading` estiver ativo.
3. Garantir consistência nas classes de layout e tamanho (`w-4 h-4`).

### Task 2: Padronização dos Indicadores de Loading no Painel Admin (`src/app/admin/page.tsx`)
1. Remover import de `LoaderThree` de `@/components/ui/loader`.
2. Importar e utilizar `Loader2` de `lucide-react` com classe `animate-spin` nos botões de Sincronização (`isSyncing`) e Purge (`isPurging`).
3. Manter contraste refinado em light e dark mode.

### Task 3: Diferenciação e Padronização do Ícone Admin na Navbar (`src/components/Navbar.tsx`)
1. Importar `ShieldCheck` de `lucide-react`.
2. Substituir `LayoutDashboard` por `ShieldCheck` no item de navegação `Painel Admin` tanto no array desktop `navItems` quanto no dock móvel `mobileDockItems`.
3. Evitar ambiguidade visual entre "Dashboard" e "Painel Admin".

### Task 4: Limpeza e Eliminação de SVGs Ad-hoc (`flash-icon.tsx` e `loader.tsx`)
1. Remover ou redirecionar `src/components/ui/flash-icon.tsx` e `src/components/ui/loader.tsx` para exportar wrappers de `lucide-react` caso haja referências dinâmicas futuras.

### Task 5: Validação e Build
1. Executar checagem de tipos com `npm run build` (`tsc`).
2. Executar compilação com `npm run build:next` (Turbopack).
3. Confirmar ausência total de tags `<svg>` inline manuais nos componentes da aplicação.

---

## Verification Criteria
- [ ] O botão de atualização na Dashboard utiliza exclusivamente `RefreshCw` de `lucide-react`.
- [ ] O Painel Admin utiliza `Loader2` de `lucide-react` para spinners de ação.
- [ ] O item "Painel Admin" na Navbar utiliza `ShieldCheck`, diferenciando-se de "Dashboard".
- [ ] Zero erros de compilação no TypeScript (`tsc`) e Turbopack (`npm run build:next`).
