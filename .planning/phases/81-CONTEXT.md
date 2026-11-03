# Phase 81 Context — Hub de Mensageria: Telegram & Meta Cloud API WhatsApp (/admin/mensageria)

## Contexto e Objetivo
O BuscaVag se comunica com candidatos e administradores via mensagens automatizadas de alertas de vagas, pitches de candidatura e notificações do sistema. Para centralizar o gerenciamento, monitoramento, envio manual e suporte a múltiplos canais de comunicação, a **Phase 81** entrega:
1. **Central de Mensageria em `/admin/mensageria`**: Desenvolvida sob o **Design System Velzon Interactive (Themesbrand)**, com 4 `VelzonStatWidget` analíticos (Total EnVIADO, Telegram, WhatsApp Meta/Evolution e Taxa de Sucesso/Falhas), e 3 abas principais: **Canal Telegram**, **Canal WhatsApp (Meta Cloud API)** e **Histórico de Logs de Mensageria**.
2. **Sub-aba Telegram**:
   - Diagnóstico do bot Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` ou Mock Mode).
   - Formatação HTML de alertas com preview ao vivo e sem vazamento de dados de privacidade.
   - Ferramenta de disparo manual de testes ou alertas de sistema com throttling de 800ms anti-ETIMEDOUT.
3. **Sub-aba WhatsApp (Meta Cloud API & Integrados)**:
   - Suporte oficial à **Meta Cloud API** (`graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`) no `WhatsAppService`, mantendo compatibilidade com Evolution API, Webhook e Mock.
   - Diagnóstico de saúde das credenciais da Meta (`PHONE_NUMBER_ID`, `META_WHATSAPP_TOKEN`).
   - Gerador de Pitch / Carta de Apresentação contextualizado para o candidato.
   - Ferramenta de disparo manual de mensagens de teste com markdown nativo do WhatsApp.
4. **Histórico Unificado de Mensageria & Auditoria**:
   - `AdminMessagingRepository` consultando a tabela `logs` com `origem = 'mensageria'`.
   - Reenvio manual de falhas com registro em `logAdminAction`.
   - Modais Velzon de Envio Manual, Inspeção de Payload e Preview de Templates.

---

## Decisões Arquiteturais e de Implementação (Locked Decisions)

### 1. Extensão do WhatsAppService (`src/services/whatsappService.ts`)
- Suporte ao provedor `'meta_cloud'`:
  - `WhatsAppProvider = 'meta_cloud' | 'evolution' | 'webhook' | 'mock'`
  - Variáveis de ambiente: `META_PHONE_NUMBER_ID`, `META_WHATSAPP_TOKEN` / `WHATSAPP_API_KEY`.
  - Método `sendMetaCloudMessage(recipient, text)`:
    - POST para `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`
    - Header: `Authorization: Bearer ${token}`, `Content-Type: application/json`
    - Body:
      ```json
      {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": "5511999999999",
        "type": "text",
        "text": { "preview_url": false, "body": "..." }
      }
      ```
  - Gravação automática do disparo na tabela `logs` com `origem = 'mensageria'`, `tipo = 'mensageria'`, `nivel = 'info'` / `'error'` e `metadata.canal = 'whatsapp'`.

### 2. Repositório Administrativo de Mensageria (`src/db/adminMessagingRepository.ts`)
- `getMessagingStats()`:
  - Consolida Total de Mensagens, Total Telegram, Total WhatsApp, Falhas e Taxa de Sucesso.
- `getMessagingLogs(params)`:
  - Paginação, filtro por canal (`telegram`, `whatsapp`, `all`), nível (`info`, `error`, `all`) e busca por texto.
- `resendFailedMessage(logId, adminUser)`:
  - Re-executa o envio da mensagem associada ao log de falha e insere novo registro de log com referência no metadata e auditoria em `logAdminAction`.

### 3. Endpoints REST Administrativos
- `GET /api/admin/mensageria`: Listagem paginada de logs de mensageria e estatísticas de envio.
- `POST /api/admin/mensageria/test`: Endpoint para disparo manual de mensagens de teste (Telegram ou WhatsApp Meta/Evolution).
- `POST /api/admin/mensageria/resend`: Reenvio manual de mensagens com falha.

### 4. Interface Velzon Interactive (`/admin/mensageria`)
- **4 StatWidgets**:
  1. Total de Mensagens Disparadas (primária).
  2. Alertas Telegram (info / sky).
  3. Notificações WhatsApp Meta/Evolution (sucesso / esmeralda).
  4. Falhas de Envio (perigo / rosa).
- **3 Abas Velzon**:
  - **Aba Telegram**: Status do Bot, Formatação com tags HTML, Preview de Template e botão de Alerta Manual.
  - **Aba WhatsApp**: Status da Meta Cloud API / Evolution, Gerador de Pitch de Apresentação e Disparo de Teste.
  - **Aba Histórico de Logs**: Tabela Velzon de logs com badges soft-tint por canal e status, e ação de Reenviar.
- **3 Modais Velzon**:
  1. *Modal de Disparo Manual de Mensagem*.
  2. *Modal de Inspeção de Payload / Detalhes do Log*.
  3. *Modal de Preview de Pitch / Template*.

---

## Verificação e Suíte de Testes da Fase (`src/test-phase81.ts`)
1. **T01**: Diagnóstico de status do `TelegramNotifier` e `WhatsAppService` (incluindo `meta_cloud`).
2. **T02**: Formatação HTML de alertas do Telegram sem vazamento de `resumeTips` por privacidade.
3. **T03**: Envio e formatação de alertas de sistema no `TelegramNotifier`.
4. **T04**: Formatação de mensagem do WhatsApp em markdown nativo (`*bold*`, `_italic_`).
5. **T05**: Geração de Pitch / Carta de Apresentação contextualizada com IA no `WhatsAppService`.
6. **T06**: Suporte ao provedor `meta_cloud` no `WhatsAppService` em Mock Mode ou real.
7. **T07**: Ingestão e persistência de disparos de mensageria na tabela `logs` com `origem = 'mensageria'` e `metadata.canal`.
8. **T08**: Consulta paginada em `AdminMessagingRepository.getMessagingLogs`.
9. **T09**: Reenvio manual de mensagem com falha via `resendFailedMessage`.
10. **T10**: Consolidação de estatísticas de mensagens em `AdminMessagingRepository.getMessagingStats`.
