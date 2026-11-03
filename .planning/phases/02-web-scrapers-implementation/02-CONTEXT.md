# Phase 2: Web Scrapers Implementation - Context & Decisions

## Context
Desenvolvimento dos coletores autônomos de vagas para LinkedIn, Gupy, Indeed e Google Jobs utilizando Playwright em Node.js com TypeScript.

## Design Decisions
1. **Interface Base do Scraper**:
   - Cada coletor deve implementar a interface `JobScraper` com o método `scrape(): Promise<RawJob[]>`.
2. **Estratégia Playwright**:
   - Instalar `playwright` (e browsers Chromium headless).
   - Utilizar técnicas para evasão básica de anti-bot (User-Agent real, desativar webdriver flag).
3. **Resiliência e Tratamento de Erros**:
   - Falhas individuais em um scraper (ex: timeout no Indeed) não devem quebrar a coleta de outros scrapers.
   - Cada scraper retornará um array de vagas encontradas ou array vazio com log de erro apropriado.
