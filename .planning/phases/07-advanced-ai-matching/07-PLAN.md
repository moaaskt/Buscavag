# Phase 7 Plan: Advanced AI Matching & Compatibility Ranking

## Goal
Evolver a análise de vagas via IA (Hermes Agent) para fornecer um score granular (stack, senioridade, localização), análise de lacunas (gaps), categorização de área e dicas de currículo. Persistir esses dados no SQLite e enviar alertas enriquecidos no Telegram sem as dicas de currículo, utilizando o limiar configurável `MATCH_THRESHOLD`.

---

## Tasks

### Task 1: Update Types & Interface
- Editar `src/services/hermesEvaluator.ts` para estender `EvaluationResult` com `overallScore`, `stackScore`, `seniorityScore`, `locationScore`, `category`, `gaps`, e `resumeTips`.
- Renomear a tipagem no `ProcessedJob` (em `src/types/job.ts`) para incluir as propriedades novas (`scoreIa` será substituído por `overallScore` ou a interface adaptada). Vamos adicionar os campos opcionais na `ProcessedJobSchema` (Zod).

### Task 2: SQLite Schema Migration & Repository Update
- Em `src/db/index.ts` (`initDatabase`), adicionar instruções `ALTER TABLE` seguras para inserir as novas colunas (`stack_score`, `seniority_score`, `location_score`, `category`, `gaps`, `resume_tips`) se elas não existirem.
- Em `src/db/repository.ts`, atualizar o método `insert` para aceitar os novos parâmetros e inseri-los no banco. Tratar a serialização do array `gaps` para JSON string. Atualizar `getPendingNotifications` para desserializar e carregar as novas colunas.

### Task 3: Enhance Hermes Evaluator Prompt & Heuristics
- Atualizar o prompt em `src/services/hermesEvaluator.ts` para exigir a estrutura JSON detalhada.
- Refatorar a heurística fallback (`evaluateHeuristic`) para computar `locationScore`, `seniorityScore`, `stackScore`, realizar média ponderada para `overallScore`, extrair `category` basica, e retornar `gaps` vazio e dicas genéricas.
- Incorporar a variável de ambiente `MATCH_THRESHOLD` (padrão 55) para definir a aprovação (`isJuniorFullStack`).

### Task 4: Upgrade Telegram Notifier
- Modificar `src/services/telegramNotifier.ts` para formatar a mensagem com a categoria, a análise de Gaps e o detalhamento do Score (Overall, Stack, Seniority, Location).
- Garantir que `resumeTips` não seja incluído na mensagem do Telegram.

### Task 5: Testing & Verification
- Rodar o build TypeScript para garantir conformidade de tipos em todo o pipeline.
- Testar a inserção de banco de dados e notificação.

---

## Verification & Acceptance Criteria
1. **Typescript Build**: `npm run build` deve compilar perfeitamente com todas as novas interfaces ligadas.
2. **Database Integrity**: Inicializar a aplicação não deve quebrar em banco de dados existente e as novas colunas devem ser criadas.
3. **AI Logic**: O retorno da função de avaliação (seja API ou Heurística) deve contemplar os campos detalhados.
4. **Telegram Formatting**: A saída do notifier deve conter categoria, scores decompostos e a lista de gaps, caso presentes.
