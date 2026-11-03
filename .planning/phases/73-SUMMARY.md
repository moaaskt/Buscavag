# Summary: Phase 73 - Filtro Geográfico de Localização & Hard Constraint Presencial/Híbrido

## Result Summary
- **Phase Status**: Concluída com sucesso (10/10 testes específicos e 9/9 testes de regressão aprovados)
- **Data de Conclusão**: 23/09/2026

## Features & Improvements Implemented

1. **Migração de Schema + `db/index.ts`**:
   - Colunas `city TEXT` e `state TEXT` adicionadas à tabela `candidate_profiles`.
   - Migration automática para bancos já existentes via `ALTER TABLE`.

2. **`CandidateProfile` Interface + `CandidateRepository`**:
   - Interface `CandidateProfile` recebe `city: string | null` e `state: string | null`.
   - `getProfile()`, `upsertProfile()` e `getCandidateContext()` atualizados para ler/gravar os novos campos.

3. **`evaluateGeographicCompatibility()` em `candidateMatcher.ts`**:
   - Nova função pura e exportável com matriz de 4 cenários:
     - Vaga remota → score preservado (sem cap geográfico).
     - Candidato sem cidade → score neutro 70 (sem penalização).
     - Mesma cidade → score 100, sem teto.
     - Mesmo estado, cidades diferentes → score 55, teto 70%.
     - Estado diferente → score 15, **Hard Block (teto 35%)**.
   - Normalização de strings (acentos, case, pontuação) para comparação robusta.
   - `CandidateContext` recebe `city?` e `state?`.
   - Integrada em `calculateMatch()` substituindo o bloco de localização legado.

4. **API `profile/route.ts`**:
   - `profileSchema` Zod estendido com `city: z.string().max(100).optional().nullable()` e `state: z.string().max(2).optional().nullable()`.

5. **UI `/candidate/page.tsx`**:
   - Interface `ProfileData` e estado inicial atualizados com `city`/`state`.
   - Campo de texto "Cidade" + select "Estado (UF)" adicionados abaixo dos botões de modelo de trabalho.
   - Dica contextual amarela exibida quando candidato seleciona Presencial/Híbrido sem cidade cadastrada.
   - Dados carregados do servidor e sincronizados corretamente em todos os handlers.

## Verification Results
- **Phase 73 Test Runner**: 10/10 testes aprovados (`npx tsx src/test-phase73.ts`).
- **Unified Test Runner**: 9/9 suítes gerais sem regressão (`npm test`).
- **TypeScript Build**: `npm run build:next` compilado com 0 erros TypeScript.
