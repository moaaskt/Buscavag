# Phase 87 Plan: Central de Scrapers — Rota Dedicada & Painel de Controle Operacional

## Vision & Goal
Estabelecer a fundação arquitetural e de interface da Central de Scrapers do Buscavag em `/admin/scrapers`. Criar a nova rota com Design System Velzon, adicionar a navegação na Sidebar administrativa sob "Operações SaaS", implementar a persistência de configurações de conectores no SQLite via `AdminScraperRepository` e fornecer um Painel de Controle com ações de disparo global, disparo individual, toggles de ativação/desativação e expurgo operacional com diálogo de confirmação.

---

## Requirements Addressed

- **`REQ-87-01` (Rota Dedicada & Navegação da Central de Scrapers)**:
  - Criar a rota administrativa `/admin/scrapers` (`src/app/admin/scrapers/page.tsx`) com layout integrado ao Design System Velzon.
  - Atualizar a barra lateral (`AdminSidebar.tsx`) sob o agrupamento "Operações SaaS", inserindo o link "Central de Scrapers" com ícone `Cpu`.

- **`REQ-87-02` (Painel de Controle Operacional de Scrapers)**:
  - Implementar tabela `scraper_configs` no SQLite e repositório `AdminScraperRepository` com seed dos 36 conectores.
  - Criar rota de API `/api/admin/scraper/config` (GET e PATCH) para consulta e alternância de ativação de cada conector.
  - Atualizar `/api/admin/scraper/run` para aceitar `scraperName` opcional, permitindo disparo direcionado de um conector individual ou disparo de todo o pipeline.
  - Disponibilizar na interface da Central de Scrapers:
    - Card de Controle Operacional Global (Botão "Sincronizar Todos", indicador de status do pipeline, botão "Expurgar Vagas Rejeitadas").
    - Seletor rápido de conector para disparo individual ("Executar Conector Único").
    - Grid ou lista rápida de conectores com toggles de ativação instantânea (ligado/desligado) e feedback visual.

---

## Proposed Changes

### Component 1: Persistência & Repositório de Configuração de Scrapers

#### [MODIFY] [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar no `initDatabase()` a criação da tabela `scraper_configs`:
  ```sql
  CREATE TABLE IF NOT EXISTS scraper_configs (
    name TEXT PRIMARY KEY,
    is_enabled INTEGER DEFAULT 1,
    method TEXT NOT NULL,
    target_url TEXT,
    timeout_ms INTEGER DEFAULT 45000,
    updated_at TEXT NOT NULL
  );
  ```

#### [NEW] [src/db/adminScraperRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/adminScraperRepository.ts)
- Criar a interface `ScraperConfigEntry`:
  ```typescript
  export interface ScraperConfigEntry {
    name: string;
    is_enabled: number;
    method: 'playwright' | 'ssr' | 'cookie' | 'api';
    target_url: string | null;
    timeout_ms: number;
    updated_at: string;
  }
  ```
- Implementar métodos:
  - `getAllConfigs(): ScraperConfigEntry[]`
  - `getConfig(name: string): ScraperConfigEntry | null`
  - `toggleScraper(name: string, enabled: boolean): ScraperConfigEntry | null`
  - `seedDefaultConfigs(): void` (com a lista completa de conectores e seus métodos padrão)

---

### Component 2: Endpoints de Controle de Scrapers

#### [NEW] [src/app/api/admin/scraper/config/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/scraper/config/route.ts)
- Autenticação de sessão admin via cookie `admin_session` ou header.
- `GET`: Retorna `{ success: true, data: ScraperConfigEntry[] }`.
- `PATCH`: Recebe `{ name: string, is_enabled: boolean }`, valida, atualiza no repositório, grava log de auditoria via `logAdminAction` e retorna `{ success: true, data: updatedConfig }`.

