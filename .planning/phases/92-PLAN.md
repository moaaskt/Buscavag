# Phase 92 Plan: Matriz de Deduplicação Inteligente (Fingerprinting Multi-Fonte)

## Vision & Goal
Implementar uma matriz de deduplicação cross-plataforma baseada em fingerprint determinístico (`hash(slug(titulo) + slug(empresa) + slug(cidade_uf))`). O mecanismo impedirá que a mesma vaga raspada de múltiplas fontes (ex.: LinkedIn, Indeed, Recrutae, Gupy) crie registros duplicados no banco SQLite, desperdice chamadas ao Hermes IA ou polua os canais de alerta e o Kanban do candidato. A fase inclui a migração do schema SQLite com indexação de alta velocidade, barreira de deduplicação na ingestão, script de higienização retroativa e suíte determinística com 100% de cobertura.

---

## Requirements Addressed

- **`REQ-92-01` (Algoritmo de Fingerprinting Determinístico)**:
  - Criar [src/utils/fingerprint.ts](file:///home/moa-dev/projetos/buscavag/src/utils/fingerprint.ts) com funções puras e determinísticas:
    - `slugifyTitle(title: string)`: Normalização semântica de cargo (remoção de acentos, ruídos de scraper como `[Vaga]`, `[Remoto]`, `[Freela]`, `(PCD)`, `Candidatar-se`, pontuações e espaçamento).
    - `slugifyCompany(company: string)`: Normalização de empresa (remoção de acentos, sufixos jurídicos `ltda`, `s/a`, `sa`, `me`, `epp`, prefixos de scraper como `facebook:`).
    - `slugifyLocation(location?: string | null)`: Normalização de local (padronização de `"Remoto"`, `"Home Office"` para `"remoto"`, padronização de formatos cidade/estado como `"Florianópolis, SC"` e `"Florianópolis - SC"` para `"florianopolis-sc"`).
    - `generateJobFingerprint(title: string, company: string, location?: string | null)`: Geração do hash SHA-256 da tupla normalizada.
    - `getJobFingerprintDetails(...)`: Retorna detalhes dos slugs e hash para auditoria e logs.

- **`REQ-92-02` (Evolução do Schema SQLite & Indexação de Performance)**:
  - Atualizar [src/types/job.ts](file:///home/moa-dev/projetos/buscavag/src/types/job.ts): Adicionar campo opcional `fingerprint?: string` em `ProcessedJobSchema` e `ProcessedJob`.
  - Atualizar [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts):
    - Incluir coluna `fingerprint TEXT` na declaração `CREATE TABLE IF NOT EXISTS jobs`.
    - Criar índice: `CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);`.
    - Adicionar migração automática segura em `initDatabase()` para tabelas `jobs` já existentes que não possuam a coluna `fingerprint`.

- **`REQ-92-03` (Barreira de Deduplicação Multi-Fonte no Repositório e Ingestão)**:
  - Atualizar [src/db/repository.ts](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts):
    - Estender `exists(url: string, company: string, title: string, platform?: string, location?: string | null): boolean` para verificar existência tanto por `id` / `url` quanto por `fingerprint`.
    - Adicionar método `findByFingerprint(fingerprint: string): ProcessedJob | null`.
    - Atualizar `insert()` para calcular, persistir e retornar o `fingerprint`.
  - Atualizar [src/index.ts](file:///home/moa-dev/projetos/buscavag/src/index.ts):
    - Passar `job.location` para `repo.exists(job.url, job.company, job.title, job.platform, job.location)`.
    - Se a vaga já existir via fingerprint, registrar log informativo de deduplicação e contabilizar no resumo do ciclo de scraping, pulando imediatamente a avaliação semântica por IA.

- **`REQ-92-04` (Migração Retroativa & Deduplicação de Vagas Existentes)**:
  - Criar [src/scripts/deduplicate-jobs.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/deduplicate-jobs.ts):
    - Percorrer as 530 vagas existentes no SQLite `buscavag.db`.
    - Calcular e preencher o `fingerprint` das vagas onde estiver nulo.
    - Identificar registros com fingerprints duplicados gerados por fontes ou testes distintos.
    - Manter a vaga primária (mais antiga ou com maior score de IA) e excluir as cópias redundantes via hard delete.
    - Retornar objeto com métricas precisas: total analisado, fingerprints atribuídos, duplicatas removidas e vagas únicas preservadas.

- **`REQ-92-05` (Suíte Determinística de Testes)**:
  - Criar [src/test-phase92.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase92.ts) validando unitariamente normalização de slugs, invariância do hash para pequenas variações de grafia, bloqueio multi-fonte no `repo.exists()`, idempotência de persistência e higienização retroativa no SQLite.

---

## Proposed Changes

### Component 1: Utilitário de Fingerprinting
#### [NEW] [src/utils/fingerprint.ts](file:///home/moa-dev/projetos/buscavag/src/utils/fingerprint.ts)
- Implementar:
  - `cleanText(text: string): string`: Remove acentos (NFD), caracteres especiais e espaços múltiplos.
  - `slugifyTitle(title: string): string`: Remove ruídos recorrentes de scrapers e gera slug conciso.
  - `slugifyCompany(company: string): string`: Remove sufixos societários e gera slug da empresa.
  - `slugifyLocation(location?: string | null): string`: Padroniza localizações geográficas e remotas.
  - `generateJobFingerprint(title: string, company: string, location?: string | null): string`: Hash SHA-256 determinístico.

---

### Component 2: Tipos & Schema de Banco de Dados
#### [MODIFY] [src/types/job.ts](file:///home/moa-dev/projetos/buscavag/src/types/job.ts)
- Adicionar `fingerprint: z.string().optional()` em `ProcessedJobSchema`.

#### [MODIFY] [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar `fingerprint TEXT` na DDL de `CREATE TABLE IF NOT EXISTS jobs`.
- Adicionar `CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);`.
- Adicionar `{ name: 'fingerprint', type: 'TEXT' }` no array de migração automática `jobColumnsToAdd`.

---

### Component 3: Repositório & Pipeline de Ingestão
#### [MODIFY] [src/db/repository.ts](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts)
- Importar `generateJobFingerprint` de `../utils/fingerprint`.
- Atualizar `exists(...)` para calcular o fingerprint e consultar:
  ```sql
  SELECT 1 FROM jobs WHERE id = ? OR url = ? OR fingerprint = ?
  ```
- Atualizar `insert(...)` para calcular o fingerprint, incluí-lo na query `INSERT INTO jobs (..., fingerprint)` e retornar no objeto `ProcessedJob`.
- Adicionar método `findByFingerprint(fingerprint: string)`.

#### [MODIFY] [src/index.ts](file:///home/moa-dev/projetos/buscavag/src/index.ts)
- Chamar `repo.exists(job.url, job.company, job.title, job.platform, job.location)`.
- Adicionar contador `duplicateFilteredCount` no ciclo de scraping para quantificar e registrar em log a economia de processamento da IA por deduplicação.

---

### Component 4: Utilitário de Migração Retroativa
#### [NEW] [src/scripts/deduplicate-jobs.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/deduplicate-jobs.ts)
- Utilitário exportável e executável via CLI (`npx tsx src/scripts/deduplicate-jobs.ts`).
- Atualiza fingerprints vazios em lote no SQLite.
- Agrupa duplicatas por fingerprint e remove as redundâncias mantendo a vaga principal.

---

### Component 5: Suíte Determinística de Testes
#### [NEW] [src/test-phase92.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase92.ts)
- Casos de teste:
  1. Invariância de títulos com ruídos (`[Vaga] Dev Jr (Remoto)` == `Dev Jr`).
  2. Invariância de empresas com sufixos jurídicos (`Acme Tech Ltda.` == `Acme Tech`).
  3. Invariância de locais com pontuações distintas (`Florianópolis, SC` == `Florianópolis - SC`).
  4. Diferenciação de vagas com empresas ou títulos distintos.
  5. Detecção de vaga existente no `repo.exists` quando submetida com URLs e plataformas diferentes.
  6. Persistência e consulta por `findByFingerprint`.
  7. Validação do script de migração e confirmação de unicidade de fingerprints no banco `buscavag.db`.

---

## Verification Plan

### Automated Tests
1. **Execução da Suíte da Phase 92**:
   ```bash
   npx tsx src/test-phase92.ts
   ```
2. **Execução das Suítes das Fases Recentes (Regressão)**:
   ```bash
   npx tsx src/test-phase91.ts
   npx tsx src/test-phase90.ts
   npx tsx src/test-phase89.ts
   npx tsx src/test-phase88.ts
   ```
3. **Regressão Global de Testes**:
   ```bash
   npm test
   ```
4. **Validação Estrita de Tipagem**:
   ```bash
   npx tsc --noEmit
   ```

### Manual / Database Verification
- Confirmar no SQLite que todas as vagas possuem a coluna `fingerprint` preenchida e que não existem registros duplicados com o mesmo fingerprint.
