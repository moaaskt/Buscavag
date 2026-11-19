---
last_mapped_commit: 6d29ae2d6f3210c69c2d3d758ea318916cdcf109
last_mapped_at: 2026-11-19
---
# Coding Conventions

**Analysis Date:** 2026-11-19

## Naming Patterns

**Files:**

- React Components: PascalCase (e.g., `WorkspaceHeader.tsx`, `JobCard.tsx`, `ThemeToggle.tsx`).
- Repositories: camelCase with `Repository` suffix (e.g., `candidateRepository.ts`, `adminJobRepository.ts`).
- Services: camelCase with descriptive role (e.g., `candidateMatcher.ts`, `telegramNotifier.ts`, `whatsappService.ts`).
- Utilities: camelCase (e.g., `geoParser.ts`, `fingerprint.ts`, `csrf.ts`).
- Tests: `test-*.ts` prefix (e.g., `test-rbac.ts`, `test-phase100-security.ts`).

**Functions:**

- camelCase with verb-first pattern (e.g., `getSessionUser`, `createSessionToken`, `validateAuthSecretSecurity`, `toggleSavedJob`, `generateJobFingerprint`).

**Variables & Constants:**

- Variables: camelCase (e.g., `sessionUser`, `candidateProfile`, `jobList`).
- Constants / Globals: UPPER_SNAKE_CASE (e.g., `SESSION_COOKIE_NAME`, `ADMIN_COOKIE_NAME`, `DEFAULT_AUTH_SECRET`, `UNLIMITED_QUOTA_VALUE`).

**Types & Interfaces:**

- PascalCase without prefix (e.g., `User`, `Job`, `CandidateProfile`, `ScraperLog`, `WorkspaceNavItem`).

## Code Style

**Formatting:**

- Indentation: 2 spaces.
- Quotes: Single quotes (`'`) for strings in TypeScript; double quotes (`"`) in JSON.
- Semicolons: Required at end of statements.
- Line width: Kept within 100-120 characters where practical.

**Linting & Type Safety:**

- TypeScript Compiler: `strict: true`, `noImplicitAny: true` enforced via `tsconfig.json`.
- Strict null checks: Enforced across repositories and route handlers using optional chaining (`?.`) and nullish coalescing (`??`).

## Import Organization

**Order:**

1. Built-in Node.js modules (`crypto`, `path`, `fs`, `child_process`).
2. External packages (`next/server`, `zod`, `better-sqlite3`, `@base-ui/react`, `lucide-react`).
3. Internal alias imports (`@/lib/*`, `@/db/*`, `@/components/*`, `@/services/*`, `@/config/*`).
4. Relative imports (`./types`, `../utils`).

**Path Aliases:**

- `@/*` maps directly to `./src/*` configured in `tsconfig.json`.

## Error Handling

**API Routes:**

- Route handlers encapsulate operations in `try/catch` blocks.
- Always log server-side errors before responding using `logger.error` or `console.error`.
- Return structured error JSON with appropriate HTTP status codes:
  ```typescript
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }
    // operation...
  } catch (error: any) {
    logger.error('system', 'Falha ao processar requisição', { error: error.message });
    return NextResponse.json({ success: false, error: 'Erro interno ao processar requisição' }, { status: 500 });
  }
  ```

**Database Repositories:**

- Prepared statements execute synchronously with explicit type casting.
- Missing records return `null` or `undefined` rather than throwing uncaught exceptions.

## Logging

**Framework:**

- Centralized structured logger in `src/lib/logger.ts` backed by SQLite `system_logs` table.

**Patterns:**

- Categorized logs using explicit levels (`info`, `warn`, `error`, `security`):
  ```typescript
  logger.security('auth', `Falha de login: senha inválida para ${email}`, { userId: user.id, req });
  logger.info('scraper', `Scraper finalizado com ${count} novas vagas`, { target: 'LinkedIn' });
  ```

## Security Patterns

**Secret Management:**

- Secrets are NEVER hardcoded in source files.
- `validateAuthSecretSecurity()` enforces a strict minimum length (32 chars) and blocks default fallback keys in production (`NODE_ENV === 'production'`).
- Administrative operations require `role === 'ADMIN'` and active record verification in `admin_sessions` and `admin_users`.

**Password Storage:**

- Password hashing uses Node.js `crypto.scryptSync` with random 16-byte hex salts and format `salt:hash`.
- Password verification uses `crypto.timingSafeEqual` to prevent timing attacks.

## Function & Component Design

**Size:**

- Single responsibility; functions over 80 lines should be split into focused helpers.
- Complex UI pages decompose into tab and card subcomponents (e.g., `src/components/workspace/`).

**Parameters:**

- Use object destructuring with TypeScript interfaces for functions with more than 2 parameters.

**Return Values:**

- Use explicit return types on public repository methods and exportable service functions.

---

*Convention analysis: 2026-11-19*
