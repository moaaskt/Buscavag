---
last_mapped_commit: 6d29ae2d6f3210c69c2d3d758ea318916cdcf109
last_mapped_at: 2026-11-19
---
# Testing Patterns

**Analysis Date:** 2026-11-19

## Test Framework

**Runner:**

- Custom high-speed TypeScript test orchestrator via `tsx` (`scripts/test-runner.ts`)
- Standalone phase test suites in `src/test-*.ts` and `scripts/test-*.ts`
- Playwright runner for browser automation audits (`scripts/phase100-final-integrated-audit.ts`)

**Assertion Library:**

- Node.js native `assert` module (`assert.strictEqual`, `assert.ok`, `assert.deepStrictEqual`, `assert.throws`)
- Structured console reporting with pass/fail emoji counters and timing metrics

**Run Commands:**

```bash
npm test                      # Run all core test suites via unified test runner
npm run test:base             # Run Core Base DB suite (src/test-phase1.ts)
npm run test:whatsapp         # Run WhatsApp integration suite (src/test-whatsapp.ts)
npm run audit:scrapers        # Run full scraper health audit (scripts/audit-scrapers.ts)
npx tsx src/test-phase100-security.ts # Run Phase 100 Security & Isolation suite
```

## Test File Organization

**Location:**

- Phase-specific verification suites: `src/test-phase*.ts` (e.g., `src/test-phase1.ts`, `src/test-phase100-security.ts`)
- Domain-specific suites: `src/test-*.ts` (e.g., `src/test-candidate-auth.ts`, `src/test-rbac.ts`, `src/test-session-isolation.ts`)
- Scraper and audit scripts: `scripts/test-*.ts` and `scripts/audit-*.ts`

**Naming:**

- `src/test-[domain].ts` or `src/test-phase[N]-[topic].ts`
- `scripts/test-[integration].ts`

## Test Structure

**Suite Organization Pattern:**

```typescript
import assert from 'assert';
import { CandidateRepository } from '@/db/candidateRepository';
import { createSessionToken, verifySessionToken } from '@/lib/auth';

async function runTestSuite() {
  console.log('🧪 Iniciando Suíte de Testes...');
  let passed = 0;
  let failed = 0;

  // Test 1: Cenário nominal
  try {
    const token = createSessionToken({ userId: 'usr_test', email: 'test@example.com', role: 'CANDIDATE', tier: 'premium' });
    const verified = verifySessionToken(token);
    assert.strictEqual(verified?.userId, 'usr_test');
    assert.strictEqual(verified?.role, 'CANDIDATE');
    console.log('  ✅ T01: Criação e verificação de token de sessão');
    passed++;
  } catch (err: any) {
    console.error('  ❌ T01 FALHOU:', err.message);
    failed++;
  }

  // Summary
  console.log(`\nResultado: ${passed} passaram, ${failed} falharam.`);
  if (failed > 0) process.exit(1);
}

runTestSuite();
```

## Mocking & Fixtures

**Database Fixtures:**

- Tests operate either against a dedicated test database or create isolated test rows with prefixes `test_` or `usr_test_`.
- Cleanup hooks in `finally` blocks delete temporary test rows to prevent database pollution.

**Network Mocking:**

- HTTP responses and external API calls are mocked using custom wrapper functions or environment switches (e.g., `FB_MOCK=true`).
- Local fallback analysis (`localFallbackAnalysis`) in `src/app/api/candidate/analyze-cv/route.ts` allows offline verification of CV scoring pipelines when external LLM endpoints are unavailable.

## Test Types

**Unit & Isolation Tests:**

- Validate password hashing, token creation/verification, Zod schema validation, and URL deduplication fingerprints.
- Examples: `src/test-candidate-auth.ts`, `src/test-job-filters-antinoise.ts`.

**Security & RBAC Tests:**

- Validate that candidate tokens cannot access `/api/admin/*` (HTTP 403 Forbidden), that invalid tokens are rejected (HTTP 401), and that session rotation is atomic.
- Example: `src/test-phase100-security.ts` (29 comprehensive security tests).

**Scraper Health & Ingestion Tests:**

- Verify connectivity, DOM selector integrity, and payload normalization across job portals.
- Example: `scripts/audit-scrapers.ts`.

**E2E Visual Audits:**

- Playwright scripts verify responsive viewports (Desktop 1795×800, Laptop 1366×768, Mobile 390×844), absence of horizontal overflow (0px overlap), and theme hydration anti-FOUC.
- Example: `scripts/phase100-final-integrated-audit.ts`.

## Common Testing Patterns

**Testing Async API Route Handlers:**

```typescript
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/candidate/saved-jobs/route';

const req = new NextRequest('http://localhost:3000/api/candidate/saved-jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `buscavag_session=${validToken}`,
  },
  body: JSON.stringify({ jobId: 'job_123', status: 'saved' }),
});

const res = await POST(req);
assert.strictEqual(res.status, 200);
const data = await res.json();
assert.strictEqual(data.success, true);
```

**Testing Concurrency Locks:**

```typescript
// Test that concurrent calls for the same user trigger 429 CONCURRENT_ANALYSIS_BLOCKED
const [res1, res2] = await Promise.all([
  POST(makeRequest(userA)),
  POST(makeRequest(userA)),
]);
assert.ok(res1.status === 429 || res2.status === 429);
```

---

*Testing analysis: 2026-11-19*
