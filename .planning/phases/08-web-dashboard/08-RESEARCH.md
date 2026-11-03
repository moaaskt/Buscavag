# Phase 8: Research - Web Dashboard & Interactive Job Board

## Next.js Integration Strategy
O projeto atual é um script Node.js (CLI/Cron) em ESM com dependências como `playwright`, `openai`, e `better-sqlite3`. 
Existem duas formas principais de integrar o Next.js:
1. **Mesclar no raiz (`/`)**: Adicionar `next`, `react`, `react-dom` ao `package.json` raiz e criar a pasta `app/` (ou `src/app/`).
   * *Prós*: Compartilha as interfaces (ex: `src/types/job.ts`) e a instância do banco (`src/db/index.ts`) diretamente.
   * *Contras*: Mistura dependências pesadas de backend/scraping com o frontend. Next.js e Playwright/Zod/OpenAI no mesmo `package.json` pode gerar conflitos ou empacotamentos confusos.
2. **Subprojeto Frontend (`/web` ou `/dashboard`)**: Usar `npx create-next-app@latest ./dashboard`.
   * *Prós*: Separação total de concerns. O frontend tem seu próprio `package.json`, Tailwind, ESLint.
   * *Contras*: Para acessar o `buscavag.db` (que estará no diretório pai `../buscavag.db`), o app Next precisará de sua própria dependência `better-sqlite3` e duplicação (ou link) de interfaces TypeScript.

**Decisão Recomendada para Fase 8:** 
A **Opção 1 (Mesclar na Raiz)** é mais eficiente para um projeto side-project rápido. O Next.js suporta `src/app` e não conflita estritamente com os scripts existentes no `src/scrapers`. Podemos apenas rodar o scraper via `npm run start` (como já é feito) e subir o servidor web via `npm run dev` (next dev).

## Tailwind & Shadcn Setup
- Instalar Tailwind: `npm install -D tailwindcss postcss autoprefixer` e `npx tailwindcss init -p`.
- Iniciar Shadcn: `npx shadcn-ui@latest init` (aceitando diretórios `src/components`, `src/app`).
- Adicionar componentes necessários: `npx shadcn-ui@latest add button card table badge dialog select`.

## Database Schema Update
Precisamos adicionar a coluna de status Kanban:
- `application_status TEXT DEFAULT 'pending'` (Valores possíveis: `pending`, `applied`, `interview`, `offer`, `rejected`).
- Em `src/db/index.ts`, incluiremos isso na verificação de migração automática criada na Fase 7.

## Data Fetching (Server Actions / API Routes)
- Como usaremos Next.js App Router, podemos usar Server Components para buscar direto do `better-sqlite3` sem criar API routes JSON se não quisermos, ou criar Route Handlers (`app/api/jobs/route.ts`) para interações client-side (como o Drag & Drop do Kanban).
- Para o Drag & Drop, bibliotecas como `@hello-pangea/dnd` ou `dnd-kit` são populares e funcionam bem com React.

## UI Pages
1. `/`: Dashboard de Métricas (Total vagas, taxa aprovação, gráficos).
2. `/jobs`: Data Table com filtros (Score IA > X, Remote only, Categoria).
3. `/board`: Kanban board.
4. Componente: `JobModal` que exibe a lógica da IA, gaps, resume_tips.
