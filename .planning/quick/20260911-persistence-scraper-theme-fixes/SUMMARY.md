---
status: complete
date: 2026-09-11
task: file-persistence-scraper-and-theme-parity
---

# Quick Task Summary: File Persistence, Scraper Execution, and Design System Parity

## Completed Work

### 1. Docker Volume Persistence (Resumes)
- Added volume mount `- buscavag-uploads:/app/uploads` under the `web` service in `docker-compose.yml`.
- Declared `buscavag-uploads:` in the top-level `volumes` block.

### 2. Scraper Child Process Runtime Fix (Exit Code 127)
- In `src/app/api/admin/scraper/run/route.ts`:
  - Ensured `node_modules/.bin` is prefixed in `PATH`.
  - Switched process spawn to `spawn('npx', ['tsx', 'src/index.ts'], ...)`.
  - Added specific error inspection and diagnostic messaging for exit code 127 and runtime errors to prevent silent failure.

### 3. Design System & Theme Parity Across Light/Dark Modes
- **`src/app/candidate/page.tsx`**:
  - Removed redundant outer `min-h-screen` wrapper and extra `<main>` tag (now correctly relies on root `layout.tsx`).
  - Removed unused `Navbar` import.
  - Replaced hardcoded dark card classes with dual-mode classes (`bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm`).
  - Updated headings to dual-mode `text-zinc-900 dark:text-zinc-100` and labels to `text-zinc-700 dark:text-zinc-300`.
  - Ensured profile tab inputs and textareas use `bg-white dark:bg-zinc-950/80 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800`.
- **`src/app/pricing/page.tsx`**:
  - Removed redundant `min-h-screen` root wrapper and extra `<main>` tag.
  - Removed unused `Navbar` import.
  - Updated billing toggle container to `bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800`.
  - Updated comparison table container and FAQ items to dual-mode `bg-white/80 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80`.
  - Updated table text to `text-zinc-700 dark:text-zinc-300` with `divide-zinc-200 dark:divide-zinc-800/60`.
- **`src/app/admin/page.tsx`**:
  - Removed redundant `min-h-screen` root wrapper and extra `<main>` tag.
- **`src/app/admin/logs/page.tsx`**:
  - Updated action bar and tab switcher backgrounds to `bg-zinc-100 dark:bg-zinc-900` with `border-zinc-200 dark:border-zinc-800`.
  - Updated refresh button and run summary cards to dual-mode classes with light/dark contrast parity.

### 4. Validation
- `npm run build` (tsc) passed with exit code 0.
- `npm run build:next` (Turbopack) passed with exit code 0 across all static and dynamic routes.
