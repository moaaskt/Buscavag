# Plan — Phase 52: Engine de Notificações WhatsApp (Webhook Genérico / Evolution API)

## Context & Objectives
Atualmente, o Buscavag conta apenas com notificações via Telegram. O objetivo da Fase 52 é implementar um conector de mensageria móvel desacoplado em `src/services/whatsappService.ts`, compatível tanto com **Evolution API** quanto com **Webhooks HTTP genéricos**.
O serviço será capaz de gerar alertas estruturados para vagas com pontuação de Match IA >= 80%, sintetizar cartas de apresentação (Cover Letters) personalizadas prontas para envio, fornecer modo Mock transparente para desenvolvimento e integrar-se com a interface de visualização de vagas.

## Inputs & Dependencies
- `src/services/telegramNotifier.ts` (padrão de serviço de notificações)
- `src/types/job.ts` (definição de `ProcessedJob` e `RawJob`)
- `src/db/repository.ts` (consulta de vagas)
- `src/components/JobModal.tsx` (modal de detalhes com ações para o candidato)
- `.env.example`

---

## Tasks

### Task 1: Criação do Serviço de Mensageria `src/services/whatsappService.ts`
1. Criar classe `WhatsAppService` com leitura de variáveis de ambiente:
   - `WHATSAPP_PROVIDER`: `'evolution' | 'webhook' | 'mock'` (fallback automático para `mock` se credenciais ausentes).
   - `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_INSTANCE`, `WHATSAPP_DEFAULT_RECIPIENT`, `WHATSAPP_MIN_SCORE` (default 80).
2. Implementar formatador `formatJobAlert(job, coverLetterSnippet)` com Markdown do WhatsApp (`*negrito*`, `_itálico_`, `> citação` e emojis).
3. Implementar gerador `generateCoverLetter(job, candidateName)` com pitch profissional personalizado para abordagem a recrutadores.
4. Implementar método de envio `sendJobNotification(job, recipientPhone, includeCoverLetter)` e envio direto `sendMessage(recipientPhone, text)`.
5. Suportar endpoints da Evolution API (`POST /message/sendText/${instance}`) com header `apikey` e Webhook genérico (`POST ${url}`).

### Task 2: Endpoint de API `src/app/api/notifications/whatsapp/route.ts`
1. `GET`: Retorna status da configuração (provedor ativo, configurado: boolean, score mínimo, destinatário padrão mascarado).
2. `POST`: Permite:
   - Enviar mensagem de teste (`type: 'test'`).
   - Disparar notificação de vaga específica (`type: 'job'`, `jobId`).
   - Obter prévia/geração de carta de apresentação (`type: 'preview-cover-letter'`, `jobId`).

### Task 3: Ação no Modal de Vagas (`src/components/JobModal.tsx`)
1. Adicionar botão com ícone `<MessageSquare />` permitindo:
   - Copiar a carta de apresentação com feedback toast / tooltip.
   - Abrir o WhatsApp Web diretamente (`https://wa.me/?text=...`) com a mensagem pré-formatada.

### Task 4: Script de Teste Automatizado e `.env.example`
1. Criar `src/test-whatsapp.ts` validando formatação de alertas, geração de cartas e disparo no modo mock.
2. Adicionar script `"test:whatsapp": "tsx src/test-whatsapp.ts"` em `package.json`.
3. Documentar variáveis no `.env.example`.

### Task 5: Validação Técnica e Build
1. Executar `npm run test:whatsapp` para verificar integridade da engine.
2. Executar `npm run build` (`tsc`) e `npm run build:next` (Turbopack).

---

## Verification Criteria
- [ ] `whatsappService.ts` formata corretamente mensagens com Markdown do WhatsApp.
- [ ] O serviço opera em modo Mock sem falhar quando variáveis não estão configuradas.
- [ ] Disparos para Evolution API e Webhook HTTP enviam payloads válidos com headers adequados.
- [ ] O endpoint `/api/notifications/whatsapp` responde a consultas GET e acionamentos POST.
- [ ] O modal de vagas disponibiliza botão de compartilhamento/cópia de carta no WhatsApp.
- [ ] `npm run build` e `npm run build:next` compilam com 100% de sucesso.
