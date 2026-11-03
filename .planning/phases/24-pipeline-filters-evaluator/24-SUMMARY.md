# Phase 24 Summary: Filtros de Ingestão no Pipeline Principal

## Overview
Phase 24 integrated the centralized blacklist and whitelist filters into the main ingestion loop (`src/index.ts`), added audit logging for filtered jobs, added a zero-score safety lock to `HermesEvaluator`, and updated `JobRepository.insert()` to automatically assign `applicationStatus = 'rejected'` to unapproved vacancies.

## Deliverables Completed
1. `src/config/jobFilters.ts`:
   - Added helper functions `matchesBlacklist(title)` and `matchesWhitelist(title)`.
2. `src/index.ts`:
   - Integrated early checks in `runPipeline()`:
     - `matchesBlacklist(job.title)`: Logs `[FILTRO BLACKLIST]` and drops job before repository lookup or AI evaluation.
     - `matchesWhitelist(job.title)`: Logs `[FILTRO WHITELIST]` and drops non-tech titles without whitelist keywords.
   - Added summary statistics at the end of the pipeline execution displaying blacklist & whitelist dropped counts.
3. `src/services/hermesEvaluator.ts`:
   - Added zero-score lock (SCR-10) in both `evaluate()` (AI mode) and `evaluateHeuristic()`: If `stackScore === 0` and no whitelist term is in the title, forces `overallScore = 0`, `isJuniorFullStack = false`, and updates reasoning.
4. `src/db/repository.ts`:
   - Updated `JobRepository.insert()`: When `isJuniorFullStack` is false, `applicationStatus` defaults to `'rejected'` instead of `'pending'`. Approved jobs continue as `'pending'`.

## Verification
- TypeScript verified with `npx tsc --noEmit` (0 errors).
- Integration test validated:
  - Blacklist & Whitelist match logic.
  - Zero-score safety lock in `HermesEvaluator`.
  - Initial `applicationStatus` assignment (`rejected` vs `pending`) in `JobRepository.insert()`.
