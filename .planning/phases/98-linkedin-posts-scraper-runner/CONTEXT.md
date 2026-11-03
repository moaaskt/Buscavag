# Phase 98: Scraper de Feed/Posts do LinkedIn Autenticado (`li_at`) & Runner de 3 em 3 Horas

## Contexto & Visão Geral
Muitas vagas de tecnologia e oportunidades iniciais/júnior não chegam a ser cadastradas formalmente na seção de "Jobs" do LinkedIn, sendo anunciadas como postagens diretas de tech recruiters, CTOs e desenvolvedores em seus feeds e páginas de empresas com termos como "oportunidades", "vagas", "estamos contratando".
O objetivo desta fase é consolidar o conector de postagens do LinkedIn para:
1. Suportar autenticação simplificada e direta através de cookie de sessão (`LINKEDIN_SESSION_COOKIE` / `li_at` ou `LI_COOKIES_JSON` no `.env`).
2. Realizar busca na barra de pesquisa por postagens com múltiplas queries dinâmicas de oportunidades e vagas em perfis e páginas empresariais.
3. Configurar a rotina do runner cron para executar a cada 3 horas (`0 */3 * * *`), permitindo também a execução isolada do LinkedIn Posts.

## Requisitos Cobertos
- **REQ-LNK-01**: O conector de posts do LinkedIn deve suportar autenticação por cookie de sessão (`LINKEDIN_SESSION_COOKIE` / `li_at`).
- **REQ-LNK-02**: Realizar busca ativa na barra de pesquisa por publicações contendo palavras-chave ("vagas", "oportunidades") em perfis e páginas empresariais.
- **REQ-LNK-03**: Orquestrar execução autônoma periódica do scraper a cada 3 horas.

## Critérios de Sucesso
1. Injeção de Cookie simplificada:
   - Suporte nativo à variável `LINKEDIN_SESSION_COOKIE` ou `li_at` no `.env` criando automaticamente o cookie `name: 'li_at'`, `domain: '.linkedin.com'`.
2. Busca aprofundada por posts de oportunidades:
   - Consultas dinâmicas: termos como `"vagas"`, `"oportunidades"`, `"estamos contratando"`, `"desenvolvedor júnior"`.
   - Extração do autor/empresa, texto completo do post e link permalink.
3. Agendamento em 3h:
   - `CRON_SCHEDULE` atualizado por padrão para `'0 */3 * * *'` em `src/cron.ts`.
   - Adicionado script npm `npm run scrape:linkedin-posts` para disparo pontual sob demanda.

