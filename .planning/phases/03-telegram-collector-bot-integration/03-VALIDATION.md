# Phase 3 Validation Strategy

## Tests
- Testar conector de canais públicos do Telegram (`TelegramScraper`).
- Testar envio de notificação formatada via `TelegramNotifier` (com mock e chave real via env).
- Garantir tratamento de caracteres especiais de HTML em mensagens.

## Commands
```bash
npx tsx src/test-telegram.ts
```
