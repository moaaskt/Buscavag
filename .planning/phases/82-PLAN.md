# Phase 82 Plan: Isolamento de Layout Admin & Remoção da Navbar Pública (/admin/**)

## Vision & Goal
Implementar o isolamento de layout no Next.js App Router agrupando as páginas públicas sob `src/app/(public)` com um `layout.tsx` público (que renderiza `<AuroraBackground>`, `<Navbar />` e `<footer>` público), enquanto `src/app/admin` passa a ter seu próprio `layout.tsx` administrativo isolado. Desta forma, a Navbar pública e o Footer público NUNCA mais vazam nas telas administrativas (`/admin`, `/admin/login`, `/admin/vagas`, etc.).

---

## Requirements Addressed

- **`REQ-82-01` (Isolamento de Layout Administrativo)**:
  - Mover as rotas públicas/candidato (`/`, `/jobs`, `/board`, `/pricing`, `/login`, `/register`, `/candidate`) para `src/app/(public)`.
  - Criar `src/app/(public)/layout.tsx` contendo o envelopamento público com `<Navbar />`, `<AuroraBackground />` e `<footer>`.
  - Criar `src/app/admin/layout.tsx` isolado que renderiza o `AdminLayout` (sem Navbar/Footer públicos).
  - Simplificar `src/app/layout.tsx` (RootLayout) para conter apenas a estrutura HTML base, fontes, script de hidratação de tema e providers.

---

## Proposed Changes

### Component 1: Reestruturação do RootLayout & Route Group (public)

#### [MODIFY] [src/app/layout.tsx](file:///home/moa-dev/projetos/buscavag/src/app/layout.tsx)
- Simplificar o `RootLayout` removendo a `<Navbar />`, o `<AuroraBackground>` e o `<footer>`.
- Manter apenas `<html>`, `<body>`, `TooltipProvider`, `SyncToast` e script de tema.

#### [NEW] `src/app/(public)/layout.tsx`
- Criar o layout público que envolve `{children}` com `<AuroraBackground>`, `<Navbar />` e o `<footer>` do site.

#### [MOVE] Mover rotas públicas para `src/app/(public)`
- Mover `src/app/page.tsx` -> `src/app/(public)/page.tsx`.
- Mover `src/app/jobs` -> `src/app/(public)/jobs`.
- Mover `src/app/board` -> `src/app/(public)/board`.
- Mover `src/app/pricing` -> `src/app/(public)/pricing`.
- Mover `src/app/login` -> `src/app/(public)/login`.
- Mover `src/app/register` -> `src/app/(public)/register`.
- Mover `src/app/candidate` -> `src/app/(public)/candidate`.

---

### Component 2: Layout Administrativo Isolado

#### [NEW] `src/app/admin/layout.tsx`
- Criar o layout para `/admin` que aplica o `AdminLayout` Velzon (ou renderiza `{children}` limpo se for a rota `/admin/login`).

---

## Verification Plan

### Automated Tests
```bash
npx tsx src/test-phase81.ts
npx tsx src/test-phase80.ts
npx tsx src/test-phase79.ts
npx tsx src/test-phase78.ts
npx tsx src/test-phase77.ts
npx tsx src/test-phase76.ts
npm test
npx tsc --noEmit
npm run build:next
```

### Manual Verification
- Acessar rotas públicas (`/`, `/jobs`, `/candidate`) e confirmar que a Navbar e o Footer continuam visíveis normalmente.
- Acessar rotas administrativas (`/admin`, `/admin/login`, `/admin/vagas`, `/admin/mensageria`) e confirmar que a Navbar pública e o Footer público NUNCA aparecem.
