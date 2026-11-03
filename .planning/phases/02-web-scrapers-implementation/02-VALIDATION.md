# Phase 2 Validation Strategy

## Tests
- Testar execução isolada de cada scraper (LinkedIn, Gupy, Indeed, Google Jobs).
- Validar se os dados extraídos atendem ao schema `RawJob`.
- Garantir que apenas vagas publicadas nos últimos 5 dias sejam retornadas.

## Commands
```bash
npx tsx src/test-scrapers.ts
```
