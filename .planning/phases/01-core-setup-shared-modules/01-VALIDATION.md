# Validation Strategy for Phase 1

## Automated Tests
- Testar inicialização do banco de dados SQLite e tabelas.
- Testar métodos do `JobRepository`: inserção de vaga, busca por hash/URL e verificação de deduplicação.
- Testar utilitários de tratamento de string/URL e parsing de datas relativas.

## Verification Commands
```bash
npm test
```
