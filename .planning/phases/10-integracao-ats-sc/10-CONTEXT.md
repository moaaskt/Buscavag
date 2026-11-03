# Phase 10 Context: Integração ATS Nacionais e Regionais SC

## Fontes a Serem Integradas
Foram definidas 15 novas fontes de vagas para esta fase:

**Regionais de Santa Catarina:**
1. https://saojosemaisempregos.empregaja.org/
2. https://vagas.sc/
3. https://www.vagasfloripa.com.br/
4. http://empregapalhoca.com.br/

**Portais Nacionais:**
5. https://www.infojobs.com.br/
6. https://chawork.com.br/
7. https://www.trabalhabrasil.com.br/
8. https://www.bne.com.br/
9. https://bebee.com/br/jobs
10. https://www.empregos.com.br/
11. https://www.recrutasimples.com.br/vagas

**ATSs / Integradores:**
12. https://empregos.recrutei.com.br/?utm_source=website-recrutei
13. https://jobs.quickin.io/anarecrutamento/jobs
14. https://jobs.recrutei.com.br/PeoplePlan
15. https://gtorh.pandape.infojobs.com.br/

## Scraping Strategy
Devido à variedade de sites, a estratégia base adotará:
- **Playwright (Headless Browser):** Para sites com renderização pesada em client-side (SPA), captchas passivos ou proteções como Cloudflare que bloqueiam bots comuns.
- **Cheerio/Axios (HTTP requests diretas):** Para portais estáticos ou que retornem HTML puro sem bloqueio, por ser significativamente mais rápido e consumir menos recursos (ideal para escalabilidade).
- A decisão será tomada portal a portal, priorizando HTTP requests diretas e escalando para Playwright apenas quando necessário.

## Data Uniformity
Os dados extraídos deverão ser rigorosamente mapeados para a interface genérica `RawJob` existente, assegurando padronização total antes de encaminhar para a IA de matching. Metadados não essenciais fornecidos pelos ATSs serão descartados ou concatenados no campo de descrição caso sejam relevantes para o processo de avaliação (como pacote de benefícios específico).
