# Buscavag 🎯🤖
![Desenvolvimento](https://img.shields.io/badge/Desenvolvimento-Cont%C3%ADnuo-FF9800?style=for-the-badge&logo=github&logoColor=white)

> **Autonomous Job Intelligence & Career Automation Platform**  
> Plataforma SaaS de alta disponibilidade para monitoramento 24/7, extração stealth em múltiplos canais, curadoria semântica com Inteligência Artificial, gestão de candidaturas via Kanban multi-inquilino e alertas automatizados multicanal.

---

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)
![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=for-the-badge&logo=sqlite)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-IA_Engine-8E75C2?style=for-the-badge&logo=google)
![Telegram](https://img.shields.io/badge/Telegram-Grammy_Bot-26A5E4?style=for-the-badge&logo=telegram)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Engine-25D366?style=for-the-badge&logo=whatsapp)

---

## 📌 Visão Geral

O **Buscavag** é um ecossistema integrado projetado para resolver a fragmentação do mercado de contratação em tecnologia. Em vez de monitorar dezenas de portais manualmente, o Buscavag orquestra robôs de raspagem resilientes (com evasão avançada de anti-bot), consolida as vagas em tempo real, filtra ruídos e duplicidades via IA e entrega uma interface visual moderna onde cada candidato pode analisar sua compatibilidade semântica e acompanhar seu processo seletivo do início ao fim.

---

## 🏛️ Arquitetura do Sistema

O sistema opera em uma arquitetura de microserviços desacoplada e orquestrada via **Docker Compose**:

```mermaid
graph TD
    subgraph Ingestao ["Coleta & Evasão Multi-Platform (25+ Canais)"]
        Scrapers["Scrapers Node.js (Playwright / Cheerio / APIs)"]
        Scrapling["Python Scrapling Engine (FastAPI Anti-Bot / Cloudflare Evasion)"]
        Scrapers <-->|HTTP Bridge :8000| Scrapling
    end

    subgraph Core ["Processamento & Inteligência"]
        Orchestrator["Orquestrador Cron / Daemon"]
        Deduplicator["Deduplicação & Hash SHA256"]
        HermesIA["Hermes Evaluator (Gemini IA / Heurísticas)"]
        
        Scrapers --> Orchestrator
        Orchestrator --> Deduplicator
        Deduplicator --> HermesIA
    end

    subgraph Storage ["Persistência & Dados"]
        DB[(SQLite3 em Modo WAL - buscavag.db)]
        Uploads[Volume Uploads: Resumes & PDF/DOCX]
        HermesIA --> DB
    end

    subgraph Frontend ["Aplicação Web & SaaS (Next.js 16 + React 19)"]
        Dashboard["Dashboard em Tempo Real"]
        JobExplorer["Explorador de Vagas Facetado"]
        Kanban["Kanban Multi-Tenant"]
        CandidateArea["Área do Candidato & Match IA"]
        AdminArea["Painel Admin & Monitor de Scrapers"]
        
        DB <--> Frontend
        Uploads <--> Frontend
    end

    subgraph Notificacoes ["Alertas & Mensageria"]
        Telegram["Telegram Bot (Grammy)"]
        WhatsApp["WhatsApp Service"]
        CoverLetter["Gerador de Cartas com IA"]
        
        HermesIA -.-> Telegram
        HermesIA -.-> WhatsApp
        CandidateArea -.-> CoverLetter
    end
```

### Serviços em Produção (Docker Stack):
1. **`buscavag-web`** (`:3000`): Aplicação fullstack Next.js (App Router, Server Actions, API routes, autenticação multi-tenant e componentes com design system adaptativo e efeito dinâmico *Aurora Waves* em verde esmeralda).
2. **`buscavag-scraper`**: Orquestrador autônomo de raspagem em Node.js com agendamento contínuo via Cron, execução concorrente, observabilidade de falhas e deduplicação estrita.
3. **`buscavag-scrapling-engine`** (`:8000`): Microserviço dedicado em Python (FastAPI + Uvicorn + Scrapling) para contornar proteções avançadas, Cloudflare Turnstile, fingerprinting TLS e bloqueios de bot.

---

## 🌐 Cobertura de Canais (25+ Portais Integrados)

O motor de coleta do Buscavag atua em cinco frentes complementares:

| Categoria | Fontes Conectadas | Mecanismo de Coleta |
| :--- | :--- | :--- |
| **Grandes Plataformas** | LinkedIn Jobs, Indeed Brasil, Google Jobs, Glassdoor, Catho, InfoJobs, Trabalha Brasil | Playwright Stealth / HTTP Resiliente |
| **Especializadas em Tech & Startups** | Gupy Portal, GeekHunter, Programathor, Revelo, Remotar, Trampos, Nerdin, RunTalent, 99Jobs | Ingestão de APIs públicas & Web Scraping |
| **Gigs & Projetos Freelance** | Workana, 99Freelas | Extração de demandas tech, orçamentos e prazos |
| **Comunidades & Social** | Canais públicos de TI no Telegram (`t.me/s/...`), Grupos do Facebook | Conector Stealth sem cookies e parsers de feeds |
| **Polos Regionais (SC)** | Vagas Floripa, Vagas SC, Emprega Palhoça, São José Empregos, Chawork | Raspagem regional com regras geográficas |
| **Sistemas ATS & Recrutamento** | PandaPé, RecrutaSimples, Recrutei, Solides, Bebee, BNE | Parsers de vagas públicas em portais de RH |

---

## 🧠 Motor de Curadoria e Inteligência Artificial

### 1. Classificação & Anti-Spam (Hermes Evaluator)
- **Extração Semântica**: Identifica senioridade, modalidade (Remoto, Híbrido, Presencial), faixa salarial, empresa, cidade e stack de tecnologias exigidas.
- **Filtro Anti-Spam & Anti-Ruído**: Descarte de vagas duplicadas, cursos disfarçados de emprego, vagas fantasmas ou posições fora da área de tecnologia.
- **Deduplicação Criptográfica**: Gera hash SHA-256 exclusivo combinando título canônico, empresa normalizada e URL, eliminando duplicatas mesmo entre plataformas diferentes.
- **Fallback Determinístico**: Se a cota de LLM expirar, um motor de regras heurísticas baseado em regex e dicionário semântico assume instantaneamente sem interromper o pipeline.

### 2. Match Semântico de Perfil do Candidato
- O candidato faz upload do currículo (**PDF ou DOCX**) ou preenche o perfil técnico.
- A IA extrai hard skills, soft skills, senioridade e bio profissional.
- O algoritmo calcula um **Score de Compatibilidade (0% a 100%)**, indicando:
  - Tecnologias convergentes (Match direto).
  - Lacunas técnicas (Gaps para estudo).
  - Justificativa detalhada do porquê a vaga combina com aquele perfil.

### 3. Gerador de Cartas de Apresentação (Cover Letters)
- Geração instantânea de cartas de apresentação personalizadas em um clique, adaptando o histórico real do candidato aos requisitos e tom de voz da vaga selecionada.

---

## 💻 Funcionalidades do Dashboard Web

### 📊 Dashboard Executivo & Estatísticas
- Métricas em tempo real: Total de vagas coletadas, vagas aprovadas no filtro de qualidade, taxa de aproveitamento e score médio.
- Gráficos de distribuição por categoria (Full Stack, Mobile, Backend, Frontend, Data, DevOps, etc.).
- Ranking das principais empresas com posições abertas.

### 🔍 Explorador de Vagas Facetado
- Busca textual dinâmica por termos, empresas ou tecnologias.
- Filtros rápidos por modalidade (Remoto, Híbrido, Presencial), senioridade e canal de origem.
- Recurso **Ocultar Vagas**: Permite esconder vagas descartadas para manter o feed sempre limpo.
- Badges visuais padronizados por plataforma (`PlatformBadge`) e links diretos para candidatura.

### 📋 Kanban de Candidaturas (Multi-Tenant)
- Pipeline visual estilo Trello/Jira com colunas de funil:
  1. `Inbox / Pendente`
  2. `Candidaturas Enviadas`
  3. `Em Processo / Entrevista`
  4. `Propostas Recebidas`
  5. `Descartadas`
- **Total Isolamento Multi-Inquilino**: Cada usuário logado possui seu próprio board com anotações, datas de envio e controle de status de candidaturas.

### 👤 Área do Candidato & Gestão de Carreira
- Upload e parsing automatizado de currículos (PDF/DOCX) armazenados em volume dedicado.
- Sincronização automática do resumo executivo da IA com a bio do candidato.
- Aba de **Vagas Recomendadas (Match IA)** com ordenação por afinidade.
- Aba de **Vagas Salvas** para acesso rápido posterior.

### 🛠️ Painel Administrativo & Observabilidade
- **Scraper Health Monitor**: Status em tempo real de cada robô de coleta, última execução e taxa de sucesso.
- **Distribuição de Vagas por Plataforma**: Gráficos analíticos da contribuição volumétrica de cada scraper.
- Disparo manual de rotinas de coleta sob demanda diretamente pela interface.

### 💎 Modelo SaaS & Paywall Freemium
- Autenticação completa via cookies HTTP-only seguros (`/login` e `/register`).
- Camada de permissões e controle de planos (Free vs Premium Pro).
- Proteção de rotas e limites configuráveis para análises de IA avançadas.

### 🎨 Design System & Estética
- **Dual-Mode Nativo**: Suporte completo a **Modo Claro** e **Modo Escuro** com transições suaves e sem flashes (SSR/Hydration safe).
- **Aurora Background**: Efeito dinâmico de ondas esmeralda e verde menta (`emerald` & `fresh green`), harmonizado com a identidade visual da plataforma.
- Ícones padronizados via `lucide-react`.

---

## 📲 Mensageria & Notificações Multicanal

### Bot do Telegram (Grammy)
- Envio instantâneo de cards formatados em HTML com botões inline de candidatura.
- Indicador visual do Score de IA (ex: `🔥 92% Match`).
- **Alerta de Observabilidade**: Notificação imediata para a equipe caso qualquer canal apresente taxa de erro ou timeout anormal.
- Throttling automático para proteção contra rate-limits do Telegram.

### Motor de WhatsApp
- Serviço integrado para despacho de oportunidades selecionadas e cartas de apresentação direto no celular do candidato.

---

## 🛠️ Stack Tecnológica Completa

| Camada | Tecnologias Utilizadas |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React, SweetAlert2 |
| **Backend & APIs** | Node.js 22, Next.js Server Actions & API Routes, Zod, Better-SQLite3 |
| **Scraping & Evasão** | Playwright (Chromium Headless), Cheerio, Axios, Python 3.11, FastAPI, Uvicorn, Scrapling |
| **Inteligência Artificial** | Google Gemini API (`@google/genai`), OpenAI SDK, Motor Heurístico Próprio |
| **Mensageria** | Grammy (Telegram Bot API), WhatsApp Engine |
| **Banco de Dados** | SQLite3 com **Write-Ahead Logging (WAL)** e inicialização resiliente |
| **Infra & DevOps** | Docker, Docker Compose, Linux VPS, Crontab / Systemd |

---

## 🚀 Instalação e Execução

### Opção 1: Via Docker Compose (Recomendado para Produção)

#### 1. Clonar o repositório
```bash
git clone https://github.com/moanetodev/buscavag.git
cd buscavag
```

#### 2. Configurar o `.env`
```bash
cp .env.example .env
```
Preencha as variáveis de ambiente necessárias:
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=seu_bot_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui

# Inteligência Artificial (Gemini)
GEMINI_API_KEY=sua_chave_gemini_aqui

# Banco de Dados & Caminhos
DATABASE_PATH=/app/data/buscavag.db

# Agendamento dos Scrapers (padrão: a cada 4 horas)
CRON_SCHEDULE=0 */4 * * *

# Microserviço Anti-Bot
SCRAPLING_ENGINE_URL=http://scrapling-engine:8000
```

#### 3. Subir o ambiente com Docker Compose
```bash
docker compose build
docker compose up -d
```

O dashboard estará disponível em: `http://localhost:3000`  
O engine de scraping Python estará em: `http://localhost:8000/docs`

#### 4. Gerenciamento dos Containers
```bash
# Ver logs em tempo real
docker compose logs -f web
docker compose logs -f scraper
docker compose logs -f scrapling-engine

# Reiniciar um serviço específico após alterações
docker compose build web && docker compose up -d web

# Parar todos os serviços
docker compose down
```

---

### Opção 2: Execução Local para Desenvolvimento

#### 1. Instalar dependências Node.js
```bash
npm install
npx playwright install chromium
```

#### 2. Configurar o banco e o ambiente
```bash
cp .env.example .env
# Ajuste o DATABASE_PATH para ./buscavag.db no .env local
```

#### 3. Iniciar o Dashboard Next.js
```bash
npm run dev
```

#### 4. Executar o pipeline de coleta manualmente
```bash
# Executa todos os scrapers e o pipeline de curadoria completo
npm run start

# Ou rodar o orquestrador agendado local
npm run start:cron
```

---

## 🧪 Suíte de Testes e Diagnósticos

O projeto possui comandos dedicados para testar cada subsistema de forma isolada:

```bash
# Testar scrapers e taxa de resposta dos portais
npm run test
npm run audit:scrapers

# Testar conectores específicos
npm run test:fb            # Conector de grupos do Facebook
npm run test:whatsapp      # Disparador de WhatsApp

# Testar IA, heurísticas e observabilidade
npx tsx src/test-ai.ts
npx tsx src/test-perfect-match.ts
npx tsx src/test-observability.ts
npx tsx src/test-candidate-auth.ts
npx tsx src/test-saas-paywall.ts
```

---

## 📁 Estrutura do Repositório

```text
buscavag/
├── docker-compose.yml           # Orquestração dos 3 microserviços
├── Dockerfile.web               # Multi-stage build da aplicação Next.js
├── Dockerfile.scraper           # Runtime do orquestrador de scrapers (Node + Playwright)
├── src/
│   ├── app/                     # Next.js App Router (Rotas, Layout, APIs)
│   │   ├── admin/               # Dashboard administrativo e monitor de saúde
│   │   ├── api/                 # Endpoints REST (jobs, auth, candidate, board, etc.)
│   │   ├── board/               # Interface do Kanban de candidaturas
│   │   ├── candidate/           # Área do candidato (Perfil, CV, Match, Salvas)
│   │   ├── jobs/                # Explorador de vagas facetado
│   │   ├── login/ & register/   # Autenticação e telas dual-mode
│   │   ├── pricing/             # Planos de assinatura e paywall
│   │   ├── globals.css          # Design system, temas e tokens CSS
│   │   ├── layout.tsx           # Shell global com AuroraBackground
│   │   └── page.tsx             # Landing page e dashboard principal
│   ├── components/              # Componentes de UI reutilizáveis (Navbar, Badges, etc.)
│   │   └── ui/                  # Componentes base e aurora-background.tsx
│   ├── db/                      # Camada de banco de dados SQLite (WAL Mode)
│   │   ├── index.ts             # Conexão resiliente e migrações
│   │   ├── repository.ts        # Repositório principal de vagas
│   │   ├── candidateRepository.ts # Repositório multi-tenant de candidatos
│   │   └── logRepository.ts     # Repositório de auditoria e métricas
│   ├── scrapers/                # Coletores especializados (35+ plataformas)
│   │   ├── base.ts              # Classe abstrata para novos scrapers
│   │   ├── linkedin.ts, indeed.ts, gupy.ts, googleJobs.ts...
│   │   ├── facebookGroups.ts    # Conector stealth de comunidades
│   │   └── index.ts             # Registro e orquestração dos scrapers
│   ├── services/                # Serviços de negócio e integrações
│   │   ├── hermesEvaluator.ts   # IA Gemini, categorização e heurísticas
│   │   ├── candidateMatcher.ts  # Algoritmo de score e compatibilidade
│   │   ├── telegramNotifier.ts  # Bot Telegram via Grammy
│   │   ├── whatsappService.ts   # Notificações e gerador de cartas WhatsApp
│   │   ├── pythonBridge.ts      # Comunicação com o Scrapling Engine
│   │   └── scrapling-engine/    # Microserviço Python (FastAPI + Anti-Bot)
│   ├── types/                   # Tipagens TypeScript e schemas Zod
│   ├── utils/                   # Utilitários, sanitizadores e geradores de Hash
│   ├── cron.ts                  # Daemon com agendamento contínuo
│   └── index.ts                 # Ponto de entrada da execução direta
├── data/                        # Volume persistente do SQLite (buscavag.db)
├── uploads/                     # Volume persistente para upload de currículos
├── DEPLOY.md                    # Manual operacional de implantação em VPS
├── tailwind.config.ts           # Configuração de temas e keyframes de animação
└── package.json                 # Manifesto de dependências e scripts do projeto
```

---

## 🔒 Confiabilidade, Resiliência e Concorrência

1. **SQLite WAL (Write-Ahead Logging)**: Acesso concorrente seguro entre o Next.js (leitura/escrita de candidatos) e o container scraper (escrita massiva de vagas), prevenindo bloqueios `SQLITE_BUSY`.
2. **Evasão Anti-Bot**: O microserviço `scrapling-engine` utiliza impersonação de perfis TLS de navegadores reais, rotação de headers de usuário e evasão de assinaturas JavaScript.
3. **Multi-Tenancy por Design**: Todos os registros de candidaturas, status de Kanban, cartas geradas e currículos utilizam chaves relacionais vinculadas ao usuário autenticado.

---

## 📄 Licença

Este software é licenciado sob uso privado para automação de carreira, inteligência de dados e prospecção técnica. Todos os direitos reservados.
