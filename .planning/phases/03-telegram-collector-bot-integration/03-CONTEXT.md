# Phase 3: Telegram Collector & Bot Integration - Context & Decisions

## Context
Desenvolvimento da integração com o Telegram em duas frentes:
1. **Telegram Collector**: Coletar mensagens de vagas em canais/grupos públicos de TI do Telegram.
2. **Telegram Bot Notifier**: Enviar alertas formatados com resumos das vagas aprovadas para o chat ou canal configurado pelo usuário.

## Design Decisions
1. **Biblioteca do Bot Notificador**: `grammy` (framework leve, moderno e forte com TypeScript).
2. **Telegram Groups Collector**: Leitura via scraping de canais públicos do Telegram (`https://t.me/s/{channel_name}`) ou GramJS/Telethon para parsing de texto simples das mensagens recentes.
3. **Formatação das Notificações**:
   - Usar formato HTML/Markdown do Telegram.
   - Incluir título, empresa, plataforma (ex: 📢 TELEGRAM / LINKEDIN), tags e link direto.
   - Throttling de 500ms entre mensagens enviadas para evitar rate limit (HTTP 429).
