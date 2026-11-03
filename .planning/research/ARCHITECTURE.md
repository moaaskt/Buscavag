# Architecture & Systems Design

## Overview Architecture
```
[ Cron / PM2 / Systemd ]
         │
         ▼
[ CLI Orchestrator / Runner ]
         │
         ├──► [ Scrapers: LinkedIn / Indeed / Gupy / Google Jobs / Telegram ]
         │         │
         │         ▼
         │    [ Raw Vagas ]
         │         │
         │         ▼
         ├──► [ SQLite Filter (Deduplicação & Filtro < 5 dias) ]
         │         │
         │         ▼
         ├──► [ Hermes Agent Evaluator (Classificação IA Jr Fullstack) ]
         │         │
         │         ▼
         └──► [ Telegram Bot Notifier (Alertas formatados) ]
```

## Component Roles
1. **Collector Module**: Scripts modulares por plataforma com interface única `collect(): Promise<RawJob[]>`.
2. **Deduplication Store**: Banco de dados SQLite persistente.
3. **AI Validator**: Interface com Hermes Agent para validação de adequação ao perfil.
4. **Notifier**: Envio via Telegram Bot API (Grammy).
