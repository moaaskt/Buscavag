# Phase 87 Summary: Central de Scrapers — Rota Dedicada & Painel de Controle Operacional

## Resumo Executivo
A **Phase 87** estabeleceu a rota física e a fundação operacional da **Central de Scrapers** (`/admin/scrapers`) no ecossistema administrativo do Buscavag. A camada técnica de governança de dados agora possui um espaço exclusivo e estruturado no padrão Velzon, desacoplando o controle de conectores da tela principal do painel.

---

## Entregas Realizadas

### 1. Rota Dedicada & Navegação na Sidebar (`REQ-87-01`)
- **Página Física**: `src/app/admin/scrapers/page.tsx` criada e integrada ao layout administrativo (`AdminLayout`) com suporte completo aos modos Claro e Escuro.
- **Navegação**: Atualização do componente `src/components/admin/layout/AdminSidebar.tsx` incluindo o item **"Central de Scrapers"** com ícone `Cpu` no grupo "Operações SaaS".

### 2. Persistência de Configuração no SQLite (`REQ-87-02`)
- **Tabela `scraper_configs`**: Criada automaticamente no `initDatabase()` (`src/db/index.ts`) com colunas `name`, `is_enabled`, `method`, `target_url`, `timeout_ms` e `updated_at`.
- **Repositório `AdminScraperRepository`**: Implementado em `src/db/adminScraperRepository.ts` com seed automático de todos os 36 conectores da plataforma (Playwright, SSR, API, Cookie).
- **Métodos**: `getAllConfigs()`, `getConfig(name)`, `toggleScraper(name, enabled)` e `updateConfig(name, data)`.

### 3. Endpoints REST de Controle
- **`GET /api/admin/scraper/config`**: Retorna a lista completa de conectores e seus estados atuais.
- **`PATCH /api/admin/scraper/config`**: Permite ativar ou desativar conectores individualmente em tempo real, gravando log de auditoria via `logAdminAction`.
- **`POST /api/admin/scraper/run`**: Atualizado para suportar o parâmetro opcional `scraperName`, permitindo tanto o disparo global quanto o disparo granular de um único conector.
- **Pipeline (`src/index.ts` & `src/scrapers/index.ts`)**: Suporte ao parâmetro `targetScraperName`, variável de ambiente `SCRAPER_TARGET` e argumento CLI `--scraper <name>`.

### 4. Interface da Central de Scrapers
- **Widgets de Indicadores**: Contagem de Conectores Totais, Conectores Ativos, Conectores Pausados e Métodos de Ingestão.
- **Cards de Controle**:
  - *Sincronização Global*: Disparo de todas as fontes ativas com feedback de carregamento.
  - *Execução Granular*: Dropdown de conector e botão de disparo imediato.
  - *Expurgo Operacional*: Botão de limpeza com modal de confirmação irreversível (`VelzonModal`).
- **Lista/Tabela de Conectores**: Filtros por busca textual, método e status, badges com cores semânticas e switches (toggles) interativos para ativação/desativação instantânea com optimistic update.

---

## Verificação e Testes
- **Suíte Determinística**: `src/test-phase87.ts` implementada com **18 testes** automatizados validando arquivos, links na sidebar, DDL da tabela, repositório, seed de 36 conectores, mutações de toggle, endpoints e componentes visuais.
- **Regressão de Fases Anteriores**: Execução com 100% de sucesso das suítes das fases 86, 85, 84, 83 e 82.
- **Regressão Global**: Runner unificado (`npm test`) com 9 suítes e 0 falhas.
- **Tipagem Estrita**: `npx tsc --noEmit` executado sem nenhum erro.

---

## Próximos Passos
Com a rota e o painel de controle operacionais em funcionamento, a **Phase 88** desenvolverá a **Tabela de Monitoramento de Conectores & Métricas em Tempo Real** (latência, status de sucesso/falha, método de captura e métricas da última execução).
