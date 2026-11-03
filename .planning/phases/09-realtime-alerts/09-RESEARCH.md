# Phase 9: Real-time Alerts, Monitoring & Deployment Hardening - Research

## 1. Monitoramento Proativo (Telegram)
- Atualmente o orquestrador (`src/scrapers/index.ts`) já captura falhas individuais de scrapers e invoca `this.notifier.sendAlert(alertText)`.
- **Gap Encontrado:** Em `src/index.ts`, a função principal `runPipeline()` roda e sai, e se houver um erro crítico (ex: falha de banco), ele apenas loga no console (`[ERRO CRÍTICO NO PIPELINE]`). Precisamos alterar o `catch` global para também enviar o alerta via `TelegramNotifier`.
- Precisamos garantir que `src/index.ts` exporte a função `runPipeline` em vez de auto-executá-la cegamente, ou mover a lógica para um `src/pipeline.ts` que será invocado tanto manualmente quanto pelo novo arquivo Cron.

## 2. Orquestração e Agendamento (Cron)
- Adicionaremos `node-cron` (`npm install node-cron`).
- Novo script `src/cron.ts`: Vai inicializar o `node-cron` rodando a cada 4 horas (e.g., `0 */4 * * *`) invocando `runPipeline()`.
- O processo do scraper não será mais um job que morre, mas um servidor Node rodando o Cron ininterruptamente.

## 3. Dockerização (Docker Compose)
Para deploy, precisamos separar o Frontend (Next.js) do Backend (Node.js Playwright/Cron).

**Dockerfile.web (Frontend Dashboard)**:
- Usa imagem Node base (ex: `node:20-alpine`).
- Roda `npm run build:next`.
- Expõe a porta 3000.

**Dockerfile.scraper (Backend Scrapers/Cron)**:
- Os scrapers (LinkedIn, Gupy, Catho, Glassdoor) dependem do Playwright.
- Precisamos de uma imagem que tenha as dependências de sistema do navegador. Podemos usar a imagem oficial do Playwright ou instalar via `npx playwright install --with-deps chromium`.
- Roda o script `npm run start:cron`.

**docker-compose.yml**:
- Serviço `web` (porta 3000).
- Serviço `scraper` (sem portas, apenas roda em background).
- Volume compartilhado: `./data:/app/data` para o arquivo `buscavag.db` ser persistido e lido por ambos os containers de forma síncrona.
- Variável de ambiente `DATABASE_PATH=/app/data/buscavag.db`.
