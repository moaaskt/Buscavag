---
last_mapped_commit: 6d29ae2d6f3210c69c2d3d758ea318916cdcf109
last_mapped_at: 2026-11-19
---
# Codebase Concerns

**Analysis Date:** 2026-11-19

## Tech Debt

**Dual Portal Segregation in Transition:**

- Issue: The application historically segregated candidate features (`src/app/(public)/candidate/page.tsx`) and admin tools (`src/app/admin/`). Milestone v25.0 introduces the unified `(workspace)` shell, but placeholder routes remain in `src/app/(workspace)/workspace/*` while legacy routes are kept active until Phase 105.
- Files: `src/app/(workspace)/layout.tsx`, `src/app/(public)/candidate/page.tsx`, `src/app/admin/page.tsx`.
- Impact: Code duplication between legacy candidate/admin views and new workspace components; requires maintaining both during the transition.
- Fix approach: Progressive module-by-module porting planned for Phases 102 (`Minha Carreira`), 103 (`Operação & Coleta`), and 104 (`Comunicação & Gestão`), followed by formal cleanup in Phase 105.

**Monolithic Page Files:**

- Issue: Several legacy administrative pages exceed 900-1300 lines of mixed state, JSX, filtering, and API calls.
- Files: `src/scrapers/linkedinPosts.ts` (1419 lines), `src/app/admin/vagas/page.tsx` (1350 lines), `src/app/admin/empresas/page.tsx` (1126 lines), `src/app/admin/mensageria/page.tsx` (1036 lines).
- Impact: Difficult to refactor, higher risk of regression during minor edits.
- Fix approach: Extract table rows, modals, filter sidebars, and action dialogs into modular components under `src/components/` as each section is ported to the workspace.

**Legacy SaaS Paywall Test Expectations:**

- Issue: `src/test-saas-paywall.ts` was written for Phase 39 and still asserts that free users are blocked at 5 saved jobs and that Pro quotas are `Infinity`.
- Files: `src/test-saas-paywall.ts`.
- Impact: Running this legacy test suite fails against the new Phase 101 backend where limits have been safely neutralized to unlimited (`999999`).
- Fix approach: Update or supersede `src/test-saas-paywall.ts` with `test-phase101-decommissioning.ts` in Phase 101 Unit 3, asserting unlimited access and 5s cooldown.

## Known Bugs

**External Portal DOM Selector Drift:**

- Symptoms: Occasional scraping failures or zero jobs extracted from specific third-party portals without throwing hard errors.
- Files: `src/scrapers/glassdoor.ts`, `src/scrapers/gupy.ts`, `src/scrapers/indeed.ts`.
- Trigger: Changes in DOM structure, class names, or anti-bot Cloudflare challenges on target websites.
- Workaround: Run `npm run audit:scrapers` periodically; fallback to Scrapling Python engine or update selectors in individual scraper modules.

## Security Considerations

**LinkedIn Cookie Expiration & Session Synchronization:**

- Risk: Authenticated LinkedIn scraping depends on `li_at` and `JSESSIONID` cookies. When expired, scraping fails or triggers LinkedIn checkpoint challenges.
- Files: `src/scrapers/linkedinPosts.ts`, `scripts/auth-linkedin.ts`, `scripts/start-chrome-linkedin.ps1`.
- Current mitigation: Auto-sync mechanism updates `.env` and `li-cookies.json`; dedicated Chrome automation script helps renew cookies manually.
- Recommendations: Maintain alerts via Telegram when LinkedIn scrapers encounter HTTP 401/403 session errors.

**Production Secret Enforcement:**

- Risk: Starting in production with a weak or default `AUTH_SECRET` or `ADMIN_JWT_SECRET`.
- Files: `src/lib/auth.ts`, `src/lib/admin-auth.ts`.
- Current mitigation: `validateAuthSecretSecurity` throws fatal errors on application startup in production if secrets are default or under 32 characters.
- Recommendations: Ensure CI/CD environment variables are populated with high-entropy cryptographic strings.

## Performance Bottlenecks

**Synchronous SQLite File Locking during Bulk Scraper Ingestion:**

- Problem: Running multiple simultaneous high-volume scrapers writing hundreds of jobs concurrently can experience SQLite busy timeouts.
- Files: `src/db/index.ts`, `src/scrapers/base.ts`.
- Cause: SQLite allows multiple readers but locks the database file for writes during transactions.
- Improvement path: WAL mode (`PRAGMA journal_mode = WAL;`) is already active. Keep write transactions short, batch inserts, and use `concurrency.ts` to throttle parallel crawlers.

## Fragile Areas

**Commercial Decommissioning Boundaries (Phase 101):**

- Files: `src/app/api/webhooks/payments/[gateway]/route.ts`, `src/db/adminPaymentRepository.ts`, `src/db/candidateRepository.ts`.
- Why fragile: Decommissioning must neutralize commercial paywalls without deleting financial tables (`subscriptions`, `payments`, `payment_webhooks`), as historical audit data must remain 100% intact.
- Safe modification: Never run `DROP TABLE` or `DELETE` on financial tables. Verify with `PRAGMA integrity_check` and record baseline hashes.

## Scaling Limits

**SQLite Single-File Storage:**

- Current capacity: Efficiently handles tens of thousands of job postings and candidate profiles.
- Limit: Performance degrades if the database reaches tens of gigabytes or if high-frequency write operations scale beyond single-node SSD IOPS.
- Scaling path: Periodic database vacuuming, archiving inactive or expired jobs older than 60 days via `src/app/api/admin/jobs/purge/route.ts`.

## Dependencies at Risk

**External Scraper Dependencies:**

- Cheerio and Playwright scrapers rely on third-party site stability.
- Impact: Upstream portal redesigns break parsing.
- Migration plan: Expand Scrapling Python bridge with automated selector fallback and LLM-assisted DOM extraction (`HermesEvaluator`).

## Missing Critical Features

**Phase 101 Visual Decommissioning (Unit 2):**

- Problem: Backend APIs have neutralized limits (Unit 1), but the frontend UI still contains `UpgradeModal`, badges, and CTA links.
- Blocks: Completing Phase 101 and achieving a clean Personal Workspace experience.
- Priority: Immediate (next scheduled work unit).

## Test Coverage Gaps

**End-to-End Workspace Shell Navigation:**

- What's not tested: Full automated browser regression testing across all 5 workspace modules (`carreira`, `operacao`, `inteligencia`, `comunicacao`, `gestao`).
- Files: `src/app/(workspace)/workspace/*`.
- Risk: Navigation links or breadcrumbs breaking during future phase migrations.
- Priority: High (to be expanded in Phase 102-105).

---

*Concerns audit: 2026-11-19*
