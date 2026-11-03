# Phase 6: New Scrapers Expansion - Context & Decisions

## Context
O Buscavag v1.0 foi concluído com sucesso e conta com suporte inicial para Gupy, LinkedIn, Indeed, Google Jobs e canais do Telegram.
Esta Fase 6 marca o início do **Milestone 2.0 (Full Platform Evolution)**, focando em expandir significativamente a captação de oportunidades em portais de alta relevância para o mercado de tecnologia no Brasil e trabalho remoto.

---

## Fontes Selecionadas
1. **Programathor**: Portal nacional 100% voltado para área tech / desenvolvedores (tags de stack, senioridade).
2. **Remotar**: Portal especializado em vagas 100% remotas no Brasil e exterior (amigável a busca por tags de tecnologia).
3. **Catho**: Plataforma brasileira com grande volume de vagas corporativas tradicionais.
4. **Glassdoor**: Portal com forte presença de avaliações, salários e vagas para tecnologia.

---

## Decisões Técnicas

### 1. Estratégia de Coleta (Dual Approach)
- **Primeira tentativa (Lightweight / HTTP / RSS / API Pública)**: Para plataformas com APIs abertas ou feeds públicos (ex: Programathor/Remotar com rotas JSON ou RSS), utilizar chamadas HTTP diretas via `axios` ou requisições JSON.
- **Segunda tentativa / Fallback (Playwright Headless)**: Para portais com Cloudflare, dynamic hydration ou proteção anti-bot (como Catho ou Glassdoor), utilizar Playwright com emulação de User-Agent realista e tratamento de paginação.

### 2. Padrão Arquitetural
- Implementar cada coletor estendendo a interface `JobScraper` em `src/scrapers/base.ts`:
  - `ProgramathorScraper` em `src/scrapers/programathor.ts`
  - `RemotarScraper` em `src/scrapers/remotar.ts`
  - `CathoScraper` em `src/scrapers/catho.ts`
  - `GlassdoorScraper` em `src/scrapers/glassdoor.ts`
- Registrar todos os scrapers no `ScraperOrchestrator` (`src/scrapers/index.ts`).
- Manter resiliência: o isolamento de falha (try/catch + notificação de alerta no Telegram) deve continuar ativo para cada novo scraper, garantindo que o erro de uma plataforma não interrompa as demais.

### 3. Normalização de Dados
- Formatar para `RawJob`:
  - `id`: Gerado via hashing consistente (`createJobHash`).
  - `title`: Título limpo e trimado da vaga.
  - `company`: Nome da empresa normalizado.
  - `location`: Cidade/UF ou "Remoto".
  - `url`: Link canônico da vaga para candidatura direta.
  - `publishedAt`: Data de publicação convertida via `parseRelativeDate`.
  - `source`: `"programathor"`, `"remotar"`, `"catho"`, `"glassdoor"`.

---

## Critérios de Sucesso da Fase 6
- [ ] Implementação de `ProgramathorScraper`, `RemotarScraper`, `CathoScraper` e `GlassdoorScraper`.
- [ ] Testes unitários/de integração individuais para cada scraper confirmando retorno de vagas no formato `RawJob`.
- [ ] Integração no `ScraperOrchestrator` com tratamento e logging adequado.
- [ ] Pipeline principal (`buscavag run` / `src/index.ts`) executando os novos scrapers de ponta a ponta.
