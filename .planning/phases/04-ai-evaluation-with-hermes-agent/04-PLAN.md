# Phase 4 Plan: AI Evaluation with Hermes Agent

## Goal
Implementar a camada de inteligência com o `HermesEvaluator` para avaliar semanticamente as vagas coletadas e determinar a aprovação para a categoria 'Dev Full Stack Jr'.

## Tasks

### Task 1: Hermes AI Evaluator Service
- Instalar `openai` SDK para cliente genérico compatível com APIs de IA.
- Criar `src/services/hermesEvaluator.ts`.
- Definir o prompt do sistema para avaliação rigorosa de nível e stack.
- Implementar modo heurístico inteligente como fallback de resiliência.

### Task 2: AI Pipeline Integration
- Atualizar o modelo de persistência para armazenar o resultado da avaliação (`is_junior_fullstack`, `score_ia`, `ai_reasoning`).

### Task 3: Integration Test Script
- Criar `src/test-ai.ts` para testar o avaliador com amostras de vagas (Jr vs Senior vs Pleno).

## Verification
- Validar compilação (`tsc --noEmit`).
- Rodar `npx tsx src/test-ai.ts` e validar a classificação das vagas.
