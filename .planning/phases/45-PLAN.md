# Phase 45 PLAN — Kanban Isolamento Multi-tenant

Isolar o Kanban de Gestão de Candidaturas (`/board`), garantindo que o board seja filtrado strictly por `userId` e persista em `user_saved_jobs`.

## Tasks
1. Auditar `/api/candidate/board` e `/api/candidate/board/status`.
2. Verificar o repositório `CandidateRepository.getSavedJobs` e `updateSavedJobStatus`.
3. Ajustar `src/app/board/page.tsx` para apresentar zero-state amigável e otimizar interações.
4. Executar verificação e build.
