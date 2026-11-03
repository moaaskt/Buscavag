# Phase 89 Context: Terminal de Logs SSE Dedicado & Ferramentas de Auditoria

## Contexto & Motivação
Nas fases 87 e 88, a Central de Scrapers (`/admin/scrapers`) recebeu a governança de conectores e a tabela de monitoramento em tempo real com telemetria de latência e contadores de vagas.
Contudo, para que os operadores possam acompanhar o ciclo de ingestão de forma verdadeiramente viva e autônoma, é imprescindível um **Terminal de Streaming SSE Integrado**.

Atualmente, o monitoramento de logs ficava oculto em modais flutuantes (`ScraperTerminalModal`) ou em rotas separadas (`/admin/logs`). A **Phase 89** implementa o visualizador de stream SSE em tempo real embutido diretamente na Central de Scrapers, munido de ferramentas de auto-scroll inteligente, filtros de severidade, busca textual instantânea e capacidade de exportação em `.txt` e `.json`.

## Decisões Técnicas
- **Componente Dedicado**: `src/components/admin/scrapers/ScraperLiveTerminal.tsx` encapsulando toda a conexão com `/api/admin/scraper/stream`, gerenciamento do buffer de logs (com limite de proteção para memória DOM), e controles de visualização.
- **Integração na Central de Scrapers**: Inserção direta do componente em `src/app/admin/scrapers/page.tsx`, permitindo acompanhar a saída dos conectores no exato momento em que um disparo (global ou individual) é executado.
- **Filtros e Busca em Tempo Real**:
  - Filtro por Severidade: Pílulas com contadores (`TODOS`, `INFO`, `WARN`, `ERROR`).
  - Filtro de Busca Textual: Localização instantânea de termos, nomes de vagas, empresas ou erros no buffer.
- **Auto-Scroll Inteligente**:
  - Rolagem automática enquanto novas mensagens chegam via SSE.
  - Pausa automática caso o usuário role para cima para inspecionar mensagens anteriores, com botão de retorno ao fim.
- **Exportação de Logs**:
  - Formato Texto (`.txt`): Linhas raw estruturadas `[TIMESTAMP] [LEVEL] [SCRAPER] MENSAGEM`.
  - Formato JSON (`.json`): Array de objetos estruturados com `id`, `runId`, `scraperName`, `level`, `message`, `timestamp`, `details`.
