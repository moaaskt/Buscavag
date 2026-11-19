---
last_mapped_commit: 6d29ae2d6f3210c69c2d3d758ea318916cdcf109
last_mapped_at: 2026-11-19
---
# Codebase Structure

**Analysis Date:** 2026-11-19

## Directory Layout

```
Buscavag/
├── .planning/                  # GSD planning system, state, roadmaps, and codebase maps
│   ├── codebase/               # Grounded codebase reference documents
│   ├── phases/                 # Phase execution plans (e.g., 101-PLAN.md)
│   ├── PROJECT.md              # Project vision, goals, and core state
│   ├── REQUIREMENTS.md         # Traceable system requirements
│   ├── ROADMAP.md              # Milestone phases and completion gates
│   └── STATE.md                # Project memory and session tracking
├── scripts/                    # Maintenance, testing, audits, and automation scripts
├── src/                        # Main application source code
│   ├── app/                    # Next.js 16 App Router pages and API routes
│   │   ├── (auth)/             # Candidate auth routes (login, register)
│   │   ├── (public)/           # Public landing page, jobs board, legacy candidate
│   │   ├── (workspace)/        # Personal Workspace v25.0 unified layout and pages
│   │   ├── admin/              # Admin dashboard pages
│   │   ├── api/                # Backend API route handlers (REST & SSE)
│   │   ├── globals.css         # Tailwind global styles and theme variables
│   │   └── layout.tsx          # Root HTML layout and anti-FOUC theme script
│   ├── components/             # Reusable React components
│   │   ├── admin/              # Admin specific components (tables, scrapers)
│   │   ├── candidate/          # Candidate specific components (kanban, profile)
│   │   ├── layout/             # Layout wrappers and headers
│   │   ├── ui/                 # shadcn/ui and @base-ui primitives (sidebar, dropdown, etc.)
│   │   └── workspace/          # Personal Workspace shell components (sidebar, header)
│   ├── config/                 # Application configuration (jobFilters.ts, etc.)
│   ├── configs/                # Navigation structure (workspaceNavConfig.ts)
│   ├── db/                     # Database access, SQLite singleton, repositories
│   ├── hooks/                  # Custom React hooks (use-mobile.ts)
│   ├── lib/                    # Core utilities, auth, logger, saasLimits, CSRF
│   ├── scrapers/               # 34+ job platform scrapers and base scraper
│   ├── scripts/                # Database sanitation and normalization scripts
│   ├── services/               # Background services (matching, Telegram, WhatsApp, Python bridge)
│   ├── types/                  # TypeScript interface definitions (job.ts, log.ts)
│   └── utils/                  # Domain utilities (geoParser, fingerprint, hash)
├── next.config.mjs             # Next.js configuration
├── package.json                # Project dependencies and script runner commands
├── tailwind.config.ts          # Tailwind CSS theme configuration
└── tsconfig.json               # TypeScript compiler options
```

## Directory Purposes

**`src/app/`:**

- Purpose: Next.js App Router routing tree. Handles SSR, client navigation, and API endpoints.
- Contains: Layouts (`layout.tsx`), pages (`page.tsx`), and API routes (`route.ts`).
- Key files: `src/app/layout.tsx`, `src/app/(workspace)/layout.tsx`, `src/app/api/workspace/resolve-identity/route.ts`.

**`src/components/ui/`:**

