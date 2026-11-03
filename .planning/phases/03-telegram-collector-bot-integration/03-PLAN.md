# Phase 3 Plan: Telegram Collector & Bot Integration

## Goal
Implementar o scraper de canais públicos do Telegram e o serviço de envio de notificações formatadas via Telegram Bot com `grammy`.

## Tasks

### Task 1: Telegram Channels Scraper
- Criar `src/scrapers/telegram.ts` estendendo `JobScraper`.
- Monitorar canais de vagas do Telegram via web preview (`t.me/s/...`).
- Extrair texto da mensagem, data e gerar link direto da postagem no Telegram.

### Task 2: Telegram Bot Notifier Service
- Instalar `grammy`.
- Criar `src/services/telegramNotifier.ts` para envio de mensagens formatadas em HTML.
- Implementar formatação rica (`formatJobMessage(job)`) com título, empresa, badges e botões/links.
- Adicionar fila com delay (throttling) para prevenção de limite de taxa.

### Task 3: Integration Test & Mock Capabilities
- Criar `src/test-telegram.ts` testando tanto a coleta de mensagens do Telegram quanto a formatação/envio de notificações.

## Verification
- Validar a compilação com `tsc --noEmit`.
- Executar `npx tsx src/test-telegram.ts` e validar extração e formatação de alertas.
