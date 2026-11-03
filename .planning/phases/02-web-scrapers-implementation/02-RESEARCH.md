# Phase 2 Research: Web Scraping Strategies

## Scraping Approaches per Platform
- **LinkedIn Jobs**: Navegar via Playwright em busca pública de vagas (`/jobs/search?keywords=developer+full+stack+junior`). Extrair título, empresa, localização e data de publicação.
- **Gupy Portal**: Utilizar a API pública do Gupy de busca de vagas (`https://portal.gupy.io/api/v1/jobs?name=developer%20full%20stack`) ou scraping com Playwright no portal Gupy.
- **Indeed**: Navegação via Playwright utilizando seletores CSS resilientes para vagas recentes (`/jobs?q=full+stack+junior&fromage=5`).
- **Google Jobs**: Query de busca no Google com Playwright (`"desenvolvedor full stack junior" site:google.com/search?q=...&ibp=htl;jobs`).

## Best Practices
- Configurar timeout razoável por página (ex: 15s - 30s).
- Aplicar o filtro de 5 dias (`isOlderThanDays(date, 5)`) logo na extração para descartar vagas antigas.
