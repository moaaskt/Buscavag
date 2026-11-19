---
last_mapped_commit: 6d29ae2d6f3210c69c2d3d758ea318916cdcf109
last_mapped_at: 2026-11-19
---
<!-- refreshed: 2026-11-19 -->

# Architecture

**Analysis Date:** 2026-11-19

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Next.js 16 App Router                            │
├──────────────────────────┬──────────────────────────┬───────────────────────┤
│    Personal Workspace    │     Candidate Portal     │      Admin Panel      │
│  `src/app/(workspace)/*` │   `src/app/(public)/*`   │   `src/app/admin/*`   │
└────────────┬─────────────┴────────────┬─────────────┴───────────┬───────────┘
             │                          │                         │
             ▼                          ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             API & Router Layer                              │
│                      `src/app/api/*` (REST & SSE Stream)                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
             │                         │                         │
             ▼                         ▼                         ▼
┌──────────────────────────┬──────────────────────────┬───────────────────────┐
│     Business Services    │   Candidate Intelligence │   Scraper Subsystem   │
│     `src/services/*`     │   - `candidateMatcher`   │   - 34+ Portal Crawl  │
│                          │   - `pythonBridge` (AI)  │   - Python Scrapling  │
└────────────┬─────────────┴────────────┬─────────────┴───────────┬───────────┘
             │                          │                         │
             ▼                          ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Repository Layer                                │
│       `src/db/*Repository.ts` (`CandidateRepository`, `AdminJobRepo`, etc.) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SQLite Database Engine                             │
│                     `better-sqlite3` in WAL Mode (`buscavag.db`)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Workspace Shell | Unified single-app shell with Base UI sidebar, header, dark theme | `src/app/(workspace)/layout.tsx` |
| Workspace Sidebar | Grouped collapsible navigation (`Carreira`, `Operação`, `Inteligência`, `Comunicação`, `Gestão`) | `src/components/workspace/WorkspaceSidebar.tsx` |
| Identity Resolver | Evaluates and merges candidate vs admin session cookies atomically | `src/app/api/workspace/resolve-identity/route.ts` |
| Candidate Matcher | Compares job requirements against candidate profile & skills using weighted scoring | `src/services/candidateMatcher.ts` |
| Python AI Bridge | Communicates with Scrapling FastAPI service for resume text extraction and ATS analysis | `src/services/pythonBridge.ts` |
| Scraper Engine | Base class and orchestrator for 34+ job platform crawlers | `src/scrapers/base.ts`, `src/scrapers/index.ts` |
| Job Anti-Noise Filter | Enforces tech/programming classification and strips noise jobs | `src/config/jobFilters.ts` |
| Fingerprint Utility | Generates unique SHA-256 deduplication signatures | `src/utils/fingerprint.ts` |
| Database Connection | Initializes SQLite instance, WAL journal, and table schemas | `src/db/index.ts` |
| Candidate Repository | Data access object for users, resumes, saved jobs, and profile skills | `src/db/candidateRepository.ts` |
| Admin Job Repository | Data access object for admin job listings, status toggles, and metrics | `src/db/adminJobRepository.ts` |
| Admin Payment Repository | Immutable audit storage for payment events, historical subscriptions, and courtesies | `src/db/adminPaymentRepository.ts` |
| Telegram Notifier | Formats and dispatches high-relevance job alerts to Telegram | `src/services/telegramNotifier.ts` |
| WhatsApp Service | Dispatches WhatsApp alerts via Meta Cloud API | `src/services/whatsappService.ts` |

## Pattern Overview

**Overall:** Modular Monolith with Layered Architecture and Domain Repositories.

**Key Characteristics:**

