# Phase 1: Core Setup & Shared Modules - Context & Decisions

## Context
Fase de configuração base e infraestrutura compartilhada para a aplicação Buscavag em Node.js com TypeScript e SQLite.

## Design Decisions
1. **Estrutura de Projeto**:
   - `src/config/`: Variáveis de ambiente e constantes.
   - `src/db/`: Instância do SQLite (via `better-sqlite3`) e scripts de migração/schema.
   - `src/types/`: Definição centralizada de interfaces como `RawJob` e `ProcessedJob`.
   - `src/utils/`: Utilitários compartilhados (como conversor de datas e normalizador de URLs).
2. **Schema SQLite**:
   - Tabela `jobs`: id (UUID/hash), url (UNIQUE), title, company, platform, description, published_at (ISO), score_ia, approved (boolean), notified (boolean), created_at.
3. **Gerenciamento de Dependências**:
   - Node.js LTS + `npm` ou `pnpm` + TypeScript (`tsconfig.json`).
