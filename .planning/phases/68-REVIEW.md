# Code Review: Phase 68 — Parser Técnico Agnóstico no HermesEvaluator & Ingestão Multi-Tenant

**Data:** 21/09/2026  
**Escopo Analisado:** Implementações e alterações da Fase 68 (`HEAD`)  
**Arquivos Principais:**
- `src/services/hermesEvaluator.ts`
- `src/index.ts`
- `src/db/repository.ts`
- `src/db/index.ts`
- `src/types/job.ts`
- `src/services/candidateMatcher.ts`
- `src/test-phase68.ts`

---

## 1. Sumário Executivo

A implementação da **Phase 68** concluiu com maestria a transição da arquitetura para o modelo **SaaS Multi-Candidato**, separando a ingestão universal de oportunidades de software da filtragem individualizada por candidato:

1. **Desacoplamento do Perfil Pessoal:** O `HermesEvaluator` foi desvinculado de qualquer candidato fixo (Moacir Neto / Jr / Floripa) e transformado em um extrator analítico e neutro de informações técnicas (`isTechSoftware`, `requiredSeniority`, `techStack`, `workModel`, `salary`).
2. **Barreira Anti-Falso-Positivo:** O prompt de IA e a heurística de fallback foram blindados para categoricamente classificar como `isTechSoftware = false` e `category = 'Other'` papéis não-técnicos em empresas tech (ex: SDR, BDR, Inside Sales, Tech Recruiter, RH, Financeiro, SAC).
3. **Ingestão Universal & Persistência no SQLite:** O pipeline em `src/index.ts` acolhe vagas técnicas de todos os níveis (Estágio, Júnior, Pleno, Sênior, Lead), persistindo metadados estruturados no SQLite para cálculo de match em tempo real pelo frontend.
4. **Preservação das Hard Constraints da Fase 65:** O `CandidateMatcher` consome os metadados pré-computados e mantém o teto eliminatório cravado em no máximo 35% para candidatos Júnior em vagas Sênior/Lead.

**Status Geral:** ✅ **APROVADO SEM RESSALVAS CRÍTICAS**

---

## 2. Análise Detalhada por Pilar

### 🛡️ Segurança & Integridade de Dados (Security)
- **Prepared Statements no SQLite:** Em `src/db/repository.ts`, a gravação das novas colunas (`required_seniority`, `tech_stack`, `work_model`, `is_tech_software`) continua 100% parametrizada com bind parameters no `db.prepare(...).run(...)`, mantendo imunidade a SQL Injection.
- **Serialização e Desserialização Segura:** O array `tech_stack` é persistido via `JSON.stringify` e recuperado via bloco `try-catch` seguro em `mapRowToJob`, evitando que eventuais corrupções manuais de banco crashem a aplicação.
- **Migração Idempotente:** A migração de banco em `src/db/index.ts` verifica a existência prévia das colunas via `PRAGMA table_info(jobs)` antes de emitir os comandos `ALTER TABLE`, prevenindo erros de concorrência ou re-execuções duplicadas.

### 🐛 Confiabilidade & Lógica de Negócio (Correctness)
- **Resiliência Heurística & Escape de Regex:** No método `evaluateHeuristic`, o escape dinâmico de caracteres especiais (`tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) protege a criação do `RegExp` contra quebras com termos técnicos como `c++`, `.net` e `node.js`.
- **Retrocompatibilidade de Bot & Legados:** A propriedade `isJuniorFullStack` foi mantida no retorno do avaliador computada de forma lógica (`isTechSoftware && (requiredSeniority === 'Júnior' || requiredSeniority === 'Estágio' || requiredSeniority === 'Não especificado')`), mantendo 100% de retrocompatibilidade com o bot Telegram e testes legados.
- **Tolerância a Contextos Incompletos:** No `CandidateMatcher`, a validação de `preferredWorkModels` foi reforçada com fallback resiliente e checagem case-insensitive (`Array.isArray(...) && length > 0 ? ... : default`), evitando `TypeError` com objetos de contexto parciais.

### ⚡ Performance & Recursos (Performance)
- **Zero Inferência Duplicada:** Os metadados de senioridade e stack são extraídos uma única vez na borda de ingestão e persistidos no SQLite. Quando múltiplos candidatos navegam pelo board ou solicitam matches, o sistema consome os campos já indexados, economizando custos e cotas de API do Gemini.
- **Short-circuit na Ingestão:** Anúncios não-técnicos ou categorias descartadas (`Other`) executam `continue` imediato antes das operações de inserção e notificação, poupando I/O de escrita desnecessário.

### 🧱 Arquitetura & Governança (Architecture)
- **Divisão Cirúrgica de Responsabilidades:**
  - *Ingestão (`src/index.ts`)*: Coletor universal de dados brutos e filtro de qualidade técnica (elimina ruído não-tech).
  - *HermesEvaluator (`src/services/hermesEvaluator.ts`)*: Parser analítico agnóstico de dados de mercado.
  - *CandidateMatcher (`src/services/candidateMatcher.ts`)*: Motor dinâmico de compatibilidade personalizada por usuário.

---

## 3. Matriz de Severidade das Descobertas

| ID | Arquivo | Linha | Severidade | Descrição | Status |
|---|---|---|---|---|---|
| F-01 | `src/services/hermesEvaluator.ts` | 62-70, 180-194 | Info | Calibração estrita anti-falso-positivo para papéis não-técnicos em empresas tech | ✅ Implementado & Validado |
| F-02 | `src/services/hermesEvaluator.ts` | 250-258 | Baixa (Corrigida) | Escape seguro de caracteres especiais em RegExp para stacks técnicas (`c++`, `.net`) | ✅ Corrigido & Validado |
| F-03 | `src/db/repository.ts` | 85-138, 381-394 | Info | Persistência e leitura íntegra de metadados enriquecidos (`required_seniority`, `tech_stack`, etc.) | ✅ Validado |
| F-04 | `src/services/candidateMatcher.ts` | 512-518 | Baixa (Corrigida) | Normalização case-insensitive e tolerância a nulos em `preferredWorkModels` | ✅ Corrigido & Validado |
| F-05 | `src/index.ts` | 80-105 | Info | Substituição da trava `score <= 35` por descarte estrito de não-tech | ✅ Validado |

---

## 4. Evidências de Teste & Validação

- `npx tsx src/test-phase68.ts`: **100% de sucesso** em todos os 4 cenários (Vaga Sênior Jr vs Sr, Vaga Júnior, Descarte de SDR/RH/Financeiro e Persistência no SQLite).
- `npm run build` (`tsc`): **0 erros de compilação**.
- `npm run test` & `npm run test:phase8`: **16/16 testes de regressão aprovados com sucesso**.