- **Centralized Data Access (Repository Pattern):** SQL queries are never scattered in UI components or route handlers; they reside in strongly-typed classes under `src/db/`.
- **Synchronous SQLite with WAL Mode:** Fast, zero-network embedded database operations using `better-sqlite3`, avoiding connection pool exhaustion and async ORM overhead.
- **Route Group Segregation with Progressive Migration:** Next.js Route Groups isolate layouts: `(workspace)` for the new Personal Workspace v25.0, `(auth)` for authentication, `(public)` for legacy candidate views, and `admin/` for admin tools.
- **Microservice Extension via HTTP Bridge:** CPU-heavy or browser-based AI/anti-detection tasks are delegated over HTTP to the optional Python FastAPI Scrapling engine (`src/services/pythonBridge.ts`).

## Layers

**Presentation Layer (`src/app/`, `src/components/`):**

- Purpose: Render server and client components, manage layout state, capture user actions.
- Location: `src/app/`, `src/components/`
- Contains: React Server Components, Client Components (`'use client'`), shadcn/ui components (`src/components/ui/`), workspace components (`src/components/workspace/`).
- Depends on: Repository layer (in server components), API layer (in client fetch), `src/lib/utils.ts`.
- Used by: End users (candidates and administrators).

**API Routing Layer (`src/app/api/`):**

- Purpose: Expose JSON endpoints for client interactions, webhooks, and background sync.
- Location: `src/app/api/`
- Contains: Next.js Route Handlers (`route.ts`), input validation via Zod, authentication verification.
- Depends on: Repositories (`src/db/`), Services (`src/services/`), Auth libraries (`src/lib/auth.ts`, `src/lib/admin-auth.ts`).
- Used by: Frontend React components, webhook providers, CLI automation.

**Service Layer (`src/services/`):**

- Purpose: Encapsulate domain logic that spans multiple entities or interacts with external networks.
- Location: `src/services/`
- Contains: `candidateMatcher.ts`, `pythonBridge.ts`, `scraperLogger.ts`, `telegramNotifier.ts`, `whatsappService.ts`.
- Depends on: External APIs, Database Repositories, Utilities.
- Used by: Route handlers and background daemon scripts (`src/index.ts`, `src/cron.ts`).

**Data Layer (`src/db/`):**

- Purpose: Manage database schema lifecycle, prepared statements, and CRUD persistence.
- Location: `src/db/`
- Contains: `index.ts` (connection singleton), entity repositories (`*Repository.ts`).
- Depends on: `better-sqlite3`.
- Used by: API routes, Services, CLI scripts.

## Data Flow

### Primary Request Path (Job Exploration & Matching)

1. User visits `/workspace/carreira` (`src/app/(workspace)/workspace/carreira/page.tsx:1`)
2. Component requests recommended jobs via `GET /api/candidate/recommended-jobs` (`src/app/api/candidate/recommended-jobs/route.ts:7`)
3. Route verifies session cookie via `getSessionUser(req)` (`src/lib/auth.ts:138`)
4. Route queries `CandidateRepository.getRecommendedJobs(userId)` (`src/db/candidateRepository.ts:167`)
5. Repository loads jobs, runs scoring comparison via `candidateMatcher`, and returns matching results
6. Route returns clean unmasked JSON payload with `isLocked: false` (`src/app/api/candidate/recommended-jobs/route.ts:41`)

### Secondary Flow (Job Scraping & Ingestion)

1. Cron daemon or admin triggers scraper run (`src/cron.ts` or `/api/admin/scraper/run`)
2. `ScraperEngine` initiates portal scrapers (`src/scrapers/base.ts`)
3. Scraped jobs pass through `GeoParser` (`src/utils/geoParser.ts`) and `JobFilters` (`src/config/jobFilters.ts`)
4. Unique SHA-256 fingerprint generated via `generateJobFingerprint` (`src/utils/fingerprint.ts`)
5. Jobs inserted into SQLite `jobs` table with conflict-handling on fingerprint
6. Events streamed in real-time to SSE client (`src/app/api/admin/scraper/stream/route.ts`)

**State Management:**

