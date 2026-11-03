# Phase 73 — REVIEW.md (Consolidado - Rodada 2)

**Data**: 2026-09-23  
**Resultado da Rodada 2**: 0 Critical · 2 Warning (Edge cases) · 2 Info  
**Status**: **APROVADO** (Todos os 6 apontamentos da rodada anterior foram corrigidos)

Veja o review detalhado em [`code_review.md`](file:///home/moa-dev/.gemini/antigravity-ide/brain/a99a2f27-54a8-4b26-9d73-9cefc01624dc/code_review.md).

---

## 1. Verificação dos Fixes Aplicados

- [x] **W-01** `candidateMatcher.ts:413`: Falso-positivo de cidade como substring ("Rio" em "Rio Grande do Sul") resolvido com word boundary e guarda de estado.
- [x] **W-02** `profile/route.ts:18`: Validação estrita de UF com `z.enum(VALID_UFS)` cobrindo as 27 unidades federativas.
- [x] **W-03** `candidateRepository.ts:97`: `createUser()` agora inicializa o perfil explicitando `city` e `state` como `NULL`.
- [x] **I-02** `candidateMatcher.ts:347`: `jobTitle` incluído na verificação de vagas remotas ("Remoto" / "Home Office"), restaurando o comportamento esperado.
- [x] **I-04** `profile/route.ts:17`: Sanitização com `.trim()` no campo `city`.
- [x] **I-05** `candidate/page.tsx:1228`: Indentação corrigida no JSX do formulário de preferências.

---

## 2. Testes e Estabilidade

- **Testes Unitários Phase 73**: 13/13 aprovados (`npx tsx src/test-phase73.ts`), incluindo novos testes para os fixes (T11, T12, T13).
- **Testes de Regressão Global**: 9/9 suítes verdes no runner unificado (`npm test`).
- **Compilação Next.js**: Build bem-sucedido com 0 erros TypeScript (`npm run build:next`).

---

## 3. Apontamentos para Backlog / Refinamento Futuro

- **W-01.1** `candidateMatcher.ts`: Tratar vagas presenciais com cidade sem UF explícita no campo de localização para não gerar Hard Block indevido.
- **W-01.2** `candidateMatcher.ts`: Tratar vagas presenciais com localização vazia/indefinida com pontuação neutra em vez de penalização de estado.
- **I-06** `profile/route.ts`: Aceitar `state: ""` como `null` na camada de validação da API para clientes REST legados.
