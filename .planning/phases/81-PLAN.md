# Phase 81 Plan: Hub de Mensageria: Telegram & Meta Cloud API WhatsApp (/admin/mensageria)

## Vision & Goal
Implementar o Hub de Mensageria centralizado do BuscaVag em `/admin/mensageria` utilizando o **Design System Velzon Interactive (Themesbrand)**. O sistema consolida o gerenciamento dos canais de notificação Telegram e WhatsApp, adiciona suporte nativo à **Meta Cloud API oficial do WhatsApp** (`graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`), possibilita monitoramento em tempo real da saúde dos conectores, permite envio manual de mensagens de teste e alertas com gerador de Pitch contextualizado, reenvio manual de falhas e auditoria completa na tabela unificada `logs` com a origem `'mensageria'`.

---

## Requirements Addressed

- **`REQ-81-01` (Suporte à Meta Cloud API no WhatsAppService)**:
  - Estender `WhatsAppService` ([src/services/whatsappService.ts](file:///home/moa-dev/projetos/buscavag/src/services/whatsappService.ts)) para suportar o provedor `'meta_cloud'`.
  - Disparo de requisição REST para `https://graph.facebook.com/v18.0/${phoneNumberId}/messages` com cabeçalho `Authorization: Bearer ${token}`.
  - Gravação automática de disparos na tabela `logs` com `origem = 'mensageria'` e `metadata.canal = 'whatsapp'`.

- **`REQ-81-02` (Sub-aba & Recursos do Telegram)**:
  - Exibição de status do bot Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`).
  - Formatação HTML de alertas com preview ao vivo e sem vazamento de dados de privacidade (`resumeTips`).
  - Disparo manual de teste/alerta com throttling de 800ms anti-ETIMEDOUT.

- **`REQ-81-03` (Sub-aba & Recursos do WhatsApp)**:
  - Exibição de status de múltiplos provedores (Meta Cloud API, Evolution, Webhook, Mock).
  - Gerador de Pitch / Carta de Apresentação contextualizado para o candidato.
  - Formatação em markdown nativo do WhatsApp (`*bold*`, `_italic_`).

- **`REQ-81-04` (Repositório Administrativo de Mensageria - AdminMessagingRepository)**:
  - `getMessagingStats()`: Cálculo em tempo real de mensagens enviadas, volume por canal, falhas e taxa de sucesso.
  - `getMessagingLogs(params)`: Paginação e filtros por canal (`telegram`, `whatsapp`), status e busca textual.
  - `resendFailedMessage(logId, adminUser)`: Reenvio de mensagens que falharam com auditoria via `logAdminAction`.

- **`REQ-81-05` (Endpoints REST Administrativos)**:
  - `GET /api/admin/mensageria`: Listagem paginada de logs e estatísticas.
  - `POST /api/admin/mensageria/test`: Disparo manual de mensagem de teste (Telegram ou WhatsApp).
  - `POST /api/admin/mensageria/resend`: Reenvio manual de falhas.

- **`REQ-81-06` (Interface Velzon Interactive `/admin/mensageria`)**:
  - 4 `VelzonStatWidget` (Total Enviado, Alertas Telegram, Notificações WhatsApp, Falhas de Envio).
  - 3 Abas Velzon: **Canal Telegram**, **Canal WhatsApp (Meta Cloud API)** e **Histórico de Logs de Mensageria**.
  - Tabela Velzon de logs com badges soft-tint por canal e status.
  - Modais Velzon: Envio Manual de Teste, Inspeção de Logs e Preview de Templates/Pitches.

- **`REQ-81-07` (Suíte de Testes Automatizada)**:
  - Criar `src/test-phase81.ts` com 10 testes determinísticos cobrindo todos os requisitos.

---

## Proposed Changes

### Component 1: Serviço de WhatsApp & Meta Cloud API

#### [MODIFY] [src/services/whatsappService.ts](file:///home/moa-dev/projetos/buscavag/src/services/whatsappService.ts)
- Adicionar provedor `'meta_cloud'` em `WhatsAppProvider`.
- Implementar leitura de `META_PHONE_NUMBER_ID` e `META_WHATSAPP_TOKEN` ou `WHATSAPP_API_KEY`.
- Implementar envio REST para Meta Cloud API em `sendMetaCloudMessage`.
- Integrar gravação em `logs` com `origem = 'mensageria'` para disparos efetuados.

---

### Component 2: Repositório Administrativo de Mensageria

#### [NEW] `src/db/adminMessagingRepository.ts`
- Implementar classe `AdminMessagingRepository` com:
  - `getMessagingStats()`
  - `getMessagingLogs(params)`
  - `resendFailedMessage(logId, adminUser)`

---

### Component 3: Endpoints REST Administrativos

#### [NEW] `src/app/api/admin/mensageria/route.ts`
- `GET`: Listagem paginada de logs e estatísticas.

#### [NEW] `src/app/api/admin/mensageria/test/route.ts`
- `POST`: Disparo de mensagem de teste para Telegram ou WhatsApp.

#### [NEW] `src/app/api/admin/mensageria/resend/route.ts`
- `POST`: Reenvio manual de mensagens de falha.

---

### Component 4: Interface Velzon Interactive (/admin/mensageria)

#### [NEW] `src/app/admin/mensageria/page.tsx`
- Dashboard Velzon com 4 `VelzonStatWidget`.
- 3 Abas Velzon: Canal Telegram, Canal WhatsApp e Histórico de Logs.
- Visualizadores de status, gerador de Pitch com IA, editor de templates e tabela com badges soft-tint.
- Modais Velzon de Disparo Manual, Detalhes de Payload e Preview.

---

### Component 5: Suíte de Testes Automatizada

#### [NEW] `src/test-phase81.ts`
- Suíte completa com 10 testes determinísticos cobrindo todos os aspectos da fase.

---

## Verification Plan

### Automated Tests
```bash
npx tsx src/test-phase81.ts
npx tsx src/test-phase80.ts
npx tsx src/test-phase79.ts
npx tsx src/test-phase78.ts
npx tsx src/test-phase77.ts
npx tsx src/test-phase76.ts
npm test
npx tsc --noEmit
npm run build:next
```

### Manual Verification
- Acessar `/admin/mensageria` com sessão administrativa.
- Verificar status de conexão do Telegram e WhatsApp.
- Testar a alternância entre as abas Telegram, WhatsApp e Histórico.
- Testar a geração de Pitch de candidatura.
- Testar o disparo de mensagem de teste em Mock Mode.
- Verificar a gravação de logs na aba de Histórico.
