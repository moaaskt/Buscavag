# Phase 4 Validation Strategy

## Tests
- Testar o `HermesEvaluator` com amostras reais de vagas (ex: Vaga Jr Fullstack -> Aprovada, Vaga Senior -> Rejeitada).
- Testar o modo Heurístico de fallback (sem chave de API).
- Validar a estruturação do retorno JSON com Zod.

## Commands
```bash
npx tsx src/test-ai.ts
```
