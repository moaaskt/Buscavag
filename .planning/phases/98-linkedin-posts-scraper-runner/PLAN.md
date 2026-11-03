# Plan: Phase 98 — Scraper de Feed/Posts do LinkedIn Autenticado (`li_at`) & Runner de 3 em 3 Horas

## Objetivo
Configurar o conector `LinkedInPostsScraper` para carregar diretamente o cookie de sessão autenticada `LINKEDIN_SESSION_COOKIE` / `li_at`, minerar publicações de oportunidades em perfis pessoais e páginas de empresas na barra de busca, e agendar a execução do runner periódico a cada 3 horas.

---

### Task 1: Autenticação por Cookie `LINKEDIN_SESSION_COOKIE` (`li_at`) & Busca Dinâmica
**Arquivos Envolvidos:**
- `src/scrapers/linkedinPosts.ts`

**Ações:**
1. Atualizar o método `injectSessionCookies`:
   - Priorizar a leitura de `process.env.LINKEDIN_SESSION_COOKIE` ou `process.env.LI_AT_COOKIE`. Se presente uma string simples de cookie (o valor puro de `li_at`), gerar o payload:
     `{ name: 'li_at', value: token, domain: '.linkedin.com', path: '/', httpOnly: true, secure: true, sameSite: 'None' }`.
   - Manter fallback para `LI_COOKIES_JSON` e arquivos `li-cookies.json`.
2. Expandir a query de busca de posts para cobrir publicações de pessoas e páginas de empresas:
   - Termos: `"vagas" OR "oportunidades" OR "estamos contratando" OR "desenvolvedor júnior" OR "vaga frontend" OR "vaga backend"`.
   - Ordenar por data mais recente (`sortBy=%22date_posted%22`).
3. Melhorar a resiliência na extração do permalink, texto da publicação e nome da empresa/autor.

---

### Task 2: Agendamento Periódico a Cada 3 Horas & Script de Execução Rápida
**Arquivos Envolvidos:**
- `src/cron.ts`
- `package.json`

**Ações:**
1. Em `src/cron.ts`, alterar o padrão do agendamento:
   - `const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 */3 * * *';` (a cada 3 horas).
2. Em `package.json`, adicionar script direto para minerar posts do LinkedIn individualmente:
   - `"scrape:linkedin-posts": "cross-env SCRAPER_TARGET=\"LinkedIn Posts\" tsx src/index.ts"`.

---

### Task 3: Verificação & Teste Unitário do Conector
**Arquivos Envolvidos:**
- `src/scripts/test-linkedin-posts.ts` (novo)

**Ações:**
1. Criar script de teste `src/scripts/test-linkedin-posts.ts` para testar o carregamento dos cookies e a inicialização segura do conector.
2. Executar compilação e teste unitário garantindo estabilidade e tipos válidos.

