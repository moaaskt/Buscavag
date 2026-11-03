# Phase 58: Parser Semântico com Hermes IA & Classificação de Vagas Informais

Esta fase expandiu a capacidade do `HermesEvaluator` para extrair dados estruturados adicionais de vagas a partir de textos informais (como os capturados da Phase 57 - Facebook Groups).

## Alterações Realizadas

### Atualização do Modelo de Dados
- **`src/types/job.ts`**: Adicionados os campos `extractedRole`, `contractType`, `applicationChannel` e `salary` ao `ProcessedJobSchema` (Zod) e respectiva interface TypeScript.
- **`src/db/index.ts`**: Atualizado o esquema do SQLite para incluir automigrações seguras das colunas `extracted_role`, `contract_type`, `application_channel` e `salary` na tabela `jobs`.
- **`src/db/repository.ts`**: Modificado o `insert()` para persistir as novas propriedades e atualizada a função interna `mapRowToJob()` para popular as entidades no formato de resposta JSON do app.

### Melhoria do Parser Semântico (HermesEvaluator)
- **Prompt LLM Atualizado**: O `HermesEvaluator` passou a instruir o Gemini para extrair e classificar o "Cargo" exato, "Tipo de Contrato" (CLT, PJ, Freela, Internacional), "Canal de Candidatura" (Email, DM, Link Externo) e "Salário".
- **Resiliência e Fallback Heurístico**: Se o Gemini não responder ou cair em timeout/rate limit, a função `evaluateHeuristic` garante valores seguros de fallback (ex: atribuindo a string "Não informado") e mantém as lógicas robustas que não travam o loop do `ScraperOrchestrator`.
- **Correção de Nome de Modelo**: Resolvido fallback de inicialização do SDK para utilizar o `gemini-flash-latest` (para bypass seguro de fallback no mock).

## Verificação
- Criado o script local `scripts/test-phase58.ts` contendo um JSON simulando a extração do Facebook Groups.
- O teste obteve êxito ao executar o script localmente, demonstrando a injeção funcional tanto no engine do HermesEvaluator quanto no repositório de Banco de Dados.

O pipeline assíncrono agora alimenta dados valiosos, abrindo portas para a Phase 59 e Phase 60 implementarem UIs enriquecidas e Dashboards de Analytics assertivos.
