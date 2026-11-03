# Phase 6 Plan: New Scrapers Expansion

## Goal
Expandir o ecossistema de coleta de vagas do Buscavag adicionando 4 novos conectores robustos e resilientes: **Programathor**, **Remotar**, **Catho** e **Glassdoor**. Integrar os coletores ao orquestrador geral mantendo tolerância a falhas, alertas automáticos no Telegram e normalização padronizada (`RawJob`).

---

## Tasks

### Task 1: Extend Platform Sources & Types
- Atualizar `PlatformSource` em `src/types/job.ts` adicionando `PROGRAMATHOR`, `REMOTAR`, `CATHO` e `GLASSDOOR`.
- Garantir que o schema Zod e o banco SQLite aceitem as novas fontes sem regressão.

### Task 2: Programathor Scraper Implementation
- Criar `src/scrapers/programathor.ts` implementando `JobScraper`.
- Estratégia: HTTP/HTML parser direto com fallback Playwright.
- Buscar vagas de tecnologia com filtro Júnior / Geral recente (máx 5 dias).
- Normalizar dados para `RawJob`.

### Task 3: Remotar Scraper Implementation
- Criar `src/scrapers/remotar.ts` implementando `JobScraper`.
- Estratégia: Requisições de feed/API ou Playwright stealth.
- Coleta de oportunidades 100% remotas voltadas a desenvolvimento/TI.
- Normalizar dados para `RawJob`.

### Task 4: Catho Scraper Implementation
- Criar `src/scrapers/catho.ts` implementando `JobScraper`.
- Estratégia: Playwright com `createStealthContext()`.
- Capturar listagens de "Desenvolvedor Júnior / Full Stack", ignorando vagas patrocinadas duplicadas e tratando paginação básica.
- Normalizar dados para `RawJob`.

### Task 5: Glassdoor Scraper Implementation
- Criar `src/scrapers/glassdoor.ts` implementando `JobScraper`.
- Estratégia: Playwright stealth com tratamento para fechamento de modais/popups de login.
- Normalizar dados para `RawJob`.

### Task 6: Orchestration & Test Integration
- Registrar os 4 novos scrapers no `ScraperOrchestrator` (`src/scrapers/index.ts`).
- Criar script de teste isolado `src/test-phase6.ts` para testar os 4 conectores independentemente e em lote.
- Validar a execução no pipeline principal `src/index.ts`.

---

## Verification & Acceptance Criteria
1. **Compilação**: `npm run build` deve compilar com 0 erros de TypeScript.
2. **Execução Isolada**: `npx tsx src/test-phase6.ts` deve executar cada um dos 4 novos scrapers, retornando objetos `RawJob` válidos ou tratando graciosamente bloqueios de rede/anti-bot.
3. **Resiliência do Orquestrador**: Se qualquer conector falhar, o erro deve ser isolado com alerta no Telegram sem interromper a coleta dos demais.
4. **Pipeline E2E**: O pipeline completo `npm start` deve rodar todos os scrapers antigos e novos harmonicamente.