- Server State: SQLite database `buscavag.db` acts as single source of truth.
- Client State: React hooks (`useState`, `useEffect`, custom hooks) and URL Search Parameters (`useSearchParams`) for filtering and pagination.

## Key Abstractions

**Repository Pattern:**

- Purpose: Decouple database tables from presentation and business logic.
- Examples: `CandidateRepository` (`src/db/candidateRepository.ts`), `AdminJobRepository` (`src/db/adminJobRepository.ts`), `AdminPaymentRepository` (`src/db/adminPaymentRepository.ts`).

**BaseScraper Abstract Class:**

- Purpose: Provide standard lifecycle (`run`, `fetchPage`, `parseJobs`, `saveJobs`, `log`) across all 34 scraper connectors.
- Examples: `src/scrapers/base.ts`, `src/scrapers/gupy.ts`, `src/scrapers/linkedinPosts.ts`.

## Entry Points

**Web Application (Next.js):**

- Location: `src/app/layout.tsx`
- Triggers: HTTP requests to web ports (default 3000)
- Responsibilities: Server-side rendering, asset delivery, API routing.

**Background Scraper Daemon:**

- Location: `src/index.ts`
- Triggers: CLI execution (`npm start`, `npm run scrape:linkedin-posts`)
- Responsibilities: One-off or continuous job portal collection runs.

**Scheduled Cron Daemon:**

- Location: `src/cron.ts`
- Triggers: Long-running background process (`npm run start:cron`)
- Responsibilities: Periodic execution of automated scrapers according to `CRON_SCHEDULE`.

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop. Intensive SQLite queries run synchronously via Better-SQLite3 prepared statements. External scraping uses asynchronous HTTP or Playwright child processes.
- **Global state:**
  - Database connection singleton: `db` exported from `src/db/index.ts`.
  - In-memory concurrency locks: `activeAnalyses` in `src/app/api/candidate/analyze-cv/route.ts` prevent duplicate simultaneous AI invocations per user.
- **Zero Destructive Migrations:** Commercial decommissioning in Phase 101 strictly forbids `DROP TABLE` or `DELETE` on financial records (`subscriptions`, `payments`, `payment_webhooks`).

## Anti-Patterns

### Anti-Pattern 1: Bypassing Repository Layer with Ad-Hoc SQL in Components

**What happens:** Writing `db.prepare(...)` directly inside page components.
**Why it's wrong:** Couples UI to SQLite schema, breaks testability and connection reuse.
**Do this instead:** Define methods in the appropriate repository (`src/db/candidateRepository.ts` or `src/db/adminRepository.ts`).

### Anti-Pattern 2: Using `Infinity` in JSON Contracts

**What happens:** Returning `Infinity` in quota/limit responses.
**Why it's wrong:** `JSON.stringify(Infinity)` serializes to `null`, corrupting frontend limits.
**Do this instead:** Use `UNLIMITED_QUOTA_VALUE = 999999` and explicit boolean flags (`isUnlimited: true`) as in `src/lib/saasLimits.ts`.

## Error Handling

**Strategy:** Fail-safe defensive error handling with structured logging.

**Patterns:**

- Route handlers wrap operations in `try/catch`, return appropriate HTTP status (`400`, `401`, `403`, `429`, `500`) with structured `{ success: false, error: string }`.
- Scrapers use per-job try/catch blocks so one malformed HTML element does not abort the entire batch.

## Cross-Cutting Concerns

**Logging:** Structured event logging via `logger.info`, `logger.warn`, `logger.error`, `logger.security` (`src/lib/logger.ts`) writing directly to SQLite `system_logs`.
**Validation:** Request body and parameter parsing strictly validated with Zod schemas (`RegisterSchema`, `LoginSchema`, `toggleSchema`).
**Authentication:** Dual cookie tokens (`buscavag_session`, `buscavag_admin_session`) with server-side validation and CSRF token rotation.

---

*Architecture analysis: 2026-11-19*
