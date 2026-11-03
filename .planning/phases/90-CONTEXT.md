# Phase 90 Context: Reestruturação da Dashboard Geral Admin com Foco em Negócio

## Contexto & Motivação
Com a criação e maturação da Central de Scrapers (`/admin/scrapers`) nas fases 87, 88 e 89 — que agora centraliza o painel operacional de conectores, telemetria de latência, expurgo e terminal de streaming SSE em tempo real —, a Dashboard Geral (`/admin`) pode ser liberada de controles técnicos operacionais e reestruturada como um **Painel de Controle Executivo de Negócio SaaS**.

A nova página `/admin` focará na visão holística do produto: atração de candidatos, parcerias B2B, volume e qualidade das oportunidades geradas pela IA, métricas financeiras de conversão e saúde geral do pipeline.

---

## Decisões Técnicas Travadas (Decisions Locked)

### 1. Top KPIs Executivos do SaaS
A grade superior contará com widgets `VelzonStatWidget` cobrindo os pilares do negócio:
- **Vagas Ativas no Pipeline**: Total de vagas disponíveis no sistema com indicador de vagas aprovadas pela triagem.
- **Base de Talentos / Candidatos**: Total de candidatos cadastrados na plataforma com métrica de crescimento recente.
- **Empresas Mapeadas & B2B**: Volume de empresas identificadas e parceiras comerciais ativas.
- **Inteligência de Fit (Hermes IA)**: Taxa percentual de aprovação semântica e eficiência do motor de triagem.
- **Receita Recorrente & Financeiro**: MRR (Monthly Recurring Revenue) ou volume de transações pagas.

### 2. Desacoplamento Técnico & Card de Infraestrutura
- **Remoção de Controles Operacionais**:
  - Eliminar botões manuais de disparo de scraping ("Iniciar Varredura").
  - Eliminar botão de expurgo manual com confirmação por alert do navegador.
  - Remover o modal flutuante `ScraperTerminalModal` de `src/app/admin/page.tsx`.
- **Card Executivo de Status de Infraestrutura**:
  - Exibir resumo elegante e conciso da saúde das fontes de coleta (volume de conectores cadastrados, status de integridade e latência média).
  - Incluir CTA proeminente: **"Gerenciar Conectores na Central de Scrapers"** com link direto para `/admin/scrapers`.

### 3. Painéis Analíticos Centrais
- **Distribuição por Canais**: Visualização de volume de vagas por canal de captação (`PlatformDistribution` adaptada para tema Velzon claro/escuro).
- **Pipeline Geral do Kanban**: Resumo visual dos estágios das vagas (Pendentes, Em Processo, Entrevistas, Propostas).
- **Top Empresas Contratantes**: Lista das companhias com maior volume de vagas ativas no ecossistema com tags de volume.
- **Atalhos Rápidos de Gestão**: Acesso direto para `/admin/vagas`, `/admin/empresas`, `/admin/usuarios` e `/admin/pagamentos`.

### 4. Rota e Redirecionamento `/admin/dashboard`
- Criar `src/app/admin/dashboard/page.tsx` executando `redirect('/admin')` de forma nativa e segura, garantindo que requisições legadas ou digitação direta pelo usuário não gerem erro 404.

### 5. Endpoint de Agregação de Negócio
- Criar ou estender endpoint de alta performance `GET /api/admin/dashboard/metrics` (ou similar) autenticado via sessão admin que consolida as métricas dos repositórios de jobs, usuários, empresas e pagamentos em uma única viagem HTTP sem latência perceptível.

---

## Critérios de Sucesso
- A Dashboard Geral `/admin` apresenta visual limpo, executivo e 100% responsivo no Design System Velzon.
- Não há mais botões de disparo de scraping ou expurgo na página `/admin` (eles pertencem exclusivamente à `/admin/scrapers`).
- A rota `/admin/dashboard` redireciona perfeitamente para `/admin`.
- Suíte determinística `src/test-phase90.ts` criada e aprovada com 100% de sucesso.
- Nenhuma regressão nas suítes anteriores e no `npm test`.
