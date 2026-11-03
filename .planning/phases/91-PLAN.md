# Phase 91 Plan: Refatoração Rigorosa do Fallback Heurístico & Blacklist Não-Tech

## Vision & Goal
Eliminar definitivamente a ingestão e rotulagem indevida de vagas não-tech no Buscavag. A fase implementará uma blacklist contextual rigorosa com precedência para termos de software, refatorará o fallback heurístico do `HermesEvaluator` para proibir categoricamente a atribuição da tag `"Full Stack"` por default e executará a higienização do banco de dados SQLite expurgando registros legados contaminados.

---

## Requirements Addressed

- **`REQ-91-01` (Blacklist Categórica de Títulos Não-Tech)**:
  - Expandir [src/config/jobFilters.ts](file:///home/moa-dev/projetos/buscavag/src/config/jobFilters.ts) com regex e termos contextuais para ocupações administrativas, comerciais, de saúde, engenharias tradicionais e estágios não-tech.
  - Implementar precedência para termos explícitos de software (`desenvolvedor`, `software engineer`, `programador`) para evitar falso descarte em vagas com contexto híbrido.
  - Atualizar `matchesBlacklist()`, `matchesWhitelist()` e `isTechJob()`.

- **`REQ-91-02` (Refatoração do Fallback Heurístico Anti-Falso-Positivo)**:
  - Modificar [src/services/hermesEvaluator.ts](file:///home/moa-dev/projetos/buscavag/src/services/hermesEvaluator.ts):
    - Se a vaga for identificada como não-tech ou não possuir termos explícitos de desenvolvimento/TI, definir `isTechSoftware: false`, `isJuniorFullStack: false`, `overallScore: 0` e `category: 'Não-Tech'`.
    - Proibir a atribuição padrão de `"Full Stack"` (`else { category = 'Full Stack'; }`). Apenas vagas com termos explícitos (`fullstack`, `full stack`, ou menção conjunta de frontend e backend) recebem a categoria Full Stack. Vagas tech genéricas sem especialização recebem `'Software Geral'`.
    - Garantir que vagas rejeitadas tenham `reasoning` explicativo para alimentar auditoria e expurgo.

- **Higienização de Dados Legados (Hard Delete de Vagas Contaminadas)**:
  - Criar rotina utilitária [src/scripts/sanitize-nontech-jobs.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/sanitize-nontech-jobs.ts) para identificar e executar hard delete das vagas não-tech que haviam recebido indevidamente `is_junior_fullstack = 1` ou categoria `"Full Stack"`.

- **Suíte Determinística de Testes**:
  - Desenvolver a suíte de testes [src/test-phase91.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase91.ts) cobrindo todos os cenários de blacklist, precedência, fallback sem "Full Stack" forçado e higienização.

---

## Proposed Changes

### Component 1: Expansão dos Filtros de Título e Blacklist
#### [MODIFY] [src/config/jobFilters.ts](file:///home/moa-dev/projetos/buscavag/src/config/jobFilters.ts)
- Adicionar lista de padrões e regexes para:
  - Assistentes/Auxiliares administrativos, fiscais, contábeis, de vendas e DP.
  - Corretores de imóveis e seguros, vendedores e telemarketing.
  - Ocupações de saúde: enfermeiro, técnico de enfermagem, médico, dentista, farmacêutico, psicólogo.
  - Estágios não-tech: estágio em RH, logística, vendas, direito, pedagogia.
  - Engenharias não-software: engenheiro eletricista, civil, mecânico, clínico, agrônomo, ambiental.
- Regra de precedência: se o título contiver `software`, `desenvolvedor`, `developer`, `programador`, `devops`, `fullstack`, `frontend`, `backend`, avaliar se o contexto principal é de TI antes de aplicar a blacklist.

---

### Component 2: Refatoração do Fallback no HermesEvaluator
#### [MODIFY] [src/services/hermesEvaluator.ts](file:///home/moa-dev/projetos/buscavag/src/services/hermesEvaluator.ts)
- Integrar a blacklist atualizada na etapa 1 de `evaluateHeuristic(job)`.
- Se `!isTechSoftware`:
  - `category = 'Não-Tech'`
  - `isJuniorFullStack = false`
  - `overallScore = 0`
  - `score = 0`
- Na categorização técnica:
  - Substituir o fallback `category = 'Full Stack'` por `'Software Geral'`.
  - Atribuir `'Full Stack'` somente se houver regex matching: `/full\s*stack|fullstack/i` ou a presença conjunta de frontend e backend.

---

### Component 3: Script de Higienização de Vagas Legadas
#### [NEW] [src/scripts/sanitize-nontech-jobs.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/sanitize-nontech-jobs.ts)
- Conecta ao banco de dados SQLite `buscavag.db`.
- Consulta todas as vagas marcadas como aprovadas (`is_junior_fullstack = 1`) ou com categoria `"Full Stack"`.
- Submete cada vaga ao novo `isTechJob` e `evaluateHeuristic`.
- Executa hard delete de todas as vagas não-tech encontradas e reclassifica categorias espúrias.
- Retorna contagem precisa de registros expurgados.

---

### Component 4: Suíte Determinística de Testes
#### [NEW] [src/test-phase91.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase91.ts)
- Testes automatizados executáveis com `npx tsx src/test-phase91.ts`:
  1. Teste de blacklist para "Assistente Fiscal", "Corretor de Imóveis", "Engenheiro Clínico", "Enfermeiro", etc.
  2. Teste de precedência para "Engenheiro de Software | Assistente" e "Desenvolvimento para Corretora de Seguros".
  3. Teste de fallback do `HermesEvaluator` para vaga não-tech resultando em `isTechSoftware: false`, `isJuniorFullStack: false`, `overallScore: 0`, `category: 'Não-Tech'`.
  4. Teste de que vaga tech genérica sem termo fullstack NÃO recebe a categoria "Full Stack" (recebe "Software Geral").
  5. Teste de que vaga expressamente "Desenvolvedor Full Stack" recebe "Full Stack".
  6. Teste de execução da rotina de higienização e validação de que zero vagas não-tech permanecem aprovadas no banco de dados.

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase91.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
   npx tsx src/test-phase90.ts
   npx tsx src/test-phase89.ts
   npx tsx src/test-phase88.ts
   npx tsx src/test-phase87.ts
   npx tsx src/test-phase86.ts
   npx tsx src/test-phase85.ts
   npx tsx src/test-phase84.ts
   npx tsx src/test-phase83.ts
   npx tsx src/test-phase82.ts
   ```
3. **Regressão Global de Testes**:
   ```bash
   npm test
   ```
4. **Verificação Estrita de Tipagem TypeScript**:
   ```bash
   npx tsc --noEmit
   ```

### Manual / Browser Verification
1. Consultar a lista de vagas em `/admin/vagas` e na visualização pública e certificar-se de que nenhum corretor ou assistente não-tech aparece na listagem.
2. Inspecionar contadores de "Ruído / Descarte" e "Taxa de Fit IA" na Dashboard `/admin` confirmando a purga.
