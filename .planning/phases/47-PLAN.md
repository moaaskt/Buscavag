# Phase 47 PLAN — Sincronização do Resumo para Bio

Sincronizar o Resumo Executivo gerado pela IA no campo `bio` do Perfil do Candidato.

## Tasks
1. Auditar `/api/candidate/sync-skills` e `CandidateRepository.syncSkillsToProfile`.
2. Verificar fluxo no frontend `src/app/candidate/page.tsx`.
3. Executar validação e `npm run build`.
