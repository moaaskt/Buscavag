# Phase 66: Onboarding Sequencial & Extração Fiel de Perfil via IA

**Data de Conclusão:** 21/09/2026  
**Status:** Concluído com 100% de sucesso

## Objetivos Alcançados
- **Extração Enriquecida via IA & Fallback Heurístico**: O microserviço Python Scrapling (`cv_analyzer.py`) e o prompt LLM foram atualizados para extrair `primary_stack` (3 a 5 tecnologias centrais), `secondary_stack`, `work_model` e `expected_salary`.
- **Persistência Relacional**: Adicionadas colunas `primary_stack` e `secondary_stack` em `candidate_profiles` e `onboarding_completed` em `users`.
- **Bloqueio Preventivo (Lock Screen)**: A aba "Vagas Recomendadas" em `/candidate` bloqueia o acesso caso o onboarding não tenha sido concluído, direcionando o candidato com orientações claras para realizar o upload do currículo e sincronizar o perfil via IA.
- **Sincronização Automática**: Criado endpoint `/api/candidate/sync-skills` para propagar instantaneamente as tecnologias, stacks, cargo e modelo de trabalho inferidos pelo CV para o perfil do candidato, marcando `onboarding_completed = 1`.

## Arquivos Alterados
- `src/db/index.ts`
- `src/db/candidateRepository.ts`
- `src/services/scrapling-engine/app/services/cv_analyzer.py`
- `src/services/pythonBridge.ts`
- `src/app/api/candidate/sync-skills/route.ts`
- `src/app/api/candidate/recommended-jobs/route.ts`
- `src/app/candidate/page.tsx`
- `src/test-python-bridge.ts`
