# Plan — Phase 57: Conector Stealth Facebook & Engine de Ingestão de Comunidades

## Context & Objectives
A **Fase 57** inicia o **Milestone 15.0** criando a infraestrutura de captura para oportunidades de trabalho e projetos informais/freela publicados em Grupos de Tecnologia do Facebook.

Muitas vagas de tecnologia de entrada, projetos freela e oportunidades locais/remotas são anunciadas exclusivamente como postagens em texto livre em comunidades do Facebook (ex: grupos de desenvolvedores, vagas React, Python, Node.js e polos regionais). 

Os objetivos desta fase são:
1. Adicionar a constante `FACEBOOK_GROUPS` ao enum `PlatformSource` em `src/types/job.ts`.
2. Implementar o scraper stealth `FacebookGroupsScraper` em `src/scrapers/facebookGroups.ts` usando Playwright com injeção segura de cookies de sessão (via `FB_COOKIES_JSON` / `FB_COOKIES_PATH`).
3. Varrer grupos de tecnologia configurados e capturar o conteúdo bruto das postagens das últimas 24h (ID da publicação, texto integral, autor, data e permalink original).
4. Garantir deduplicação estrita por ID único da publicação (`fb_post_<group_id>_<post_id>`) e resiliência a links quebrados ou posts removidos.
5. Registrar o conector no `ScraperOrchestrator` (`src/scrapers/index.ts`) e criar um script de teste unitário/integração em `scripts/test-facebook-groups.ts`.

---

## Inputs & Dependencies
- `src/types/job.ts` (`PlatformSource` enum & `RawJob` schema)
- `src/scrapers/base.ts` (`JobScraper` interface & `createStealthContext()`)
- `src/scrapers/index.ts` (`ScraperOrchestrator`)
- Requisitos: **REQ-1501**, **REQ-1502**, **REQ-1503**

---

## Tasks

### Task 1: Atualização dos Tipos da Plataforma (`src/types/job.ts`)
1. **Adicionar Enum `FACEBOOK_GROUPS`**:
   - Incluir `FACEBOOK_GROUPS = 'facebook_groups'` no enum `PlatformSource`.
   - Garantir suporte do schema `RawJobSchema` e `ProcessedJobSchema`.

### Task 2: Implementação do `FacebookGroupsScraper` (`src/scrapers/facebookGroups.ts`)
1. **Estrutura Base**:
   - Criar classe `FacebookGroupsScraper` implementando a interface `JobScraper`.
   - Definir lista configurável de grupos de tecnologia (ex: `programadoresbr`, `vagasdevbr`, `reactbrasil`, `nodejsbr`, `pythonbrasil`, `devs.sc`).
2. **Contexto Stealth & Cookies**:
   - Utilizar `createStealthContext()` para lançar navegador Playwright com User-Agent aleatório e flags de evasão de automação.
   - Ler variável de ambiente `FB_COOKIES_JSON` (ou arquivo local de cookies de sessão se existente).
   - Injetar cookies no `BrowserContext` via `context.addCookies(...)` antes de acessar as URLs dos grupos para contornar telas de bloqueio e redirecionamentos de login.
3. **Extração de Posts & Metadados**:
   - Navegar em cada grupo de tecnologia com timeout seguro (15-30s).
   - Localizar os nós de postagem no DOM e extrair: ID do post, texto bruto completo, data/hora da publicação, nome do autor e permalink direto.
   - Filtrar postagens criadas nas últimas 24h.
   - Montar objeto `RawJob` com:
     - `title`: Primeira linha relevante ou resumo do post (máx. 80 caracteres).
     - `company`: `Facebook Group: <group_name>`.
     - `platform`: `PlatformSource.FACEBOOK_GROUPS`.
     - `url`: Permalink direto (`https://www.facebook.com/groups/<group_id>/posts/<post_id>`).
     - `description`: Conteúdo textual na íntegra do post.
     - `publishedAt`: Data calculada/capturada do post.
     - `location`: `Remoto / Facebook Group`.
4. **Deduplicação & Tratamento de Erros**:
   - Gerar chave de id única para deduplicação: `fb_post_<group_id>_<post_id>`.
   - Capturar exceções por grupo individual para impedir que a falha em um grupo interrompa a coleta dos demais.

### Task 3: Registro no `ScraperOrchestrator` (`src/scrapers/index.ts`)
1. **Exportação & Instanciação**:
   - Exportar `FacebookGroupsScraper` em `src/scrapers/index.ts`.
   - Adicionar `new FacebookGroupsScraper()` ao array de scrapers do `ScraperOrchestrator`.

### Task 4: Script de Teste & Validação (`scripts/test-facebook-groups.ts`)
1. **Criar Script de Validação**:
   - Criar `scripts/test-facebook-groups.ts` para instanciar e executar o `FacebookGroupsScraper`.
   - Validar retorno de `RawJob[]` formatado com `platform === PlatformSource.FACEBOOK_GROUPS`.
   - Verificar deduplicação por ID e resiliência visual.
2. **Executar Teste**:
   - Executar com `npx tsx scripts/test-facebook-groups.ts`.

---

## Verification Criteria
- [ ] `PlatformSource.FACEBOOK_GROUPS` adicionado ao `src/types/job.ts`.
- [ ] `FacebookGroupsScraper` criado em `src/scrapers/facebookGroups.ts` com injeção de cookies e evasão stealth.
- [ ] Extração de conteúdo bruto de postagens com ID, texto integral, permalink, autor e data.
- [ ] Chave de deduplicação estrita implementada (`fb_post_<group_id>_<post_id>`).
- [ ] `FacebookGroupsScraper` registrado no `ScraperOrchestrator` (`src/scrapers/index.ts`).
- [ ] Script `scripts/test-facebook-groups.ts` executa e passa com sucesso.
- [ ] `npm run build` (`tsc`) compila sem nenhum erro de tipo.
