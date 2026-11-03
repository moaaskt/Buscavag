# Phase 60: Painel Admin & Analytics de Captura (/admin)

Nesta fase, estendemos o Painel Administrativo existente com widgets de analytics e monitoramento operacional para os scrapers.

## Alterações Realizadas

### 1. PlatformDistribution (`src/components/admin/PlatformDistribution.tsx`)
Componente que consome o `platformCounts` já disponível na API `/api/stats` e o renderiza como uma lista ranqueada com barras de progresso nativas em CSS. Cada fonte é apresentada com o `PlatformBadge` (reutilizado da Fase 59), número absoluto de vagas e porcentagem relativa ao total. As barras usam gradiente emerald→teal com animação suave e hover interativo.

### 2. ScraperHealthMonitor (`src/components/admin/ScraperHealthMonitor.tsx`)
Componente autônomo que faz fetch dos ciclos recentes de execução (`runs`) e dos logs de erros das últimas 24h. Calcula automaticamente o status de saúde:
- **Saudável**: Taxa de erros < 10% nos últimos ciclos.
- **Instável**: Taxa de erros entre 10%-30%.
- **Crítico**: Taxa de erros > 30% ou detecção de erros de sessão/cookie.

**Alerta de Autenticação**: O componente escaneia as mensagens de erro recentes por palavras-chave como "cookie", "session", "login", "unauthorized", "401" e "403". Caso encontre, exibe um banner vermelho dedicado alertando sobre a necessidade de atualizar os cookies (especificamente relevante para o scraper do Facebook Groups que depende de cookies de sessão).

Também exibe os 5 ciclos mais recentes com data, total de logs e contagem de erros.

### 3. Integração no Dashboard (`src/app/admin/page.tsx`)
- **Coluna Esquerda**: O `ScraperHealthMonitor` foi adicionado logo abaixo da seção "Auditoria & Logs", proporcionando visibilidade imediata do estado operacional.
- **Coluna Direita**: O `PlatformDistribution` foi inserido abaixo do "System Overview" de estatísticas gerais, exibindo qual percentual de vagas vem de cada fonte.

Build TypeScript validado sem erros (`npx tsc --noEmit`).
