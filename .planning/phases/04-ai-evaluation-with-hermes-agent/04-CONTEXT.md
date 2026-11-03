# Phase 4: AI Evaluation with Hermes Agent - Context & Decisions

## Context
Desenvolvimento da integração com o Hermes Agent / IA para análise inteligente das vagas coletadas.

## Design Decisions
1. **Papel do Hermes Agent**:
   - Analisar o título e a descrição da vaga.
   - Determinar se a vaga é realmente de nível **Junior / Jr** ou **Entry Level**.
   - Determinar se a vaga exige atuação **Full Stack** (ou atende a competências de Front/Back de um Jr).
   - Atribuir uma pontuação de 0 a 100 (`score_ia`) e um breve parecer explicativo (`ai_reasoning`).
2. **Integração com LLM / Hermes API**:
   - Suporte a API OpenAI-compatible / Hermes Agent SDK (via variáveis de ambiente `HERMES_API_KEY` / `OPENAI_API_KEY` / `HERMES_API_URL`).
   - Fallback de heuristicas baseadas em regex quando as chaves de API não estiverem configuradas no `.env`.
3. **Formato do Prompt**:
   - Prompt de sistema especializado em análise técnica de requisitos de carreiras de software.
   - Retorno estruturado em formato JSON contendo `{ isJuniorFullStack: boolean, score: number, reasoning: string }`.
