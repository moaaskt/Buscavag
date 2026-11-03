# Phase 89 Plan: Terminal de Logs SSE Dedicado & Ferramentas de Auditoria

## Vision & Goal
Integrar um Terminal de Logs SSE dedicado e persistente na Central de Scrapers (`/admin/scrapers`). O terminal consumirá o fluxo de eventos em tempo real (`/api/admin/scraper/stream`), fornecendo acompanhamento imediato de execuções globais ou individuais com auto-scroll inteligente, filtros visuais por severidade (INFO, WARN, ERROR), busca textual em tempo real no buffer e botões para limpeza e exportação (.txt e .json).

---

## Requirements Addressed

- **`REQ-89-01` (Terminal de Logs SSE Dedicado & Streaming em Tempo Real)**:
  - Desenvolver o componente `src/components/admin/scrapers/ScraperLiveTerminal.tsx` conectado ao endpoint `/api/admin/scraper/stream`.
  - Exibir indicador visual de conexão SSE em tempo real (Ao Vivo / Conectado / Reconectando).
  - Implementar auto-scroll inteligente com toggle manual de pausar/retomar rolagem.
  - Embutir o terminal na página `/admin/scrapers` com design escuro de console (`#11141e` / `#0d1117`) alinhado ao Design System Velzon.

- **`REQ-89-02` (Filtros de Log, Busca Textual & Exportação)**:
  - Adicionar botões/pílulas de filtro de severidade (`TODOS`, `INFO`, `WARN`, `ERROR`) com contadores atualizados em tempo real.
  - Implementar barra de busca textual que filtra instantaneamente as linhas de log no buffer.
  - Adicionar botão de limpeza do buffer de logs em tela.
  - Implementar função de exportação rápida para arquivo de texto (`.txt`) e formato JSON estruturado (`.json`).
  - Desenvolver suíte determinística de testes `src/test-phase89.ts`.

---

## Proposed Changes

### Component 1: Componente do Terminal de Logs SSE

#### [NEW] [src/components/admin/scrapers/ScraperLiveTerminal.tsx](file:///home/moa-dev/projetos/buscavag/src/components/admin/scrapers/ScraperLiveTerminal.tsx)
- Conexão via `EventSource('/api/admin/scraper/stream')` com reconexão automática e tratamento de heartbeat.
- Buffer em memória limitado aos últimos 1.000 eventos para otimizar desempenho e consumo de memória DOM.
- Interface estilo terminal Velzon:
  - Cabeçalho: Título com ícone `Terminal`, status de conexão SSE (indicador pulsante), chips de filtro por severidade com contagem (`TODOS`, `INFO`, `WARN`, `ERROR`), campo de busca por palavra-chave, botão de auto-scroll, botão de limpar e menu de exportação.
  - Janela de Logs: Renderização de linhas com timestamp formatado (`HH:mm:ss`), badge de severidade com cores semânticas (INFO azul, WARN amarelo, ERROR vermelho), badge com o nome do scraper e mensagem legível.
  - Ações de Exportação:
    - `exportAsTxt()`: gera arquivo `scraper-logs-[timestamp].txt`.
    - `exportAsJson()`: gera arquivo `scraper-logs-[timestamp].json`.
  - Ação de Limpeza: `clearBuffer()`.
  - Controle de rolagem: `autoScroll` com `scrollIntoView({ behavior: 'smooth' })`.

---

### Component 2: Integração na Central de Scrapers

#### [MODIFY] [src/app/admin/scrapers/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/scrapers/page.tsx)
- Importar e renderizar `<ScraperLiveTerminal />` na página `/admin/scrapers`.
- Posicionar o terminal entre os Cards de Ação Operacional e a Tabela de Telemetria de Conectores.
- Suportar modo colapsável/expansível para manter a flexibilidade visual da página.

---

### Component 3: Suíte Determinística de Testes

#### [NEW] [src/test-phase89.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase89.ts)
- Testes automatizados executáveis com `npx tsx src/test-phase89.ts`:
  1. Verificação da existência física de `src/components/admin/scrapers/ScraperLiveTerminal.tsx`.
  2. Verificação da existência e conformidade da rota SSE `src/app/api/admin/scraper/stream/route.ts`.
  3. Verificação da integração do `ScraperLiveTerminal` na página `src/app/admin/scrapers/page.tsx`.
  4. Teste de lógica de filtragem por nível de severidade (ALL, INFO, WARN, ERROR).
  5. Teste de lógica de busca textual por termo no buffer de mensagens.
  6. Teste da função de geração de exportação de logs em formato `.txt`.
  7. Teste da função de geração de exportação de logs em formato `.json`.
  8. Teste de controle de limite de buffer (capacidade máxima anti-leak).

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase89.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
   npx tsx src/test-phase88.ts
   npx tsx src/test-phase87.ts
   npx tsx src/test-phase86.ts
   npx tsx src/test-phase85.ts
   npx tsx src/test-phase84.ts
   npx tsx src/test-phase83.ts
   npx tsx src/test-phase82.ts
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
1. Acessar `/admin/scrapers` e verificar a presença do terminal de streaming.
2. Iniciar um disparo de conector e acompanhar as mensagens aparecendo ao vivo no terminal.
3. Testar os filtros de severidade (`INFO`, `WARN`, `ERROR`) e verificar filtragem em tempo real.
4. Digitar uma palavra-chave no campo de busca do terminal e checar filtragem instantânea.
5. Clicar no botão "Exportar (.txt)" e "Exportar (.json)" e verificar download correto do arquivo.
