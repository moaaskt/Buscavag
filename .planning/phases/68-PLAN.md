# Phase 68: Parser Técnico Agnóstico no HermesEvaluator & Ingestão Multi-Tenant

**Objetivo:** Desacoplar o motor de avaliação do `HermesEvaluator` de qualquer perfil individual, transformando-o em um parser técnico neutro e universal de oportunidades de tecnologia, e ajustar a barreira de descarte na ingestão (`src/index.ts`) para eliminar exclusivamente posições não-tech/lixo, viabilizando o ecossistema multi-tenant da plataforma.

---

## 1. Mudanças Propostas

### 1.1 `src/services/hermesEvaluator.ts`
- **Interfaces:** Atualizar `EvaluationResult` com novos campos:
  - `isTechSoftware: boolean`: identifica se a vaga pertence ao setor de desenvolvimento/engenharia de software, dados, devops, mobile, etc.
  - `requiredSeniority: string`: senioridade exigida ('Estágio', 'Júnior', 'Pleno', 'Sênior', 'Especialista / Tech Lead', 'Não especificado').
  - `techStack: string[]`: lista de tecnologias, linguagens e frameworks exigidos.
  - `workModel: string`: 'Remoto', 'Híbrido', 'Presencial' ou 'Não informado'.
- **Prompt do LLM:** Remover todas as menções a "Moacir Neto", preferências pessoais de stack e restrições geográficas de Florianópolis.
  - O prompt solicitará classificação estrita de área técnica, extração de cargo conciso, nível de senioridade exigido, tecnologias mencionadas, modelo de trabalho, cidade/estado, faixa salarial e contato direto (e-mails/DMs).
- **Fallback Heurístico (`evaluateHeuristic`):**
  - Remover penalizações fixas de candidato.
  - Detectar `isTechSoftware` via `matchesWhitelist`.
  - Classificar `requiredSeniority` via expressões regulares existentes.
  - Extrair tecnologias presentes no texto da vaga.

### 1.2 `src/index.ts`
- **Barreira de Ingestão:** Substituir a condição de descarte `if (evalResult.overallScore <= 35)` por:
  ```typescript
  if (!evalResult.isTechSoftware || evalResult.category === 'Other') {
    discardedNonTechCount++;
    // log de descarte não-tech e continue
    continue;
  }
  ```
- **Preservação de Oportunidades:** Vagas de todos os níveis (Estágio a Sênior) e de diversas tecnologias passarão para o SQLite devidamente enriquecidas com seus metadados neutros.

### 1.3 `src/services/candidateMatcher.ts` & `src/db/repository.ts`
- O `CandidateMatcher` continuará sendo o **único responsável** por calcular a compatibilidade entre o candidato logado e a vaga salva no banco.
- O campo `requiredSeniority` extraído pelo Hermes será utilizado prioritariamente pelo `CandidateMatcher` para alimentar a matriz de distância de senioridade da Fase 65 (mantendo o Hard Block de 35% e soft penalties em tempo real para o usuário).

---

## 2. Plano de Validação Automatizada (`src/test-phase68.ts`)

1. **Teste do Parser Neutro:**
   - Vaga Sênior em Python (remota): `isTechSoftware = true`, `requiredSeniority = 'Sênior'`, `category = 'Backend'`.
   - Vaga Júnior em Node.js (Floripa): `isTechSoftware = true`, `requiredSeniority = 'Júnior'`, `category = 'Full Stack'`.
   - Vaga Não-Tech (ex: "Auxiliar de Almoxarifado"): `isTechSoftware = false`, `category = 'Other'`.
2. **Teste da Barreira de Ingestão:**
   - Vaga Sênior é **salva no banco** (pois é tech).
   - Vaga Não-Tech é **descartada na ingestão** (não entra no banco).
3. **Teste do Match Multi-Tenant:**
   - Para um candidato Júnior: a vaga Sênior recebe **Hard Block (Score <= 35%)**, enquanto a vaga Júnior recebe **Super Match (Score >= 75%)**.
   - Para um candidato Sênior: a vaga Sênior recebe pontuação alta (**Score >= 75%**).
