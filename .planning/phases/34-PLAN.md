# Phase 34 Plan: Quebra da Muralha (Catho, Google Jobs, Remotar via Scrapling)

## Metadata
- **Phase**: 34
- **Milestone**: 9 (Motor Híbrido Scrapling & Blindagem 100% dos Scrapers)
- **Scope**: Desenvolver módulos de raspagem em Python (`scrapling-engine`) para as 3 fontes mais difíceis (Catho, Google Jobs, Remotar), integrá-los à rota `/scrape`, e migrar os respectivos adaptadores TypeScript para usar a `PythonBridgeScraper`.
- **Dependencies**: Phase 33 (Ponte TypeScript ↔ Python)

---

## Objective
Resolver os problemas de bloqueio severo (Cloudflare, reCAPTCHA, seletores ofuscados) nas plataformas Catho, Google Jobs e Remotar. O microserviço Python utilizará a biblioteca `scrapling` (junto com requests otimizados ou headless browser/camoufox se necessário) para extrair os dados e retornar no formato padronizado `Job[]`.

---

## Detailed Task Breakdown

### Task 1: Módulos de Coleta Python (`src/services/scrapling-engine/app/scrapers/`)
- **Arquivo**: `src/services/scrapling-engine/app/scrapers/catho.py`
  - Criar função assíncrona `scrape_catho(query, location, limit)` usando `scrapling` ou `httpx` com stealth headers.
  - O scraping da Catho frequentemente requer contornar o WAF (Cloudflare/Akamai).
- **Arquivo**: `src/services/scrapling-engine/app/scrapers/google_jobs.py`
  - Criar função assíncrona `scrape_google_jobs(query, location, limit)`.
  - Pode envolver fazer requests diretamente para a API não documentada do Google ou fazer parse do DOM complexo.
- **Arquivo**: `src/services/scrapling-engine/app/scrapers/remotar.py`
  - Criar função assíncrona `scrape_remotar(query, location, limit)`.
  - A Remotar carrega dados via JS/API, analisar o Network ou utilizar stealth browser para extrair os cards.

### Task 2: Integração no FastAPI (`src/services/scrapling-engine/app/main.py`)
- **Arquivo**: `src/services/scrapling-engine/app/main.py`
  - Importar as 3 funções criadas no Task 1.
  - No roteador `POST /scrape`, adicionar condicionais:
    - `if source_name == 'catho': jobs = await scrape_catho(...)`
    - `elif source_name == 'google_jobs': jobs = await scrape_google_jobs(...)`
    - `elif source_name == 'remotar': jobs = await scrape_remotar(...)`
  - As funções de scraper devem retornar a lista de instâncias `JobResponseItem`.

### Task 3: Refatoração dos Scrapers TypeScript
- **Arquivo**: `src/scrapers/catho.ts`
  - Apagar a lógica antiga (baseada em cheerio/playwright) e fazer a classe `CathoScraper` estender `PythonBridgeScraper`.
  - Definir `name = 'Catho'` e `pythonSourceName = 'catho'`.
- **Arquivo**: `src/scrapers/googleJobs.ts`
  - Fazer a classe `GoogleJobsScraper` estender `PythonBridgeScraper`.
  - Definir `name = 'GoogleJobs'` e `pythonSourceName = 'google_jobs'`.
- **Arquivo**: `src/scrapers/remotar.ts`
  - Fazer a classe `RemotarScraper` estender `PythonBridgeScraper`.
  - Definir `name = 'Remotar'` e `pythonSourceName = 'remotar'`.

### Task 4: Teste e Validação
- **Arquivo**: `src/test-python-bridge.ts` (ou script similar local)
  - Modificar o script para testar as fontes `catho`, `google_jobs` e `remotar`.
  - Garantir que o payload de resposta obedece ao schema do TypeScript.

---

## Verification Plan

1. Executar `npx tsc --noEmit` para confirmar que a refatoração dos scrapers TypeScript manteve a integridade.
2. Executar localmente o `scrapling-engine` (via `uvicorn` ou `docker`) e disparar testes contra os 3 scrapers novos (Catho, Google Jobs, Remotar) para assegurar que eles não retornam 403 Forbidden ou listas vazias.
