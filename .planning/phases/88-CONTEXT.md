# Phase 88 Context: Tabela de Monitoramento de Conectores & Métricas em Tempo Real

## Contexto & Motivação
Na Phase 87, a Central de Scrapers (`/admin/scrapers`) foi inaugurada com layout Velzon, persistência de configurações de conectores no SQLite e controles operacionais (disparo global, unitário e expurgo).
No entanto, os administradores precisam de visibilidade operacional profunda: saber exatamente quais conectores estão saudáveis, quais falharam na última rodada, qual a latência média de resposta de cada fonte e quantas oportunidades foram coletadas e consolidadas no banco de dados.

A **Phase 88** transforma a listagem de conectores em uma **Tabela de Monitoramento em Tempo Real & Métricas de Conectores**.

## Decisões Técnicas
- **Modelo de Métricas Unificado**: Interface `ScraperMonitoringItem` combinando configuração (`scraper_configs`), histórico recente de execução (`scraper_logs`) e volume de dados ingeridos (`jobs`).
- **Estados Operacionais em Tempo Real**:
  - `running`: O conector iniciou uma rodada nos últimos 2 minutos sem log de término ou falha (com pulso visual/spinner).
  - `success`: A última execução concluiu sem erros dentro do limiar de timeout.
  - `failed`: A última execução disparou erro de seletor, 403/bloqueio ou timeout (com tooltip ou modal de diagnóstico com a mensagem do erro).
  - `disabled`: Conector desativado administrativamente pelo toggle.
  - `idle`: Conector ativo aguardando próxima rodada agendada ou disparo manual.
- **Métricas de Desempenho**:
  - Latência da última execução (em ms e formatada em segundos, ex: `1.7s`).
  - Vagas capturadas na rodada mais recente.
  - Vagas totais consolidadas no banco de dados por plataforma/conector.
  - Timestamp relativo da última execução (ex: "Há 4 min", "Hoje às 21:03").
- **Endpoint Dedicado**: `GET /api/admin/scraper/metrics` fornecendo tanto a lista completa quanto um resumo executivo (`total`, `active`, `running`, `success`, `failed`, `avgLatencyMs`, `totalJobsCollected`).
- **Experiência em Tempo Real na UI**:
  - Switch de Auto-Refresh (polling dinâmico a cada 10s) com indicador visual de status sincronizado.
  - Filtros avançados por Status (`Todos`, `Em Execução`, `Sucesso`, `Com Falhas`, `Desativados`) e por Método (`Playwright`, `SSR`, `API`, `Cookie`).
  - Modal de diagnóstico técnico com os últimos logs de cada conector.
