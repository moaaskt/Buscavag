# Phase 1: Research & Technical Approach

## Recommended Technical Stack & Libraries
- **TypeScript & Node.js**: Configuração com `tsx` para desenvolvimento rápido e `tsc` para build de produção.
- **SQLite Database**: Utilizar `better-sqlite3` para acesso síncrono ultra-rápido ou `sqlite3` assíncrono.
- **Data Validation & Schemas**: Utilizar `zod` para validação de tipos em tempo de execução das vagas coletadas.
- **Hash / Deduplicação**: Gerar hashes com `crypto` nativo do Node.js (MD5/SHA256 da URL normalizada + Empresa).

## Key Patterns
- Interface unificada `RawJob` e `ProcessedJob`.
- Repository pattern simples para encapsular operações do SQLite (`JobRepository`).
