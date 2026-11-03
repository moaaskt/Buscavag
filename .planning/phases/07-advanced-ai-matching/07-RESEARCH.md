# Phase 7: Research - Advanced AI Matching & Compatibility Ranking

## Domain Analysis & Evaluation Logic

### Current State vs Target State
*   **Current State:**
    *   `HermesEvaluator` outputs `{ isJuniorFullStack: boolean, score: number, reasoning: string }`.
    *   `JobRepository.insert` accepts `isJunior`, `scoreIa`, `reasoning`.
    *   Database schema has `is_junior_fullstack`, `score_ia`, `ai_reasoning`.
    *   `TelegramNotifier` displays `scoreIa` and `aiReasoning`.
*   **Target State:**
    *   `EvaluationResult` interface needs to include: `overallScore`, `stackScore`, `seniorityScore`, `locationScore`, `category`, `gaps: string[]`, `resumeTips`.
    *   AI Prompt needs to be updated to output this JSON structure.
    *   Heuristic fallback needs to calculate/estimate these new fields.
    *   `JobRepository.insert` needs to accept and store these new fields.
    *   SQLite Database `jobs` table needs `ALTER TABLE` to add `stack_score`, `seniority_score`, `location_score`, `category`, `gaps`, `resume_tips`.
    *   `TelegramNotifier` needs to display the granular scores, category, and gaps, omitting `resumeTips`.
    *   Use `.env` variable `MATCH_THRESHOLD` (default 55).

### SQLite Migration
The `better-sqlite3` library executes statements synchronously. We can use a `PRAGMA table_info(jobs)` or a `try/catch` block to safely add columns if they don't exist in `initDatabase()`. A cleaner approach is executing `ALTER TABLE ADD COLUMN` inside a `try/catch` loop for each new column, ensuring idempotency.

### AI Prompt Engineering (JSON Output)
The system prompt in `hermesEvaluator.ts` must explicitly request the new JSON schema.
Example JSON schema requested:
```json
{
  "isJuniorFullStack": boolean,
  "overallScore": number, // 0-100
  "stackScore": number, // 0-100
  "seniorityScore": number, // 0-100
  "locationScore": number, // 0-100
  "category": "Frontend | Backend | Full Stack | DevOps | Data | Mobile | Other",
  "gaps": ["tecnologia1", "tecnologia2"],
  "resumeTips": "dicas",
  "reasoning": "justificativa"
}
```

### Heuristic Fallback Adjustments
When the API fails or is not configured, the heuristic must approximate the scores:
*   `locationScore`: 100 if remote/accepted, 0 if rejected.
*   `seniorityScore`: 100 if Junior, 50 if unspecified, 0 if Senior.
*   `stackScore`: Based on `matchedStackCount` (e.g., `Math.min(matchedStackCount * 10, 100)`).
*   `overallScore`: Weighted average (e.g., `(stackScore * 0.4) + (seniorityScore * 0.3) + (locationScore * 0.3)`).
*   `category`: Basic keyword matching (e.g., if 'frontend' or 'react' appears, etc. Default to 'Full Stack' if mixed or unsure).
*   `gaps`: Difficult to determine without AI, return `[]`.
*   `resumeTips`: Generic tip (e.g., "Destaque seus projetos em " + matchedTechs.join(', ')).

### Environment Config
Use `process.env.MATCH_THRESHOLD` to determine `isJuniorFullStack` (or essentially "isApproved"). The condition will be `overallScore >= MATCH_THRESHOLD && locationScore > 0`.
