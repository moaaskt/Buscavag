# Phase 7: Advanced AI Matching & Compatibility Ranking - Context & Decisions

## Context
O Buscavag v1.0 já possui avaliação de vagas via Hermes Agent (OpenAI) com fallback heurístico. Atualmente, o output é binário (`isJuniorFullStack: true/false`) com um `score` numérico e um `reasoning` textual genérico.

A Fase 7 evolui radicalmente esta análise para fornecer um matching granular, inteligente e acionável para cada vaga coletada.

---

## Funcionalidades Selecionadas (Todas as 5)

### 1. Ranking Detalhado de Compatibilidade
- Score granular decomposto por dimensão:
  - `stackScore` (0-100): Compatibilidade técnica com a stack de Moacir.
  - `seniorityScore` (0-100): Adequação de nível (Junior/Entry vs Pleno/Senior).
  - `locationScore` (0-100): Adequação geográfica / modelo de trabalho.
  - `overallScore` (0-100): Score final ponderado.

### 2. Análise de Lacunas (Gap Analysis)
- Listar tecnologias que a vaga pede mas que **não estão** na stack de Moacir.
- Campo: `gaps: string[]` (ex: `["AWS", "Kubernetes", "GraphQL"]`).

### 3. Sugestões para Currículo / Apresentação
- Campo: `resumeTips: string` — Dicas específicas para customizar o currículo para aquela vaga.
- Persistido no banco, mas **NÃO** enviado no Telegram.

### 4. Categorização Automática de Vagas
- Campo: `category: string` — Uma das opções: `"Frontend"`, `"Backend"`, `"Full Stack"`, `"DevOps"`, `"Data"`, `"Mobile"`, `"Other"`.

### 5. Notificação Enriquecida no Telegram
- Incluir no Telegram: **Score detalhado por dimensão**, **Categoria** e **Gaps**.
- **NÃO** incluir dicas de currículo no Telegram (privacidade).

---

## Decisões Técnicas

### Provedor de IA
- **Manter Hermes/OpenAI** com fallback heurístico existente.
- Enriquecer o prompt para retornar o JSON estruturado com os novos campos.
- O fallback heurístico também será atualizado para gerar os mesmos campos.

### Threshold Configurável
- Variável `MATCH_THRESHOLD` no `.env` (default: `55`).
- Vagas com `overallScore >= MATCH_THRESHOLD` E `locationScore > 0` são aprovadas.

### Persistência no Banco de Dados (SQLite)
- **Novos campos na tabela `jobs`:**
  - `stack_score` INTEGER
  - `seniority_score` INTEGER
  - `location_score` INTEGER
  - `category` TEXT
  - `gaps` TEXT (JSON stringified array)
  - `resume_tips` TEXT
- Migração automática via `ALTER TABLE` no `initDatabase()`.

### Interface `EvaluationResult` Estendida
```typescript
export interface EvaluationResult {
  isJuniorFullStack: boolean;
  overallScore: number;
  stackScore: number;
  seniorityScore: number;
  locationScore: number;
  category: string;
  gaps: string[];
  resumeTips: string;
  reasoning: string;
}
```

---

## Critérios de Sucesso da Fase 7
- [ ] Interface `EvaluationResult` estendida com scores granulares, gaps, category e resumeTips.
- [ ] Prompt IA atualizado para retornar JSON estruturado com todos os novos campos.
- [ ] Fallback heurístico atualizado para gerar os mesmos campos.
- [ ] Schema SQLite migrado com novos campos.
- [ ] `JobRepository.insert()` persistindo os novos campos.
- [ ] `MATCH_THRESHOLD` configurável via `.env`.
- [ ] Notificação Telegram enriquecida (score detalhado + categoria + gaps).
- [ ] Build TypeScript sem erros e pipeline E2E funcional.
