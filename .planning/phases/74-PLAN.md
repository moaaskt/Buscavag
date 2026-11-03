# Phase 74 Plan: Refinamento de Matching Geográfico (Cidades sem UF & Localizações Omissas)

## Vision & Goal
Aprimorar o motor de compatibilidade geográfica (`evaluateGeographicCompatibility()` em `src/services/candidateMatcher.ts`) para eliminar falsos-positivos de Hard Block geográfico em vagas presenciais e híbridas. A fase resolve dois comportamentos mapeados no code review:
1. **W-01.1**: Vagas presenciais cuja string de localização traga o nome da cidade correto do candidato mas omita a sigla da UF (ex.: `"Florianópolis"`, `"Curitiba"`, `"São Paulo"`) passarão a ter match municipal perfeito (score 100, sem teto), desde que não haja menção explícita a estado conflitante.
2. **W-01.2**: Vagas presenciais com localização nula, vazia ou `"Não informado"` receberão pontuação neutra (score 70, sem teto, sem Hard Block), eliminando punição arbitrária por carência de dados no anúncio raspado.

---

## Requirements Addressed
- **`REQ-01`**: Refatorar `evaluateGeographicCompatibility()` em `candidateMatcher.ts` para tratar vagas presenciais/híbridas com campo `location` nulo, vazio ou sem dados geográficos, retornando avaliação neutra (`locationScore: 70`, `locationCap: 100`, `isGeoHardBlocked: false`).
- **`REQ-02`**: Permitir match municipal (`locationScore: 100`, sem teto) quando a cidade do candidato constar como palavra inteira na localização da vaga mesmo que a vaga omita a UF, desde que não haja menção explícita a outro estado brasileiro conflitante e prevenindo colisões de prefixo (ex: "Rio" vs "Rio Grande do Sul").
- **`REQ-03`**: Criar suíte de testes `src/test-phase74.ts` validando vagas com cidades sem UF ("Florianópolis", "Curitiba", "São Paulo"), vagas sem localização informada e regressões contra colisões semânticas.

---

## Proposed Changes

### Component 1: Candidate Matcher (`src/services/candidateMatcher.ts`)

#### [MODIFY] [candidateMatcher.ts](file:///home/moa-dev/projetos/buscavag/src/services/candidateMatcher.ts)
- Lista estática de UFs brasileiras válidas para detecção de estados conflitantes:
  ```typescript
  const BRAZILIAN_UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
                         'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'] as const;
  ```
- **Tratamento de Localização Omissa em Vaga Presencial (REQ-01 / W-01.2)**:
  - Adicionar checagem prévia de `jobLocation`: se for `null`, `undefined`, vazio ou contiver termos como `/(n[aã]o informad|a combinar|indefinid)/i`, retornar score neutro 70 e sem Hard Block.
- **Match de Cidade Resiliente à Ausência de UF (REQ-02 / W-01.1)**:
  - Detectar match da cidade do candidato com word boundary (`\b${city}\b`).
  - Prevenir colisão semântica se `normCandCity === 'rio'` e a vaga contiver `/\brio\s+grande\s+do\b/i`.
  - Checar se a vaga menciona explicitamente outra UF brasileira diferente da do candidato (`hasConflictingUf`).
  - Definir `cityInJob = cityMatches && !isPrefixCollision && (!hasConflictingUf || stateInJob)`.
  - Se `cityInJob` for verdadeiro: retornar score 100, sem teto.

---

### Component 2: Suíte de Testes Automatizada (`src/test-phase74.ts`)

#### [NEW] [test-phase74.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase74.ts)
- Testes cobrindo:
  1. **T01**: Vaga presencial com cidade "Florianópolis" (sem UF no texto) + candidato Florianópolis/SC ➔ Score 100, sem Hard Block.
  2. **T02**: Vaga presencial com cidade "Curitiba" (sem UF) + candidato Curitiba/PR ➔ Score 100, sem Hard Block.
  3. **T03**: Vaga presencial com cidade "São Paulo" (sem UF) + candidato São Paulo/SP ➔ Score 100, sem Hard Block.
  4. **T04**: Vaga presencial com `location = ""` ou `null` + candidato Florianópolis/SC ➔ Score 70 neutro, sem Hard Block.
  5. **T05**: Vaga presencial com `location = "A combinar / Não informado"` ➔ Score 70 neutro, sem Hard Block.
  6. **T06**: Candidato em "Rio/RJ" vs Vaga presencial em "Rio Grande do Sul, RS" ➔ Hard Block geográfico garantido (sem falso-positivo).
  7. **T07**: Candidato em "Rio de Janeiro/RJ" vs Vaga presencial em "Rio de Janeiro" (sem UF) ➔ Score 100, sem Hard Block.
  8. **T08**: Vaga presencial com UF conflitante (Candidato Florianópolis/SC vs Vaga "São Paulo, SP") ➔ Hard Block mantido.
  9. **T09**: Vaga remota com título "Home Office" ou "Remoto" ➔ Regra de remotos mantida íntegra.
  10. **T10**: Teste integrado via `CandidateMatcher.calculateMatch()` com vaga presencial sem UF.

---

## Verification Plan

### Automated Tests
1. Executar a suíte dedicada da Phase 74:
   ```bash
   npx tsx src/test-phase74.ts
   ```
2. Executar suítes anteriores para assegurar zero regressão:
   ```bash
   npx tsx src/test-phase73.ts
   npx tsx src/test-phase72.ts
   npx tsx src/test-phase71.ts
   ```
3. Executar o test runner unificado do BuscaVag:
   ```bash
   npm test
   ```
4. Validar compilação e tipagem estrita TypeScript:
   ```bash
   npm run build:next
   ```

### Manual Verification
- Testar compatibilidade de vagas reais no banco SQLite com candidatos simulados em Florianópolis e Curitiba.
