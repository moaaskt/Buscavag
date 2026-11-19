---
last_mapped_commit: 6d29ae2d6f3210c69c2d3d758ea318916cdcf109
last_mapped_at: 2026-11-19
---
# Technology Stack

**Analysis Date:** 2026-11-19

## Languages

**Primary:**

- TypeScript 5.x / 7.0.2 - Entire Next.js application, API routes, database repositories, scrapers, and automation scripts (`tsconfig.json`, `package.json`)
- JavaScript (Node.js ES Modules) - Root configuration and Next.js configuration (`package.json`: `"type": "module"`, `next.config.mjs`, `postcss.config.js`)

**Secondary:**

- Python 3.10+ - External scraping bridge and AI parsing microservice located at `src/services/scrapling-engine/` (FastAPI / Scrapling)
- PowerShell - Automation scripts for dedicated browser sessions and tooling (`scripts/start-chrome-linkedin.ps1`)

## Runtime

**Environment:**

- Node.js >= 20.x (ES2022 target, strict mode, bundler module resolution)
- Native bindings: `better-sqlite3` compiled for target architecture

**Package Manager:**

- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**

- Next.js 16.3.4 (App Router, standalone output, serverExternalPackages for native SQLite, experimental single CPU constraint) - Web application & REST/SSE API (`next.config.mjs`)
- React 19.2.8 & React DOM 19.2.8 - Component rendering and server components (`package.json`)

**UI & Styling:**

- Tailwind CSS 3.4.19 & PostCSS 8.5.28 - Utility-first styling with custom OKLCH color tokens (`tailwind.config.ts`, `src/app/globals.css`)
- `@base-ui/react` 1.8.0 - Headless unstyled accessible primitives powering shadcn/ui Base Nova (`src/components/ui/sidebar.tsx`)
- shadcn/ui 4.21.0 - Component library foundations (`components.json`)
- Framer Motion 13.2.0 - Animations and interactive UI transitions
- Lucide React 1.40.0 - Icon library
- SweetAlert2 11.26.25 - Toast and alert modals (`src/lib/alerts.ts`)

**Testing:**

- Custom test runner via `tsx` (`scripts/test-runner.ts`, `package.json`: `npm test`)
- Node.js native `assert` & `child_process.spawnSync` - Deterministic phase verification suites (`src/test-phase*.ts`)
- Playwright 1.62.1 - Browser automation and visual layout audits (`scripts/phase100-final-integrated-audit.ts`)

**Build/Dev:**

- `tsx` 4.23.13 - Fast TypeScript execution for tests, daemons, and scrapers
- TypeScript 7.0.2 (`tsc`) - Type checking and build verification
- Node-Cron 4.6.0 - Background job scheduling daemon (`src/cron.ts`)

## Key Dependencies

**Critical:**

- `better-sqlite3` 13.0.3 - Synchronous high-performance embedded SQLite database engine with WAL mode (`src/db/index.ts`)
- `zod` 4.5.4 - Request payload validation and schema contracts (`src/app/api/`)
- `cheerio` 1.2.0 - HTML parsing and DOM scraping (`src/scrapers/`)
- `axios` 1.20.0 - HTTP client for REST APIs and scrapers (`src/services/`)
- `playwright` 1.62.1 - Headless browser automation for complex dynamic scrapers and audit suites
- `@google/genai` 2.21.0 - Official Google Gemini API client for AI curriculum analysis and matching (`src/app/api/candidate/analyze-cv/route.ts`)
- `grammy` 1.46.0 - Telegram Bot framework for real-time notifications (`src/services/telegramNotifier.ts`)
- `otplib` 13.5.0 & `qrcode` 1.5.4 - TOTP two-factor authentication for administrative accounts (`src/lib/totp.ts`)

**Infrastructure:**

- `dotenv` 17.4.2 - Environment variable loading
- `clsx` 2.1.1 & `tailwind-merge` 3.6.0 - Dynamic CSS class management (`src/lib/utils.ts`)
- `class-variance-authority` 0.7.1 - Component variant styling

## Configuration

**Environment:**

- Configured via environment variables loaded from `.env` or process environment
- Key configuration variables: `DATABASE_PATH`, `AUTH_SECRET`, `ADMIN_JWT_SECRET`, `APP_URL`, `GEMINI_API_KEY`, `HERMES_API_KEY`, `SCRAPLING_ENGINE_URL`, `TELEGRAM_BOT_TOKEN`, `META_API_TOKEN`
- Strict security validation: `validateAuthSecretSecurity` in `src/lib/auth.ts` enforces >= 32 characters in production

**Build:**

- `tsconfig.json` - Compiler settings with `@/*` path alias mapping to `./src/*`
- `next.config.mjs` - Standalone output, `better-sqlite3` server external package declaration
- `tailwind.config.ts` - Theme extensions, custom animations, OKLCH color palettes

## Platform Requirements

**Development:**

- Node.js 20.x LTS or higher
- C++ build tools (required for `better-sqlite3` native compilation)
- Windows PowerShell / Linux shell
- Optional Python 3.10+ virtualenv for local Scrapling FastAPI service (`src/services/scrapling-engine/`)

**Production:**

- Docker / Linux containerized environment
- Target: Standalone Node.js server (`next build` output) + persistent volume for SQLite `buscavag.db` and resumes
- Dockerfiles provided: `Dockerfile.web`, `Dockerfile.scraper`, `docker-compose.yml`

---

*Stack analysis: 2026-11-19*
