# Phase 70: Blindagem de Segurança, Runner Unificado de Testes & Resiliência

**Milestone:** v18.0  
**Status:** Concluído  
**Data:** 22/09/2026  

---

## 1. Objetivo da Fase
Finalizar a Milestone v18.0 com foco em salvaguardas rigorosas de produção, proteção contra condições de corrida e consolidação da suíte de testes:
1. **Blindagem de Segurança (`REQ-07`):** Bloquear fatalmente a inicialização da aplicação em ambiente de produção (`NODE_ENV=production`) caso a variável `AUTH_SECRET` esteja ausente, utilize o segredo default hardcoded ou possua menos de 32 caracteres.
2. **Resiliência e Anti-Race Condition (`REQ-09`):** Implementar salvaguardas duplas no endpoint `/api/candidate/analyze-cv`:
   - *Lock de Concorrência (In-Flight Guard)* via `Set<string>` em memória com liberação estrita em `finally`, retornando `HTTP 429` (`CONCURRENT_ANALYSIS_BLOCKED`) para requisições concorrentes para o mesmo `userId`.
   - *Cooldown Temporal (Post-Process Debounce)* de 5 segundos via `resume.analyzed_at`, retornando `HTTP 429` (`COOLDOWN_ACTIVE`) para reprocessamentos acidentais em rajada.
3. **Runner Unificado de Testes (`REQ-08`):** Criar `scripts/test-runner.ts` associado ao comando `npm test`, orquestrando sequencialmente suítes determinísticas do sistema, com monitoramento de tempo por suíte, captura estrita de código de saída de subprocessos e relatório consolidado.

---

## 2. Requisitos Cobertos
- `REQ-07`: Adicionar validação estrita no `src/lib/auth.ts` para bloquear inicialização em `NODE_ENV=production` se `AUTH_SECRET` for default, ausente ou menor que 32 caracteres.
- `REQ-08`: Criar runner de testes unificado (`npm test`) no `package.json` integrando os testes automatizados do projeto (`test-phase1`, `test-phase8`, `test-candidate-auth`, `test-rbac`, `test-session-isolation`, `test-phase67`, `test-phase68`, `test-phase69`, `test-phase70`).
- `REQ-09`: Adicionar lock de concorrência e cooldown de 5s contra reprocessamento concorrente e duplicado de currículo em `/api/candidate/analyze-cv`.

---

## 3. Escopo Cirúrgico de Arquivos
- `src/lib/auth.ts`: Função `validateAuthSecretSecurity()` executada no top-level na inicialização do módulo, abortando de forma fatal em `NODE_ENV=production` se o segredo for fraco/default.
- `src/app/api/candidate/analyze-cv/route.ts`: Lock em memória (`activeAnalyses`) com liberação em bloco `try ... finally`, e cooldown de 5s via SQLite `resume.analyzed_at`.
- `scripts/test-runner.ts`: Script orquestrador de execução sequencial de testes com relatório consolidado e checagem estrita de `exitCode != 0`.
- `package.json`: Atualização do script `"test": "tsx scripts/test-runner.ts"`.
- `src/test-phase70.ts`: Suíte de testes automatizados com cobertura completa dos cenários comportamentais.

---

## 4. Diferenciação dos Mecanismos do `analyze-cv` (REQ-09)

1. **Lock de Concorrência (In-Flight Concurrency Guard):**
   - **Problema:** Usuário ou bot envia duas requisições `POST /api/candidate/analyze-cv` simultâneas para o mesmo `userId`. Sem lock, ambas acionam paralelamente o microserviço Python/LLM, consumindo recursos e gerando condição de corrida na escrita do banco.
   - **Solução:** `const activeAnalyses = new Set<string>()`. Se o `userId` já constar no Set, rejeita imediatamente com `HTTP 429` (`CONCURRENT_ANALYSIS_BLOCKED`). Adiciona o `userId` antes do processamento e remove impreterivelmente no bloco `finally`.
   - **Limitação Arquitetural Documentada:** O lock é mantido na memória do processo Node.js. Ele é 100% suficiente para a arquitetura atual do BuscaVag (instância única monoprocesso no VPS/Docker com SQLite local). Não protege entre múltiplas instâncias ou réplicas horizontais (que exigiriam Redis/lock distribuído se houvesse cluster). Nenhuma infraestrutura externa nova será adicionada prematuramente.

2. **Cooldown Temporal (Post-Process Debounce):**
   - **Problema:** Usuário dá duplo-clique rápido ou reenvia o formulário logo após a análise anterior ser concluída com sucesso (quando o lock em memória já foi liberado no `finally`).
   - **Solução:** Inspeciona `resume.analyzed_at` gravado no SQLite. Se `Date.now() - new Date(resume.analyzed_at).getTime() < 5000` (5 segundos), rejeita com `HTTP 429` (`COOLDOWN_ACTIVE`).

---

## 5. Seleção de Suítes do Runner Unificado (REQ-08)
Suítes incluídas em `scripts/test-runner.ts`:
1. `src/test-phase1.ts` (Core Base DB & Repositório de Vagas)
2. `src/test-phase8.ts` (Kanban Board & Analytics)
3. `src/test-candidate-auth.ts` (Autenticação de Candidatos & Sessão HMAC)
4. `src/test-rbac.ts` (Role-Based Access Control)
5. `src/test-session-isolation.ts` (Isolamento Multi-Tenant & Estado Zero GUEST)
6. `src/test-phase67.ts` (Inbox do Kanban & Regras de Ingestão)
7. `src/test-phase68.ts` (Parser Técnico Agnóstico & Ingestão Multi-Tenant)
8. `src/test-phase69.ts` (Pitch Dinâmico de Abordagem & Anti-Alucinação)
9. `src/test-phase70.ts` (Blindagem de Segurança, Concorrência & Runner)

*Nota de Governança:* Testes que dependem de chamadas externas de rede (`test-telegram.ts`, `test-whatsapp.ts`, `test-scrapers.ts`) ou testes com asserções legadas pré-v18.0 (`test-phase65.ts` com Hermes pré-agnóstico) NÃO são orquestrados no runner automático padrão para preservar o determinismo e a confiabilidade.

---

## 6. Critérios de Aceitação & Comportamentos Testados
1. Em `NODE_ENV=production`, `validateAuthSecretSecurity()` dispara exceção fatal síncrona impedindo a inicialização caso `AUTH_SECRET` seja ausente, seja o segredo default hardcoded ou possua menos de 32 caracteres.
2. Em `NODE_ENV=development` ou `NODE_ENV=test`, a aplicação inicializa normalmente com o fallback default sem exigir `.env`.
3. Requisições concorrentes simultâneas para o mesmo `userId` em `/api/candidate/analyze-cv` retornam `HTTP 429` com código `CONCURRENT_ANALYSIS_BLOCKED`.
4. O lock de concorrência é liberado via `finally` tanto após o sucesso do processamento quanto após falha/exceção.
5. Requisições sequenciais disparadas dentro da janela de 5 segundos após análise concluída retornam `HTTP 429` com código `COOLDOWN_ACTIVE`.
6. O runner `scripts/test-runner.ts` executa todas as suítes em sequência, captura o `exitCode` dos subprocessos e falha com código `1` caso qualquer suíte falhe.
7. O comando `npm test` executa com sucesso total (código `0`) e exibe tabela consolidada de resultados.
8. `npm run build` compila com 0 erros de tipagem TypeScript.
