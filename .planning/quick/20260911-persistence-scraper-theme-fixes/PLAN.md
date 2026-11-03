# Quick Task Plan: File Persistence, Scraper Execution, and Design System Parity

## Overview
Address three key issues identified in the codebase audit:
1. Docker volume persistence for uploaded resumes (`buscavag-uploads`)
2. Scraper child process spawn fix (`npx tsx src/index.ts` with error handling)
3. Design system parity across light/dark themes in candidate, pricing, and admin pages

## Tasks
1. `docker-compose.yml`:
   - Mount `buscavag-uploads:/app/uploads` under `web`
   - Declare `buscavag-uploads:` in top-level `volumes`
2. `src/app/api/admin/scraper/run/route.ts`:
   - Spawn scraper with `npx tsx src/index.ts` and ensure node_modules/.bin is included in PATH
   - Catch missing binary and Exit 127 errors gracefully with actionable log output
3. Design System & Theme Parity:
   - `src/app/candidate/page.tsx`: remove redundant `min-h-screen` and `<main>` tags; update cards to dual-mode `bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80`; update headings to `text-zinc-900 dark:text-zinc-100`; update labels to `text-zinc-700 dark:text-zinc-300`; update form inputs and textareas to dual mode
   - `src/app/pricing/page.tsx`: remove redundant `min-h-screen` wrapper; update billing toggle, comparison table, and FAQ cards to dual mode; update table text to `text-zinc-700 dark:text-zinc-300`
   - `src/app/admin/page.tsx`: remove redundant `min-h-screen` wrapper and extra `<main>` tag
   - `src/app/admin/logs/page.tsx`: update action bar, tab switcher, refresh button, and run summary cards to dual-mode classes
4. Validation:
   - Compile with `npm run build`
