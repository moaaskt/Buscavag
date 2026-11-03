# Phase 72 Plan: Unificação da Validação de Onboarding & Sincronização de Perfil

## Vision & Goal
Unificar a lógica de conclusão de onboarding no backend, permitindo que a visualização da aba de "Vagas Recomendadas" (`/api/candidate/recommended-jobs`) seja liberada de forma automática tanto para candidatos que enviam o currículo para análise de IA quanto para aqueles que preenchem seus dados profissionais (cargo, senioridade e skills) manualmente no formulário de perfil.

---

## User Stories & Requirements Addressed
- **`REQ-04`**: Criar o helper unificado `isOnboardingComplete(userId: string): boolean` no `CandidateRepository` que avalia dados essenciais (`target_role`, `seniority` e pelo menos 1 skill).
- **`REQ-05`**: Atualizar o método `upsertProfile` e a rota `PUT /api/candidate/profile` para sincronizar `users.onboarding_completed = 1` assim que o perfil válido for salvo.
- **`REQ-06`**: Atualizar a rota `GET /api/candidate/recommended-jobs` para utilizar a validação unificada, desbloqueando as recomendações imediatamente.

---

## Proposed Changes

### Component 1: Repositório do Candidato ([CandidateRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/candidateRepository.ts))

#### [MODIFY] [candidateRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/candidateRepository.ts)
- Implementar o método `isOnboardingComplete(userId: string): boolean`:
  1. Consulta o usuário. Se `user.onboarding_completed === 1`, retorna `true`.
  2. Consulta o perfil (`getProfile(userId)`).
  3. Verifica os critérios mínimos:
     - `target_role` não nulo e com `length > 0`.
     - `seniority` não nulo e com `length > 0`.
     - Total de habilidades (`skills.length + primary_stack.length + secondary_stack.length > 0`).
  4. Se válido e `onboarding_completed === 0`, chama `updateOnboardingStatus(userId, true)` para marcar no banco e retorna `true`.
- Atualizar o método `upsertProfile`:
  - Executar `this.isOnboardingComplete(userId)` ao final do upsert para atualizar o status do usuário na mesma operação.

### Component 2: Endpoints de API ([/api/candidate/profile](file:///home/moa-dev/projetos/buscavag/src/app/api/candidate/profile/route.ts) & [/api/candidate/recommended-jobs](file:///home/moa-dev/projetos/buscavag/src/app/api/candidate/recommended-jobs/route.ts))

#### [MODIFY] [profile/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/candidate/profile/route.ts)
- Retornar o campo `onboardingCompleted` no JSON de resposta do `PUT`, informando a UI se a trava de onboarding foi liberada.

#### [MODIFY] [recommended-jobs/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/candidate/recommended-jobs/route.ts)
- Substituir a checagem legada `if (!user || !user.onboarding_completed)` pela chamada ao helper unificado `repo.isOnboardingComplete(session.userId)`.

---

### Component 3: Runner de Testes da Fase (`src/test-phase72.ts`)

#### [NEW] [test-phase72.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase72.ts)
- Criar suíte de testes automatizados para a Phase 72:
  - Teste 1: Usuário recém-criado possui `onboarding_completed = 0` e `isOnboardingComplete()` retorna `false`.
  - Teste 2: Preenchimento manual parcial do perfil (sem skills) mantém `onboarding_completed = 0`.
  - Teste 3: Preenchimento manual válido (cargo + senioridade + skill) executa `upsertProfile` e marca automaticamente `onboarding_completed = 1`.
  - Teste 4: Consulta a `/api/candidate/recommended-jobs` para perfil preenchido manualmente passa no status 200 (desbloqueado).

---

## Verification Plan

### Automated Tests
- Executar a suíte de testes dedicada da Phase 72:
  ```bash
  npx tsx src/test-phase72.ts
  ```
- Executar os testes gerais de não-regressão:
  ```bash
  npm test
  ```
- Checar erros de compilação TypeScript e Next.js build:
  ```bash
  npm run build:next
  ```

### Manual Verification
- Testar preenchimento manual do perfil na aba "Perfil Profissional" em `/candidate` e verificar se a aba "Vagas Recomendadas" é desbloqueada sem depender de upload de CV.
