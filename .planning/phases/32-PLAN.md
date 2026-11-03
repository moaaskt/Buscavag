# Phase 32 Plan: Fundação do Microserviço Python (Scrapling Engine)

## Metadata
- **Phase**: 32
- **Milestone**: 9 (Motor Híbrido Scrapling & Blindagem 100% dos Scrapers)
- **Scope**: Criação do serviço Python independente (`src/services/scrapling-engine`), endpoints FastAPI (`/health`, `/scrape`), empacotamento com Dockerfile e orquestração no `docker-compose.yml`.
- **Dependencies**: Nenhuma direta (criação da camada de serviço backend Python).

---

## Objective
Estabelecer a fundação do microserviço Python de alta performance especializado em evasão anti-bot e raspagem resiliente usando a biblioteca **Scrapling** com FastAPI e Uvicorn. O microserviço receberá requisições de raspagem padronizadas do Buscavag em JSON e responderá uma lista estruturada de `Job[]`.

---

## Detailed Task Breakdown

### Task 1: Estrutura do Pacote e Dependências (`src/services/scrapling-engine`)
- **Arquivos**:
  - `src/services/scrapling-engine/requirements.txt`:
    - `fastapi>=0.110.0`
    - `uvicorn[standard]>=0.28.0`
    - `pydantic>=2.6.0`
    - `scrapling[all]>=0.2.0` (ou `scrapling`, `httpx`, `beautifulsoup4`, `camoufox`, `playwright`)
    - `python-dotenv>=1.0.0`
  - `src/services/scrapling-engine/pyproject.toml` ou setup básico se necessário.
  - `src/services/scrapling-engine/.env.example` com portas e configs padrão.

### Task 2: Modelos de Dados Pydantic (`schemas.py`)
- **Arquivo**: `src/services/scrapling-engine/app/schemas.py`
- **Modelos**:
  - `ScrapeRequest`:
    - `source`: str (ex: `'catho'`, `'google_jobs'`, `'remotar'`, etc.)
    - `query`: Optional[str] = "desenvolvedor"
    - `location`: Optional[str] = None
    - `limit`: Optional[int] = 20
    - `options`: Optional[Dict[str, Any]] = None
  - `JobResponseItem`:
    - `id`: Optional[str]
    - `title`: str
    - `company`: str
    - `location`: str
    - `url`: str
    - `source`: str
    - `description`: Optional[str] = ""
    - `publishedAt`: Optional[str] = None
    - `salary`: Optional[str] = None
    - `workModel`: Optional[str] = None
    - `extra`: Optional[Dict[str, Any]] = None
  - `ScrapeResponse`:
    - `success`: bool
    - `source`: str
    - `count`: int
    - `jobs`: List[JobResponseItem]
    - `error`: Optional[str] = None
    - `executionTimeMs`: Optional[float] = None
  - `HealthResponse`:
    - `status`: str (ex: `"healthy"`)
    - `version`: str
    - `engine`: str (`"scrapling"`)
    - `timestamp`: str

### Task 3: Implementação da Aplicação FastAPI e Roteamento (`main.py`)
- **Arquivo**: `src/services/scrapling-engine/app/main.py`
- **Ações**:
  - Inicializar FastAPI app com CORS middleware aberto para chamadas internas.
  - Endpoint `GET /health` retornando status, tempo ativo e versão do motor.
  - Endpoint `POST /scrape` recebendo `ScrapeRequest` e delegando para o roteador de coletores em Python.
  - Middleware de logging e medição de latência (`executionTimeMs`).
  - Coletor demonstrativo / base de validação (`test_ping` / `mock` / coletor de teste Scrapling) para validar o ciclo de requisição e resposta.

### Task 4: Dockerfile e Integração com Docker Compose
- **Arquivos**:
  - `src/services/scrapling-engine/Dockerfile`:
    - Imagem base `python:3.11-slim`
    - Instalação de dependências de sistema para headless browsers (se necessário para stealth browser/camoufox).
    - Instalação dos pacotes Python via `pip install --no-cache-dir -r requirements.txt`.
    - Execução do Uvicorn escutando em `0.0.0.0:8000`.
  - `docker-compose.yml`:
    - Adicionar o serviço `scrapling-engine`:
      - Build context: `./src/services/scrapling-engine`
      - Portas: `8000:8000`
      - Container name: `buscavag-scrapling-engine`
      - Restart: `unless-stopped`
      - Healthcheck em `http://localhost:8000/health`.
    - Adicionar dependência nos serviços `scraper` e `web` (`depends_on: [scrapling-engine]`).
    - Passar variável `SCRAPLING_ENGINE_URL=http://scrapling-engine:8000` para o container do `scraper`.

---

## Verification Plan

1. **Validação Local do Microserviço**:
   - Rodar o servidor Python com `uvicorn app.main:app --port 8000 --reload` (ou script de teste python).
   - Testar `GET http://localhost:8000/health` verificando retorno `200 OK` com `{"status": "healthy"}`.
   - Testar `POST http://localhost:8000/scrape` enviando payload de teste e validando resposta Pydantic válida.
2. **Validação Docker**:
   - Validar sintaxe do `Dockerfile` e do `docker-compose.yml` (`docker compose config`).
3. **Validação de Tipagem / Schema**:
   - Garantir que os campos de `JobResponseItem` mapeiam perfeitamente com a interface TypeScript `Job` do Buscavag.
