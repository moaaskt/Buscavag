# Phase 6: Research - New Scrapers Expansion

## Domain & Targets Analysis

### 1. Programathor
- **URL**: `https://programathor.com.br/jobs` (com filtros por tecnologia ou vagas recentes).
- **Mecanismo**: Estrutura server-rendered / HTML com listagem paginada e rotas de vagas bem estruturadas (`.cell-list`). Suporta requisições HTTP diretas com headers realistas via `axios` ou fallback `Playwright`.
- **Extração**:
  - Título da vaga (`h3` / text-muted)
  - Empresa
  - Localização (Remoto / Cidade)
  - Data / Tempo relativo ("há X horas", "há X dias")
  - Link da vaga para candidatura.

### 2. Remotar
- **URL**: `https://remotar.com.br/jobs` ou páginas de categoria (ex: desenvolvimento).
- **Mecanismo**: Renderização via Next.js/React. Suporta inspeção de endpoints de API pública/feed RSS (`/feed` ou endpoints JSON) ou scraping via Playwright aguardando a hydration dos cards de vagas.
- **Extração**:
  - Tags de nível (Jr/Pleno) e tecnologias
  - Título, link direto, data relativa e empresa.

### 3. Catho
- **URL**: `https://www.catho.com.br/vagas/desenvolvedor-junior/`
- **Mecanismo**: Proteções anti-bot intermediárias (Imperva / Cloudflare). Requer uso do `createStealthContext()` com Playwright, desativação de automação visível e timeouts generosos.
- **Extração**:
  - Seletores dos cards de vagas no portal
  - Extração de data de publicação e título limpo.

### 4. Glassdoor
- **URL**: `https://www.glassdoor.com.br/Vaga/brasil-desenvolvedor-junior-vagas-SRCH_IL.0,6_IN36_KO7,27.htm`
- **Mecanismo**: Requer contexto stealth cuidadoso e tratamento de modal de login ("Sign in" overlay).
- **Extração**:
  - Feeds de vaga, salários aproximados quando disponíveis, nome da empresa e link canônico.

---

## Technical Constraints & Integration Points
- **Enum `PlatformSource`**: Precisa ser estendido em `src/types/job.ts` com:
  - `PROGRAMATHOR = 'programathor'`
  - `REMOTAR = 'remotar'`
  - `CATHO = 'catho'`
  - `GLASSDOOR = 'glassdoor'`
- **Anti-Bot & Rate Limits**: Cada novo scraper deve manter timeouts isolados de no máximo 30s por página para não travar o pipeline.
- **Deduplicação**: O ID e URL devem ser validados pelo `JobRepository.exists` existente.
