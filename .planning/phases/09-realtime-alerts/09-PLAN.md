# Phase 9 Plan: Real-time Alerts, Monitoring & Deployment Hardening

## Goal
Implementar resiliência com alertas proativos de falha e configurar o deploy containerizado com orquestração independente (Cron interno e separação de serviços Frontend/Scraper no Docker).

---

## Tasks

### Task 1: Refatoração do Orquestrador e Alertas de Falha Global
- Editar `src/index.ts`: Exportar a função assíncrona `runPipeline()`.
- Modificar o block `catch` global do pipeline para invocar `TelegramNotifier.sendAlert()` antes de falhar silenciosamente.
- Garantir que a falha em um conector no `ScraperOrchestrator` continua isolada e envia alertas no Telegram sem parar a avaliação das demais vagas.

### Task 2: Implementação do Node-Cron (Agendamento Ininterrupto)
- Instalar dependências: `npm install node-cron` e `npm install -D @types/node-cron`.
- Criar script `src/cron.ts`:
  - Configurar um cronjob rodando a cada 4 horas (e.g. `0 */4 * * *`).
  - No start da aplicação, acionar a 1ª rodada imediatamente e então registrar o cron.
  - Adicionar novo script no `package.json`: `"start:cron": "tsx src/cron.ts"`.

### Task 3: Dockerfile Frontend (Web Dashboard)
- Criar `Dockerfile.web`:
  - Base `node:20-alpine`.
  - Instalar dependências e executar `npm run build:next`.
  - Expor a porta 3000 e usar o comando `npm run start:next`.

### Task 4: Dockerfile Backend (Scraper + Cron)
- Criar `Dockerfile.scraper`:
  - Usar base image que suporte Playwright (ex: `mcr.microsoft.com/playwright:v1.42.0-jammy` ou Node base rodando `npx playwright install --with-deps chromium`).
  - Instalar dependências.
  - O comando final será `npm run start:cron` (rodando em background contínuo).

### Task 5: Docker Compose & Volumes (Orquestração)
- Criar `docker-compose.yml`:
  - Serviço `web` buildando `Dockerfile.web` e publicando porta 3000.
  - Serviço `scraper` buildando `Dockerfile.scraper`.
  - Configurar um volume compartilhado (e.g., `./data:/app/data`) para ambos.
  - Passar a variável `DATABASE_PATH=/app/data/buscavag.db` via env/compose para ambos os containers.

### Task 6: Documentação de Deploy e Verificação
- Escrever `09-VERIFICATION.md`.
- Escrever uma documentação simples de como inicializar o Docker (`DEPLOY.md`).

---

## Verification & Acceptance Criteria
1. O Telegram deve receber notificações `⚠️ [ALERTA DE SISTEMA]` se simularmos um erro no `runPipeline()`.
2. O script `src/cron.ts` deve iniciar com sucesso e registrar o job.
3. O `docker-compose build` deve passar para ambos os serviços sem erros de Playwright ou Next.js.
