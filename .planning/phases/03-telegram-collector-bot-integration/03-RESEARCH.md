# Phase 3 Research: Telegram APIs & Scraping

## Telegram Notifier Bot (Grammy)
- Instalar `grammy`.
- Inicialização via `new Bot(process.env.TELEGRAM_BOT_TOKEN)`.
- Método principal `bot.api.sendMessage(chatId, text, { parse_mode: 'HTML' })`.

## Telegram Channel Collector
- Web Preview de Canais Públicos do Telegram: `https://t.me/s/{channel_username}`.
- Permite extrair mensagens recentes de canais de vagas (ex: `@vagasdev`, `@vagasfront`, `@backendvagas`) sem precisar de sessão de usuário MTProto complexa.
- Leitura simples via Playwright / Axios + Cheerio.
