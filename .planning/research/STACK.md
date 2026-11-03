# Stack Architecture & Recommendations

## Core Stack
- **Runtime**: Node.js v20 LTS + TypeScript
- **Web Scraping / Automation**: Playwright (suporte resiliente a navegação headless e seleção por DOM/APIs dinâmicas)
- **Telegram Collector**: GramJS ou Telethon via bridge para monitorar grupos de vagas no Telegram
- **Telegram Notification Bot**: Grammy framework (`grammy`) para o bot receptor/enviador de alertas
- **IA / Curadoria**: Hermes Agent SDK / OpenAI-compatible API para filtro semântico de descrição de vagas
- **Database / Deduplicação**: SQLite via `better-sqlite3` ou `Kysely` / `Drizzle ORM`
- **Orquestração na VPS**: Cron / Systemd / PM2

## What NOT to use
- Puppeteer (Playwright possui suporte nativo melhor a múltiplos seletores e contexto isolado)
- Axios puro para vagas dinâmicas (Muitas plataformas como Gupy e LinkedIn usam renderização client-side de componentes dinâmicos)
