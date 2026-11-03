# Phase 8: Web Dashboard & Interactive Job Board - Context & Decisions

## Context
O Buscavag atual coleta vagas, avalia através de IA via `HermesEvaluator`, armazena no `SQLite` (com scores granulares e metadados) e notifica o usuário via Telegram.
A Fase 8 objetiva criar uma interface rica, moderna e interativa (Dashboard) para visualizar as vagas, métricas e permitir a gestão das candidaturas através de um fluxo Kanban, sem depender unicamente do Telegram.

---

## Decisões Arquiteturais e Tecnológicas

### 1. Arquitetura do Sistema (Fullstack)
- **Framework:** `Next.js` (App Router preferencialmente).
- **Razão:** Facilita a integração em um único projeto (Monorepo ou pasta `/web` ou até integrando no projeto atual), permitindo a criação de rotas de API robustas que farão queries no banco `SQLite` existente e renderizarão o front-end via SSR/SSG.
- **Banco de Dados:** Conexão direta via `better-sqlite3` ou `Prisma` nas rotas de API do Next.js acessando o arquivo `buscavag.db`. (Nota: Adicionar campo `status` na tabela `jobs` se ele ainda não existe).

### 2. Estilização e UI
- **Estilos:** `Tailwind CSS`.
- **Componentes:** `Shadcn UI`.
- **Aesthetic:** Design premium, Dark Mode nativo, componentes minimalistas de alta performance (Data Tables, Cards, Modals). 

---

## Escopo Funcional (Features Priorizadas)

### 1. Dashboard de Métricas
- **Visão Geral:** Estatísticas diárias/semanais (Total Coletado vs Aprovado).
- **Insights:** Top Empresas contratando, Tecnologias em alta nas vagas.

### 2. Listagem Inteligente de Vagas (Tabela/Feed)
- **Filtros e Buscas:** Por `score IA` (ex: >= 80), `category` (Frontend, Backend, etc.), `platform` (Gupy, LinkedIn, Programathor, etc.), `status` (Pendente, Aplicado, Rejeitado, Entrevista).
- **Ordenação:** Data de publicação, Score Geral, Score de Stack.

### 3. Detalhamento (Modal de Vaga)
- Ao clicar em uma vaga, um modal limpo abrirá exibindo:
  - Descrição da vaga e Link direto.
  - Decomposição do Score da IA (Gráficos ou barras de Stack, Nível, Localização).
  - **Gaps Analisados:** Tecnologias faltantes na stack do usuário.
  - **Resume Tips:** A dica gerada pela IA de como formatar o currículo para esta vaga.

### 4. Kanban / Sistema Drag & Drop (Gestão de Status)
- Interface de colunas estilo Trello.
- **Colunas sugeridas:** Pendente (Inbox), Aplicado, Entrevista, Oferta, Rejeitado/Descartado.
- Backend precisa de um endpoint para atualizar o campo `status` da vaga no SQLite (uma migração de banco será necessária para criar o campo `application_status` caso não exista).

---

## Critérios de Sucesso da Fase 8
- [ ] Projeto Next.js configurado (com Tailwind + Shadcn).
- [ ] Migração do banco de dados para suportar `application_status` (Pendente, Aplicado, Entrevista, Oferta, Descartado).
- [ ] Rotas de API no Next.js (`GET /api/jobs`, `PATCH /api/jobs/:id/status`, `GET /api/stats`).
- [ ] Tela de Dashboard com Métricas (Gráficos ou Cards).
- [ ] Tabela de Vagas com Filtros avançados e visualização do score granular.
- [ ] Modal de detalhes com Gaps e Resume Tips.
- [ ] View Kanban interativo (Drag & Drop) persistindo o status via API.
