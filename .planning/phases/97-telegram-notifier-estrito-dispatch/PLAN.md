# Plan: Phase 97 — Telegram Notifier Estrito & Dispatch em Tempo Real (`moacirneto59@gmail.com`)

## Objetivo
Configurar o canal de mensageria do Telegram para operar exclusivamente alinhado ao perfil do usuário `moacirneto59@gmail.com`, aplicando filtro estrito de senioridade Júnior e tecnologias Full Stack/Web, com disparo em tempo real e eliminação total de ruídos operacionais e vagas não-tech.

---

### Task 1: Carregamento do Perfil Alvo & Trava Estrita de Notificação
**Arquivos Envolvidos:**
- `src/services/telegramNotifier.ts`
- `src/services/candidateMatcher.ts`
- `src/db/repository.ts`

**Ações:**
1. Criar helper em `src/services/telegramNotifier.ts` para resolver o `CandidateContext` do usuário `moacirneto59@gmail.com` direto do banco de dados (com fallback em memória caso a query falhe).
2. No método de envio (`sendNotification` / `sendBatchNotifications`), avaliar a vaga com `candidateMatcher.calculateMatch`:
   - Se a vaga for classificada como Pleno, Sênior, Tech Lead, Especialista ou sofrer `isHardBlocked`, abortar o envio para o Telegram.
   - Se o score de Stack for inferior a 60% (pouca ou nenhuma aderência às stacks de TypeScript/Node/React/PHP), abortar o envio.
   - Se a vaga for aprovada (Match Forte/Médio para Júnior), disparar a notificação.
3. Enriquecer o layout da mensagem do Telegram:
   - Exibir `🎯 Match Perfil: {overallScore}%`
   - Exibir `🛠️ Stacks Compatíveis: {matchedSkills}`
   - Exibir `💼 Nível: Júnior`

---

### Task 2: Integração com Pipeline em Tempo Real
**Arquivos Envolvidos:**
- `src/index.ts`
- `src/db/repository.ts`

**Ações:**
1. Atualizar a etapa de notificações do pipeline (`[4/4]` em `src/index.ts`):
   - Integrar a checagem com log explícito: `[TELEGRAM REJEITADO] Vaga fora da stack ou nível divergente` vs `[TELEGRAM DISPARADO] Match Júnior aprovado`.
   - Garantir que vagas avaliadas e não qualificadas sejam marcadas com `notified = 1` no banco para evitar loops de reprocessamento infinito.

---

### Task 3: Verificação & Teste Automatizado
**Arquivos Envolvidos:**
- `src/scripts/test-telegram-filter.ts` (novo)

**Ações:**
1. Criar script de teste que simula 3 cenários de vagas:
   - Cenário A: Vaga "Desenvolvedor Full Stack Júnior (Node.js, React)" -> Deve ser **APROVADA** e notificada.
   - Cenário B: Vaga "Engenheiro de Software Sênior (Java, Spring)" -> Deve ser **BLOQUEADA** (nível/stack).
   - Cenário C: Vaga "Auxiliar de Almoxarifado / Suporte Operacional" -> Deve ser **BLOQUEADA** (não-tech).
2. Executar o teste e validar a filtragem estrita.

