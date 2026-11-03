# Phase 1 Plan: Core Setup & Shared Modules

## Goal
Configurar o ambiente do projeto Node.js com TypeScript, criar a estrutura base do repositório, definir as interfaces/tipos compartilhados (`RawJob`, `ProcessedJob`), configurar o banco de dados SQLite para deduplicação e utilitários compartilhados.

## Tasks

### Task 1: Package Initialization & TypeScript Setup
- Inicializar o `package.json`.
- Instalar dependências base: `typescript`, `tsx`, `@types/node`, `dotenv`, `zod`.
- Configurar `tsconfig.json` com boas práticas para Node.js.

### Task 2: Data Models & Interfaces
- Criar `src/types/job.ts` com as interfaces de `RawJob`, `ProcessedJob` e enums/tipos de fonte (`PlatformSource`).
- Adicionar validações Zod para sanitarizar entradas.

### Task 3: SQLite Database & Repository
- Instalar `better-sqlite3` e seus tipos.
- Criar `src/db/index.ts` para conexão e criação de tabelas (`jobs`).
- Criar `src/db/repository.ts` (`JobRepository`) com funções de inserção, busca por URL/hash e marcação de notificação.

### Task 4: Base Utilities
- Criar `src/utils/date.ts` para conversão de datas relativas (ex: "há 2 horas", "3 dias atrás") em `Date` ISO.
- Criar `src/utils/hash.ts` para geração de ID único por vaga.

## Verification
- Executar build TypeScript sem erros.
- Rodar script de teste de inserção/deduplicação no SQLite para validar o repositório.
