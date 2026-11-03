# Phase 87 Context: Central de Scrapers — Rota Dedicada & Painel de Controle Operacional

## Contexto & Motivação
No ecossistema do Buscavag, o painel geral `/admin` acumulou métricas gerenciais misturadas com ações estritamente operacionais (disparo manual de scrapers, modais de terminal e expurgo). Para desacoplar a governança técnica da visualização executiva, a **Phase 87** estabelece a nova **Central de Scrapers** (`/admin/scrapers`).

A Central de Scrapers passa a ser o hub operacional definitivo para:
1. Controle de execução: Disparo global de todos os conectores e disparo granular por conector específico.
2. Controle de disponibilidade: Toggles individuais de ativação/desativação de conectores persistidos em banco de dados SQLite.
3. Higienização: Ação de expurgo de ruído e vagas não-tech.
4. Navegação: Integração direta na Sidebar sob "Operações SaaS".

## Decisões Técnicas
- **Repositório de Configuração**: Criação de `AdminScraperRepository` e tabela `scraper_configs` para rastrear conectores (nome, status ativo/inativo, método de scraping, timeout, timestamp de atualização).
- **Seed Automático**: Garantir que todos os 36 conectores conhecidos do sistema sejam inicializados com seus métodos padrão (Playwright, SSR, Cheerio/Cookie, API/Bridge).
- **Endpoint REST**: `GET /api/admin/scraper/config` para listar status e `PATCH /api/admin/scraper/config` para alternar ativação (`is_enabled`).
- **Disparo Parametrizado**: `POST /api/admin/scraper/run` atualizado para receber opcionalmente `scraperName` para disparo unitário ou vazio para disparo de todo o pipeline.
- **Interface Velzon**: Página `src/app/admin/scrapers/page.tsx` integrada com `AdminLayout`, `VelzonCard`, `VelzonBadge`, diálogos de confirmação e feedback toast/banner.
- **Navegação Sidebar**: Atualização de `src/components/admin/layout/AdminSidebar.tsx` incluindo "Central de Scrapers" com ícone `Cpu`.