- Purpose: Base UI and shadcn/ui primitive components for design system consistency.
- Contains: `sidebar.tsx`, `breadcrumb.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `sheet.tsx`.
- Key files: `src/components/ui/sidebar.tsx` (official `@base-ui/react` implementation).

**`src/components/workspace/`:**

- Purpose: Shell components for the unified Personal Workspace v25.0.
- Contains: `WorkspaceSidebar.tsx`, `WorkspaceHeader.tsx`, `ThemeToggle.tsx`.

**`src/db/`:**

- Purpose: Single database connection and repository classes for data persistence.
- Key files: `src/db/index.ts`, `src/db/candidateRepository.ts`, `src/db/adminJobRepository.ts`, `src/db/adminPaymentRepository.ts`.

**`src/scrapers/`:**

- Purpose: Specialized crawlers for extracting job postings across 34 external sources.
- Contains: `base.ts` (abstract BaseScraper), `gupy.ts`, `linkedin.ts`, `linkedinPosts.ts`, `glassdoor.ts`.

**`src/services/`:**

- Purpose: Business logic coordinating AI evaluations, third-party integrations, and notifications.
- Key files: `src/services/candidateMatcher.ts`, `src/services/pythonBridge.ts`, `src/services/telegramNotifier.ts`.

**`src/lib/`:**

- Purpose: Low-level utilities, authentication tokens, rate limits, and system logging.
- Key files: `src/lib/auth.ts`, `src/lib/admin-auth.ts`, `src/lib/logger.ts`, `src/lib/saasLimits.ts`.

**`scripts/`:**

- Purpose: Standalone execution scripts for test suites, scraper audits, and browser session automation.
- Key files: `scripts/test-runner.ts`, `scripts/audit-scrapers.ts`, `scripts/phase100-final-integrated-audit.ts`.

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root Next.js web application layout.
- `src/index.ts`: Background job collection CLI runner.
- `src/cron.ts`: Scheduled daemon for continuous background scraper runs.
- `scripts/test-runner.ts`: Unified test suite runner.

**Configuration:**

- `next.config.mjs`: Next.js server configuration and standalone packaging.
- `tailwind.config.ts`: Color palette, typography, and OKLCH design tokens.
- `src/config/jobFilters.ts`: Tech keyword inclusion and non-tech exclusion dictionaries.
- `src/configs/workspaceNavConfig.ts`: 5 grouped navigation sections for Personal Workspace.

**Core Logic:**

- `src/services/candidateMatcher.ts`: AI-assisted candidate/job compatibility evaluation.
- `src/lib/auth.ts` & `src/lib/admin-auth.ts`: Stateless session verification and RBAC checks.
- `src/utils/fingerprint.ts`: Job deduplication hashing algorithm.

**Testing:**

- `scripts/test-runner.ts`: Primary test runner executing all phase suites.
- `src/test-phase100-security.ts`: Comprehensive security and session isolation test suite.
- `src/test-saas-paywall.ts`: Legacy paywall test suite (targeted for update in Phase 101 Unit 3).

## Naming Conventions

**Files:**

- React components: PascalCase (e.g., `WorkspaceSidebar.tsx`, `JobCard.tsx`).
- Utilities, services, repositories: camelCase (e.g., `candidateMatcher.ts`, `adminJobRepository.ts`, `geoParser.ts`).
- Route handlers: Next.js standard `page.tsx`, `layout.tsx`, `route.ts`.
- Test files: `test-*.ts` (e.g., `src/test-candidate-auth.ts`).
- Documentation: UPPERCASE.md (e.g., `STACK.md`, `ROADMAP.md`).

**Directories:**

- Route groups: Parentheses (e.g., `(workspace)`, `(public)`, `(auth)`).
- Standard folders: kebab-case or lower-case (e.g., `components`, `scrapers`, `services`).

## Where to Add New Code

**New Workspace Feature:**

- Page: `src/app/(workspace)/workspace/[module]/page.tsx`
- Component: `src/components/workspace/[FeatureName].tsx`
- Navigation item: `src/configs/workspaceNavConfig.ts`

**New API Endpoint:**

- Candidate API: `src/app/api/candidate/[resource]/route.ts`
- Admin API: `src/app/api/admin/[resource]/route.ts`
- Workspace API: `src/app/api/workspace/[action]/route.ts`

**New Job Portal Scraper:**

- Scraper implementation: `src/scrapers/[portalName].ts` (extending `BaseScraper`)
- Registration: Register portal in `src/scrapers/index.ts` and add configuration in `scraper_configs` table

**New Database Entity / Table:**

- Schema definition: Add `CREATE TABLE IF NOT EXISTS` in `src/db/index.ts`
- Repository: Create `src/db/[entity]Repository.ts`

**New Shared Utility:**

- Pure helper: `src/utils/[utilityName].ts`
- System/auth helper: `src/lib/[utilityName].ts`

## Special Directories

**`.planning/`:**

- Purpose: GSD core project memory, phase roadmaps, requirements, and codebase maps.
- Generated: Maintained by GSD workflows and engineering milestones.
- Committed: Yes.

**`scripts/`:**

- Purpose: Developer tools, browser automation, and integration test runners.
- Committed: Yes.

---

*Structure analysis: 2026-11-19*
