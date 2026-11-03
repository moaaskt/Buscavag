# Phase 60: Painel Admin & Analytics de Captura (/admin)

## 1. Objetivo
Criar a visualização de Analytics e o Monitor de Saúde (Health) dos scrapers (especialmente focando nos conectores novos, como o do Facebook Groups) dentro do Painel Administrativo.

## 2. Requisitos a Serem Atendidos
- **Distribuição de Vagas por Fonte**: Utilizar o `platformCounts` da API de Stats para exibir gráficos ou listas destacando de onde vêm as vagas capturadas (ex: mostrar que `facebook_groups` e `linkedin` trazem X% das vagas).
- **Monitor de Saúde dos Scrapers**: Analisar ciclos recentes de execução (`runs`), apontando taxa de sucesso e destacando Erros de Sessão/Cookie (importante para scrapers como o Facebook que dependem de autenticação).
- **Consolidação de Logs**: Aperfeiçoar o painel principal (`/admin`) incluindo um Widget rápido (Mini-Logs ou Alertas Recentes) que mostre os últimos avisos críticos, conectando com a página `/admin/logs` já existente.

## 3. Componentes Modificados
- `src/app/admin/page.tsx`: Inclusão da visualização de Fontes e do Monitor de Saúde.
- `src/app/api/admin/scraper/logs/route.ts` (ou chamadas no Frontend): Para buscar resumos de erros críticos e calcular métricas de sessão.
- **NOVOS COMPONENTES**:
  - `src/components/admin/PlatformDistribution.tsx`: Componente de UI para visualização de `platformCounts`.
  - `src/components/admin/ScraperHealthMonitor.tsx`: Componente de UI para exibir taxa de sucesso e alertas (focando em problemas de Cookie/Sessão).
