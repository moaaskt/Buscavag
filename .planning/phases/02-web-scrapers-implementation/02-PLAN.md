# Phase 2 Plan: Web Scrapers Implementation

## Goal
Implementar os conectores de scraping autônomo em TypeScript com Playwright para LinkedIn, Gupy, Indeed e Google Jobs, aplicando a filtragem temporal de 5 dias e normalização de dados.

## Tasks

### Task 1: Scraper Base Interface & Playwright Setup
- Instalar `playwright` e dependências.
- Criar `src/scrapers/base.ts` contendo a interface `JobScraper` e ajudantes de navegação segura (User-Agent, stealth context).

### Task 2: Gupy Scraper
- Criar `src/scrapers/gupy.ts` para buscar vagas de Full Stack Jr via API/portal da Gupy.
- Filtrar vagas com mais de 5 dias de publicação.

### Task 3: LinkedIn Scraper
- Criar `src/scrapers/linkedin.ts` utilizando Playwright em navegação headless pública de busca por vagas Jr.
- Extrair detalhes (título, empresa, link, data).

### Task 4: Indeed & Google Jobs Scraper
- Criar `src/scrapers/indeed.ts` e `src/scrapers/googleJobs.ts`.
- Garantir fallback e manipulação graciosa de erros em caso de bloqueio.

### Task 5: Scraper Orchestrator & Integration Test
- Criar `src/scrapers/index.ts` unificando a chamada de todos os scrapers habilitados.
- Criar `src/test-scrapers.ts` para testar e exibir os resultados dos scrapers em ambiente local.

## Verification
- Compilar sem erros (`tsc --noEmit`).
- Executar `npx tsx src/test-scrapers.ts` e verificar a extração real ou estruturada de vagas.
