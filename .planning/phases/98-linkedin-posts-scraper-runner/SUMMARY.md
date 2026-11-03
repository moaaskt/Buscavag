# Summary: Phase 98 — Scraper de Feed/Posts do LinkedIn Autenticado (`li_at`) & Runner de 3 em 3 Horas

## O que foi implementado
1. **Autenticação Direta por Cookie de Sessão (`src/scrapers/linkedinPosts.ts`)**:
   - Adicionado suporte nativo à variável `LINKEDIN_SESSION_COOKIE` (ou `LI_AT_COOKIE` / `LINKEDIN_LI_AT`). Basta inserir o valor da chave `li_at` no `.env` para que o scraper injete o cookie com escopo seguro (`domain: '.linkedin.com'`, `path: '/'`, `httpOnly: true`, `secure: true`).
   - Mantida retrocompatibilidade com arquivos `li-cookies.json` e `LI_COOKIES_JSON`.

2. **Busca Focada em Oportunidades & Posts no Feed**:
   - Atualizada a consulta de busca para cruzar termos de recrutamento informal com perfis e páginas empresariais:
     `("vagas" OR "oportunidades" OR "estamos contratando" OR "vaga júnior" OR "vaga full stack" OR "vaga front" OR "vaga back" OR #vagas) AND (dev OR desenvolvedor OR programador OR ti OR software)`.
   - Ordenação estrita por publicações mais recentes (`sortBy="date_posted"`).
   - Extração aprimorada do permalink do post, autor e descrição detalhada.

3. **Runner Periódico a Cada 3 Horas (`src/cron.ts`) & Script Rápido**:
   - `CRON_SCHEDULE` atualizado para rodar a cada 3 horas (`0 */3 * * *`).
   - Adicionado o comando npm `"scrape:linkedin-posts": "cross-env SCRAPER_TARGET=\"LinkedIn Posts\" tsx src/index.ts"` no `package.json` para acionar a extração de posts sob demanda.

4. **Validação & Teste Automatizado (`src/scripts/test-linkedin-posts.ts`)**:
   - Script de teste criado e validado, confirmando injeção de cookie `li_at`, integridade de payload e estruturação das publicações sem falhas.

## Status no Milestone
- **Phase 98 concluída com 100% de sucesso**.
- **Milestone 24.0 com todas as fases finalizadas!**
