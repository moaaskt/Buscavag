---
last_mapped_commit: 6d29ae2d6f3210c69c2d3d758ea318916cdcf109
last_mapped_at: 2026-11-19
---
# External Integrations

**Analysis Date:** 2026-11-19

## APIs & External Services

**Artificial Intelligence & LLMs:**

- Google Gemini API - Curriculum parsing, skills extraction, and AI diagnostic reports
  - SDK/Client: `@google/genai` (`src/app/api/candidate/analyze-cv/route.ts`)
  - Auth: `GEMINI_API_KEY`
- Hermes AI / Custom LLM Endpoint - Job matching reasoning and unstructured job description evaluation
  - SDK/Client: `axios` (`src/services/hermesEvaluator.ts`)
  - Auth: `HERMES_API_KEY`, model configured via `HERMES_MODEL`
- Python Scrapling Engine Bridge - Dedicated microservice for advanced anti-detection web scraping and CV parsing
  - Client: `src/services/pythonBridge.ts`
  - Endpoint: `SCRAPLING_ENGINE_URL` (defaults to `http://localhost:8000`)

**Job Portals & Data Ingestion (34+ Sources):**

- Automated Scrapers:
  - LinkedIn & LinkedIn Posts Feed (`src/scrapers/linkedin.ts`, `src/scrapers/linkedinPosts.ts`, session cookies via `LINKEDIN_COOKIE_LI_AT`, `LINKEDIN_JSESSIONID`, `li-cookies.json`)
  - Gupy (`src/scrapers/gupy.ts`)
  - Glassdoor (`src/scrapers/glassdoor.ts`)
  - Indeed (`src/scrapers/indeed.ts`)
  - Catho (`src/scrapers/catho.ts`)
  - InfoJobs (`src/scrapers/infojobs.ts`)
  - Facebook Groups (`src/scrapers/facebookGroups.ts`, cookie injection via `FB_COOKIES_PATH` / `FB_TARGET_GROUPS`)
  - Regional & Specialized portals: Programathor, GeekHunter, VagasSC, Emprega Palhoça, Remotar, Revelo, 99freelas, Workana, etc.

**Messaging & Notifications:**

- Telegram Bot - Instant notifications for high-compatibility job matches and system alerts
  - SDK/Client: `grammy` (`src/services/telegramNotifier.ts`)
  - Auth: `TELEGRAM_BOT_TOKEN`, target chat via `TELEGRAM_CHAT_ID`
- WhatsApp / Meta Cloud API - Candidate notification channel for recommended jobs
  - SDK/Client: `src/services/whatsappService.ts`
  - Auth: `META_API_TOKEN`, `META_PHONE_NUMBER_ID` or custom provider via `WHATSAPP_API_URL` / `WHATSAPP_API_KEY`

## Data Storage

**Databases:**

- SQLite (Local Embedded)
  - Connection: `DATABASE_PATH` (defaults to `./buscavag.db`)
  - Client: `better-sqlite3` (`src/db/index.ts`)
  - Engine configuration: `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`
  - Core tables: `jobs`, `users`, `candidate_profiles`, `candidate_resumes`, `user_saved_jobs`, `user_hidden_jobs`, `admin_users`, `admin_sessions`, `payments`, `subscriptions`, `payment_webhooks`, `companies`, `scraper_logs`, `logs`, `system_logs`, `scraper_configs`

**File Storage:**

- Local Filesystem Only
  - Resume uploads stored under local filesystem directory configured in `src/app/api/candidate/resume/route.ts`
  - SQLite database backups stored in local filesystem (e.g., `buscavag.db.phase101-backup`)

**Caching:**

- In-memory node process sets and runtime caches:
  - `activeAnalyses` in-memory concurrency set with 5000ms cooldown in `src/app/api/candidate/analyze-cv/route.ts`
  - `activeRuns` Map in `src/services/scraperLogger.ts`
  - Cached authentication secret in `src/lib/auth.ts`

## Authentication & Identity

**Auth Provider:**

- Custom JWT Stateless Cookie System
  - Candidate session: HMAC SHA-256 signed cookie `buscavag_session` via `src/lib/auth.ts`
  - Admin session: Isolated HMAC SHA-256 signed cookie `buscavag_admin_session` verified against `admin_sessions` and `admin_users` tables in `src/lib/admin-auth.ts`
  - Unified session resolution: `src/app/api/workspace/resolve-identity/route.ts`
  - Password hashing: Node.js native `crypto.scryptSync` with unique cryptographic salt per user
  - 2FA / Multi-Factor: TOTP verification via `otplib` (`src/lib/totp.ts`)

## Monitoring & Observability

**Error Tracking:**

- Custom SQLite-backed error logging via `src/lib/logger.ts`
- Console output with timestamped security, warning, and error events

**Logs:**

- Categorized logs stored in `logs` and `system_logs` tables (`auth`, `admin-auth`, `jobs`, `cv`, `scraper`, `billing`, `system`, `security`, `mensageria`)
- Real-time Server-Sent Events (SSE) log streaming for scrapers via `src/app/api/admin/scraper/stream/route.ts`
- Scraper execution history and metrics recorded in `scraper_logs` table (`src/db/logRepository.ts`)

## CI/CD & Deployment

**Hosting:**

- Self-hosted Node.js / Docker containerized service
- Deployable on Linux VPS or container platforms via `Dockerfile.web` and `Dockerfile.scraper`

**CI Pipeline:**

- Test execution script: `npm test` (`tsx scripts/test-runner.ts`)
- TypeScript validation: `npm run build` (`tsc`)
- Standalone Next.js production build: `npm run build:next` (`next build`)

## Environment Configuration

**Required env vars:**

- `DATABASE_PATH` - Absolute or relative path to SQLite database file
- `AUTH_SECRET` - Minimum 32-character encryption key for candidate JWT session cookies
- `ADMIN_JWT_SECRET` - Minimum 32-character key for administrative session cookies
- `APP_URL` - Base application URL for redirects and absolute links

**Optional / Integration env vars:**

- `GEMINI_API_KEY` - AI curriculum evaluation
- `HERMES_API_KEY`, `HERMES_MODEL` - Match reasoning engine
- `SCRAPLING_ENGINE_URL` - Python Scrapling microservice URL
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` - Telegram alerts
- `META_API_TOKEN`, `META_PHONE_NUMBER_ID` - WhatsApp Meta Cloud API
- `LINKEDIN_COOKIE_LI_AT`, `LINKEDIN_JSESSIONID` - Authenticated LinkedIn scraping

**Secrets location:**

- Stored exclusively in `.env` (gitignored) or runtime environment; never committed to version control

## Webhooks & Callbacks

**Incoming:**

- Payment gateway webhooks: `/api/webhooks/payments/[gateway]`
  - Gateways: `mercadopago`, `stripe`, `asaas`, fallback `manual`
  - Phase 101 status: Handlers write immutable audit logs to `payment_webhooks`, `payments`, and `subscriptions` tables without altering `users.tier` or granting user privileges (`src/app/api/webhooks/payments/[gateway]/route.ts`)

**Outgoing:**

- Telegram Bot API dispatch (`https://api.telegram.org/bot<TOKEN>/sendMessage`)
- Meta Graph API WhatsApp message dispatch (`https://graph.facebook.com/v18.0/<PHONE_ID>/messages`)

---

*Integration audit: 2026-11-19*
