# Phase 19: API Base para Bulk Delete e Sincronização

## Objetivo
Implementar os endpoints de backend necessários para:
1. Exclusão em lote (`DELETE /api/jobs` com `{ ids: string[] }`)
2. Acionamento de scraper em segundo plano (`POST /api/scraper/trigger`)

## Contexto & Arquitetura
- **DELETE /api/jobs**:
  - Aceita body JSON `{ ids: string[] }`
  - Utiliza `JobRepository.deleteJobs(ids)`
  - Retorna `{ success: true, count: number }` ou erro 400/404/500
- **POST /api/scraper/trigger**:
  - Dispara o processo do scraper desacoplado (detached `spawn`)
  - Retorna imediatamente `{ success: true, message: 'Scraper iniciado em background com sucesso.' }`

## Status dos Requisitos
- [x] ACT-05: Rota de API para exclusão em massa (`DELETE /api/jobs`)
- [x] SCR-01: Rota de API para acionamento de scraper (`POST /api/scraper/trigger`)

## Testes & Validação
1. Validar métodos no repositório `JobRepository.deleteJobs`
2. Validar rotas de API via script de teste automatizado / compilação TypeScript
