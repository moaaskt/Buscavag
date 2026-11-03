# Phase 30 Plan: Módulo Freelance (99Freelas com Trava 48h)

## Metadata
- **Phase**: 30
- **Milestone**: 8
- **Scope**: Conector 99Freelas, filtro estrito por stacks do Moacir Neto, trava estrita de 48 horas e categorização como `Freelance`.
- **Dependencies**: Phase 29

---

## Objective
Desenvolver e integrar o conector para a plataforma **99Freelas** (`https://www.99freelas.com.br/projects`) com:
1. **Filtro de Stacks em Ingestão**: Coletar apenas projetos cujos títulos ou descrições façam match com as tecnologias do perfil (React, Next.js, Node.js, JavaScript, TypeScript, Python, IoT, ESP32, MQTT, Home Assistant, PHP, Docker, APIs REST, etc.).
2. **Trava Temporal de 48 Horas**: Descartar imediatamente no scraper qualquer oportunidade publicada há mais de 2 dias (48h).
3. **Categorização Freelance**: Marcar a categoria dos projetos como `Freelance` e cadastrar `PlatformSource.FREELAS99`.
4. **Registro no ScraperOrchestrator e UI**: Adicionar nos seletores de plataforma do Explorador de Vagas e Dashboard.

---

## Detailed Task Breakdown

### Task 1: Atualização dos Tipos (`job.ts`)
- **Arquivo**: `src/types/job.ts`
- **Ações**:
  - Adicionar `FREELAS99 = '99freelas'` no enum `PlatformSource`.

### Task 2: Criação do Adaptador `99FreelasScraper` (`99freelas.ts`)
- **Arquivo**: `src/scrapers/99freelas.ts`
- **Ações**:
  - URL base: `https://www.99freelas.com.br/projects?categoria=web-mobile-e-software` (ou busca direta por termos tech).
  - Estrutura de raspagem:
    - Usar `fetchHtml` com User-Agent e headers adequados.
    - Fazer parsing via `cheerio` dos seletores de projetos (`.result-item`, `.projeto-item`, `h1.title a`, `.data`, `.descricao`).
  - **Filtro Estrito de Stack**:
    - Verificar palavras-chave tech (react, next, node, ts, js, typescript, javascript, python, php, iot, esp32, mqtt, automação, rest, web, front, backend).
    - Descartar se for design puramente gráfico, marketing, SEO ou artigos/redação sem código.
  - **Trava de 48 Horas**:
    - Usar `parseRelativeDate` na data do projeto.
    - Chamar `isOlderThanDays(publishedAt, 2)`. Se verdadeiro (> 48h), descartar imediatamente.
  - Formatar objeto `RawJob` com:
    - `platform: PlatformSource.FREELAS99`
    - `location: 'Remoto (Freelance)'`
    - `description: `${title} - Projeto Freelancer: ${snippet}``

### Task 3: Integração no `ScraperOrchestrator` e Filtros da UI
- **Arquivos**:
  - `src/scrapers/index.ts`: Importar e registrar `new Freelas99Scraper()` na lista de scrapers do orquestrador.
  - `src/app/jobs/page.tsx`: Adicionar `99freelas` no `<select value={platform}>` sob optgroup "Freelance & Projetos" ou "Principais".
  - `src/components/Navbar.tsx`: Atualizar contador de fontes ou badges se aplicável.

---

## Verification Plan
1. **TypeScript Typecheck**: Executar `npx tsc --noEmit` para validar tipagens.
2. **Teste de Execução do Scraper**: Executar script de teste standalone invocando `Freelas99Scraper.scrape()` e checar:
   - Extração correta de projetos.
   - Rejeição de projetos sem stack tech.
   - Aplicação da trava de 48h.
3. **Validação no Banco**: Checar se inserções com `PlatformSource.FREELAS99` persistem e exibem no `/jobs`.