#### [MODIFY] [src/app/api/admin/scraper/run/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/scraper/run/route.ts)
- Suportar `{ runId?: string, scraperName?: string }` no corpo da requisição.
- Quando `scraperName` for fornecido:
  - Passar env `SCRAPER_TARGET` ou argumento `--scraper` para o processo filho.
  - Gravar log informando disparo direcionado do conector.

#### [MODIFY] [src/index.ts](file:///home/moa-dev/projetos/buscavag/src/index.ts)
- Ler parâmetro `process.env.SCRAPER_TARGET` ou flag `--scraper`.
- Se configurado, orquestrar execução única chamando o scraper correspondente em vez do conjunto completo.

---

### Component 3: Navegação da Sidebar Administrativa

#### [MODIFY] [src/components/admin/layout/AdminSidebar.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/layout/AdminSidebar.tsx)
- Importar ícone `Cpu` de `lucide-react`.
- Adicionar `{ name: 'Central de Scrapers', href: '/admin/scrapers', icon: Cpu }` como primeiro item do grupo "Operações SaaS".

---

### Component 4: Página da Central de Scrapers

#### [NEW] [src/app/admin/scrapers/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/page.tsx)
- Utilizar `AdminLayout`, `VelzonCard`, `VelzonBadge`, `VelzonStatWidget`.
- **Cabeçalho**: Título "Central de Scrapers & Ingestão", status geral de conectores e data da última sincronização.
- **Painel de Controle Principal (Cards de Ação Rápida)**:
  - Botão "Sincronizar Todos os Conectores" com feedback visual de carregamento.
  - Seletor dropdown e botão "Executar Conector Único".
  - Botão de perigo "Expurgo de Vagas Rejeitadas" com modal de confirmação e contador de itens eliminados.
- **Painel de Toggles de Ativação**:
  - Lista/Grid com badges de método (`PLAYWRIGHT`, `SSR`, `COOKIE`, `API`).
  - Switch interativo para ligar/desligar cada conector em tempo real com chamada à API `/api/admin/scraper/config`.
  - Botão de execução individual rápida ao lado de cada conector.

---

### Component 5: Suíte Determinística de Testes

#### [NEW] [src/test-phase87.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase87.ts)
- Testes automatizados executáveis com `npx tsx src/test-phase87.ts`:
  1. Verificação da existência de `src/app/admin/scrapers/page.tsx`.
  2. Verificação da existência de item "Central de Scrapers" na `AdminSidebar.tsx`.
  3. Verificação da tabela `scraper_configs` e inicialização do `AdminScraperRepository`.
  4. Teste do seed de conectores (quantidade mínima esperada >= 30).
  5. Teste de toggle de ativação via `AdminScraperRepository`.
  6. Teste de consulta e atualização na rota `/api/admin/scraper/config`.
  7. Teste de validação de payload no endpoint `/api/admin/scraper/run` (global e unitário).
  8. Teste de integridade do expurgo seguro.

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase87.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
   npx tsx src/test-phase86.ts
   npx tsx src/test-phase85.ts
   npx tsx src/test-phase84.ts
   npx tsx src/test-phase83.ts
   npx tsx src/test-phase82.ts
   npx tsx src/test-phase81.ts
   npx tsx src/test-phase80.ts
   npx tsx src/test-phase79.ts
   npx tsx src/test-phase78.ts
   npx tsx src/test-phase77.ts
   npx tsx src/test-phase76.ts
   ```
3. **Regressão Global de Testes**:
   ```bash
   npm test
   ```
4. **Verificação de Tipagem TypeScript**:
   ```bash
   npx tsc --noEmit
   ```

### Manual / Browser Verification
1. Acessar `/admin/scrapers` e verificar renderização limpa no tema claro e escuro.
2. Clicar no link "Central de Scrapers" na Sidebar e testar navegação.
3. Alternar um toggle de conector (ex: `Gupy` ou `LinkedIn`) e verificar persistência.
4. Acionar botão de disparo individual e checar início da execução.
5. Acionar botão de expurgo e verificar diálogo de confirmação.
