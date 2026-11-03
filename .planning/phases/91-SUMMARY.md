# Phase 91 Summary: Refatoração Rigorosa do Fallback Heurístico & Blacklist Não-Tech

## Resumo Executivo
A **Phase 91** estabeleceu uma barreira estrita e categórica contra a entrada de vagas não-tech no BuscaVagas. Anteriormente, na ausência de resposta da IA, o fallback heurístico atribuía a etiqueta `"Full Stack"` por padrão a qualquer vaga não-classificada, poluindo o feed com oportunidades de áreas completamente distintas (ex.: assistentes fiscais, corretores de imóveis, motoristas, enfermeiros, engenheiros não-software e estágios administrativos). 

Com as implementações da Phase 91, qualquer oportunidade sem menção explícita a termos técnicos de software é sumariamente rejeitada (`isTechSoftware: false`, `overallScore: 0`, `category: 'Não-Tech'`). Além disso, mesmo para vagas de software genuínas, a categoria `"Full Stack"` agora exige menção expressa de full stack ou domínio conjunto de frontend e backend, sendo categorizadas como `"Software Geral"` quando genéricas. O banco de dados SQLite existente foi higienizado via hard delete, expurgando 55 vagas contaminadas e reclassificando 87 vagas erroneamente marcadas como Full Stack.

---

## Entregas Realizadas

### 1. Blacklist Estruturada e Precedência Técnica (`REQ-91-01`)
- **[src/config/jobFilters.ts](file:///home/moa-dev/projetos/buscavag/src/config/jobFilters.ts)**:
  - Criação da lista categórica com padrões regex `TITLE_BLACKLIST_PATTERNS` cobrindo:
    - Assistente / Auxiliar administrativo, fiscal, contábil, financeiro, DP, compras, RH, cobrança, SAC, etc.
    - Vendas, corretores (imóveis, seguros), operadores comerciais, balconistas, recepcionistas.
    - Saúde e estética (enfermagem, médicos, fisioterapia, odontologia, estética).
    - Engenharia não-software (civil, mecânico, elétrico, ambiental, produção, engenharia clínica).
    - Operações, logística e serviços gerais (motoristas, estoquistas, portaria, manutenção predial).
    - Estágios não-tech (RH, direito, pedagogia, contabilidade, administração).
  - Implementação de `EXPLICIT_SOFTWARE_PATTERNS` para garantir **precedência técnica**, evitando falsos positivos em títulos complexos (ex: *"Engenheiro de Software | Assistente"* ou *"Desenvolvedor de Automação para Corretora de Imóveis"*).
  - Atualização dos métodos `matchesBlacklist()` e `isTechJob()`.

### 2. Refatoração Rigorosa do Fallback Heurístico (`REQ-91-02`)
- **[src/services/hermesEvaluator.ts](file:///home/moa-dev/projetos/buscavag/src/services/hermesEvaluator.ts)**:
  - `evaluateHeuristic(job)` agora avalia estritamente `isTechSoftware` usando `isTechJob(job.title, job.description)`.
  - Se a vaga for não-tech:
    - `isTechSoftware`: `false`
    - `isJuniorFullStack`: `false`
    - `overallScore`: `0`
    - `category`: `'Não-Tech'`
    - `reasoning`: `"Rejeitada via Heurística: Oportunidade não classificada como desenvolvimento ou tecnologia."`
  - Se a vaga for técnica:
    - `"Full Stack"` só é atribuído se o texto contiver menção explícita (`full stack`, `fullstack`, ou ambos `frontend` e `backend`).
    - Na ausência de subcategoria específica, atribui categoricamente `"Software Geral"` (proibição absoluta de Full Stack default).

### 3. Trava de Descarte na Ingestão (`REQ-91-03`)
- **[src/index.ts](file:///home/moa-dev/projetos/buscavag/src/index.ts)**:
  - Pipeline de processamento atualizado para descartar vagas onde `evalResult.category === 'Não-Tech'` ou `evalResult.category === 'Other'` ou `!evalResult.isTechSoftware`.
  - Registro de auditoria nos scrapers via `ScraperLogger.log()` categorizando descarte por `non_tech`.

### 4. Utilitário de Higienização e Hard Delete no Banco (`REQ-91-04`)
- **[src/scripts/sanitize-nontech-jobs.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/sanitize-nontech-jobs.ts)**:
  - Script que percorre todo o acervo de vagas persistidas no SQLite `buscavag.db`.
  - Executa reavaliação heurística contra as novas regras.
  - Vagas não-tech são deletadas permanentemente (Hard Delete via `DELETE FROM jobs WHERE id = ?`).
  - Vagas técnicas legítimas com tag "Full Stack" genérica são reclassificadas para "Software Geral".
  - **Resultado da execução no banco**:
    - **Total examinado**: 667 vagas
    - **Vagas não-tech expurgadas**: 55 vagas deletadas
    - **Vagas reclassificadas de "Full Stack"**: 87 vagas corrigidas para "Software Geral"
    - **Vagas técnicas válidas preservadas**: 525 vagas

---

## Verificação e Testes

- **Suíte Determinística**: [src/test-phase91.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase91.ts) com **59 testes aprovados** (100% de sucesso):
  - 28 testes de bloqueio categórico de blacklist (assistentes, corretores, enfermeiros, engenheiros civis/elétricos, motoristas, estágios não-tech).
  - 16 testes de precedência técnica para software legítimo com palavras ambíguas.
  - 11 testes unitários de `evaluateHeuristic` (rejeição não-tech, ausência de Full Stack default, aprovação de Full Stack genuíno).
  - 4 testes de higienização do banco e garantia de zero vagas residuais não-tech no SQLite.
- **Regressão Global**:
  - `npm test`: 9/9 suítes completas aprovadas com 100% de sucesso (Core Base DB, Kanban & Analytics, Candidate Auth, RBAC Control, Multi-Tenant Isolation, Kanban Inbox, Agnostic Parser, Pitch Dinâmico, Security & Resilience).
  - Suítes determinísticas das fases 88, 89 e 90 executadas e aprovadas com 100% de sucesso.
- **Tipagem Estrita**:
  - `npx tsc --noEmit` executado com 0 erros de compilação.

---

## Próximo Passo
- **Phase 92**: Matriz de Deduplicação Inteligente (Fingerprinting Multi-Fonte via hash normalizado de título, empresa e cidade/UF).
