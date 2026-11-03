# Phase 58: Parser Semântico com Hermes IA & Classificação de Vagas Informais

Esta fase expande a capacidade do `HermesEvaluator` (nosso parser semântico) para extrair dados estruturados adicionais de vagas, focando especialmente em publicações informais (como as de grupos do Facebook).

## Proposed Changes

### Database & Types
1. **[MODIFY] src/types/job.ts**: Em `ProcessedJobSchema` e `ProcessedJob`, adicionar `extractedRole` (string), `contractType` (enum/string), `applicationChannel` (enum/string) e `salary` (string).
2. **[MODIFY] src/db/index.ts**: Adicionar automigração e inserção das colunas `extracted_role`, `contract_type`, `application_channel`, `salary` na tabela `jobs`.
3. **[MODIFY] src/db/repository.ts**: Mapear as colunas no retorno de `mapRowToJob` e inseri-las em `insert()`.

### Hermes AI Evaluator
1. **[MODIFY] src/services/hermesEvaluator.ts**: 
   - Estender a `EvaluationResult` para conter os novos campos.
   - Expandir o prompt para pedir ao LLM que extraia o Cargo, Senioridade, Salário, Modelo de Contrato e Canal de Candidatura do texto cru.

### Core Pipeline
1. **[MODIFY] src/index.ts**: Nenhuma alteração pesada necessária, pois o `evaluator` injetará no `repo.insert`. Apenas logs podem ser enriquecidos.

## Verification
- Testes automatizados executando o `hermesEvaluator` em uma amostra de post do Facebook para validar se os novos nós do JSON são preenchidos corretamente.
