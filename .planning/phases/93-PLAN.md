# Phase 93 Plan: Normalizador Geográfico Canônico & Parser Estrito de UF

## Vision & Goal
Implementar o **Normalizador Geográfico Canônico** no BuscaVagas para erradicar a heterogeneidade e ambiguidades da coluna `location`. O mecanismo adicionará colunas estruturadas e indexadas (`city` e `state`) na tabela `jobs` do SQLite, resolverá colisões de siglas de UF (eliminando consultas vulneráveis como `LIKE '%sc%'`), implementará desambiguação inteligente de municípios homônimos (como *São José* em SC vs SP vs PR com base no conector e contexto) e fornecerá filtros geográficos de alta fidelidade na API e na interface pública de vagas, acompanhado de script de normalização retroativa do acervo e suíte determinística com 100% de aprovação.

---

## Requirements Addressed

- **`REQ-93-01` (Parser e Dicionário Canônico de UFs e Polos Tecnológicos)**:
  - Criar [src/utils/geoParser.ts](file:///home/moa-dev/projetos/buscavag/src/utils/geoParser.ts) contendo:
    - Tabela completa com as 27 UFs do Brasil (siglas e nomes por extenso normalizados).
    - Mapeamento estrito com word boundary (`\bSC\b`, `\bSP\b`, etc.) e insensibilidade a diacríticos para evitar falsos positivos com palavras como "javascript", "fiscal" ou "spring".
    - Dicionário de polos tecnológicos de Santa Catarina com atribuição automática de `state: 'SC'` mesmo quando a UF estiver omitida no texto (Florianópolis, Palhoça, Biguaçu, São José, Joinville, Blumenau, Itajaí, Balneário Camboriú, Criciúma, Chapecó, Tubarão, Brusque, Lages, Jaraguá do Sul).
    - Dicionário de capitais e principais polos nacionais (São Paulo, Campinas, Curitiba, Porto Alegre, Belo Horizonte, Rio de Janeiro, Brasília, Recife, Salvador, Fortaleza, etc.).
    - Detecção estrita de modalidades remotas (`isRemote = true`), normalizando para `location: "Remoto"`.

- **`REQ-93-02` (Desambiguação Contextual de Homônimos & Normalização de Strings)**:
  - Implementar no parser a função `parseCanonicalLocation(rawLocation?: string | null, platform?: string, title?: string, description?: string): CanonicalLocation`:
    - Se a localização for `"São José"` e o conector for regional catarinense (`sao_jose`, `vagas_floripa`, `emprega_palhoca`, `vagas_sc`) ou contiver termos da Grande Florianópolis/SC no título ou descrição, classifica como `city: "São José", state: "SC"`.
    - Se o texto indicar "Campos", "Rio Preto" ou a sigla `SP`, classifica para a respectiva cidade paulista com `state: "SP"`.
    - Se o texto indicar "Pinhais" ou `PR`, classifica para `"São José dos Pinhais"` com `state: "PR"`.
    - Normalização canônica da string `location`:
      - Vaga com Cidade e Estado: `"Florianópolis, SC"`
      - Vaga apenas com Estado: `"Santa Catarina"`
      - Vaga 100% remota: `"Remoto"`
      - Vaga sem localização ou abrangência nacional genérica: `"Remoto / Brasil"`

- **`REQ-93-03` (Evolução do Schema SQLite & Indexação de Performance)**:
  - Atualizar [src/types/job.ts](file:///home/moa-dev/projetos/buscavag/src/types/job.ts):
    - Adicionar `city?: string` e `state?: string` em `RawJobSchema`, `ProcessedJobSchema` e respectivos tipos.
  - Atualizar [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts):
    - Incluir colunas `city TEXT` e `state TEXT` na instrução `CREATE TABLE IF NOT EXISTS jobs`.
    - Criar índices de alta performance:
      - `CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);`
      - `CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);`
    - Adicionar migração automática segura em `initDatabase()` para adicionar `city` e `state` caso ainda não existam no banco ativo.

- **`REQ-93-04` (Filtros Geográficos Estruturados no Repositório & Ingestão)**:
  - Atualizar [src/db/repository.ts](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts):
    - Estender `JobFilterOptions` com `city?: string` e `state?: string`.
    - Atualizar `insert()` para executar `parseCanonicalLocation` na ingestão da vaga, persistindo `city`, `state` e a `location` canônica no SQLite.
    - Atualizar `mapRowToJob()` para mapear `city: row.city || undefined` e `state: row.state || undefined`.
    - Atualizar `getAllJobs()`:
      - Suporte a filtro direto por `state` (ex: `state = ?`).
      - Suporte a filtro direto por `city` (ex: `city = ?`).
      - Quando o parâmetro legado `location` for fornecido:
        - Se for `"remoto"`: filtrar vagas com `state IS NULL AND (location LIKE '%Remoto%' OR location LIKE '%Brasil%')`.
        - Se for uma sigla de UF (ex.: `"SC"`, `"SP"`): filtrar `(state = ? OR location = 'Remoto')`.
        - Se for slug de cidade (ex.: `"florianopolis"`, `"sao_jose"`, `"palhoca"`): buscar pela cidade canônica correspondente (`city = 'Florianópolis'`, `city = 'São José'`, etc.).
      - Eliminar definitivamente cláusulas frágeis como `LIKE '%sc%'`.

- **`REQ-93-05` (API de Vagas & Experiência de Filtro na Interface Pública)**:
  - Atualizar [src/app/api/jobs/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/jobs/route.ts):
    - Capturar `city` e `state` dos query parameters (`searchParams`) e repassar para `repo.getAllJobs()`.
  - Atualizar [src/app/(public)/jobs/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/(public)/jobs/page.tsx):
    - Reformular o dropdown de filtro geográfico com agrupamento semântico (`<optgroup>`):
      - **🌐 Remoto Nacional**: `100% Remoto (Nacional)`
      - **🏔️ Polo Santa Catarina (Foco Principal)**:
        - `Todo o Estado de Santa Catarina (SC)`
        - `Florianópolis (SC)`
        - `São José (SC)`
        - `Palhoça (SC)`
        - `Joinville (SC)`
        - `Blumenau (SC)`
        - `Balneário Camboriú / Itajaí (SC)`
      - **🏙️ Outras Capitais & Polos Tecnológicos**:
        - `São Paulo (SP)`
        - `Curitiba (PR)`
        - `Porto Alegre (RS)`
        - `Rio de Janeiro (RJ)`
        - `Belo Horizonte (MG)`
        - `Brasília (DF)`
    - Sincronizar seleção com a rota `/api/jobs` enviando os parâmetros canônicos.

- **`REQ-93-06` (Higienização e Normalização Retroativa do Acervo)**:
  - Criar [src/scripts/normalize-locations.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/normalize-locations.ts):
    - Percorrer todas as vagas existentes no SQLite `buscavag.db`.
    - Executar `parseCanonicalLocation()` com base no `location` atual, `platform`, `title` e `description`.
    - Atualizar `city`, `state` e reescrever `location` para o padrão canônico no banco.
    - Recalcular o `fingerprint` da vaga utilizando o local normalizado para preservar a integridade da Phase 92.
    - Emitir relatório consolidado de auditoria: total de vagas analisadas, vagas com cidade/estado preenchidos, vagas remotas identificadas e fingerprints sincronizados.

- **`REQ-93-07` (Suíte Determinística de Testes)**:
  - Criar [src/test-phase93.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase93.ts) com asserções estritas validando:
    1. Parser de todas as 27 UFs brasileiras (extenso e sigla) com bloqueio anti-falso-positivo (`SC` não colide com `javascript` ou `fiscal`).
    2. Resolução determinística de homônimos (*São José* em SC vs SP vs PR).
    3. Normalização canônica de strings heterogêneas (`"Florianópolis - SC"` -> `"Florianópolis, SC"`).
    4. Inferência de polos tecnológicos catarinenses sem UF explícita.
    5. Schema SQLite (presença de colunas `city`, `state` e índices `idx_jobs_city`, `idx_jobs_state`).
    6. Consultas no repositório por `city`, `state` e compatibilidade canônica do parâmetro `location`.
    7. Execução do script retroativo e garantia de 100% de normalização do acervo real.

---

## Proposed Changes

### Component 1: Motor de Parsing Geográfico Canônico
#### [NEW] [src/utils/geoParser.ts](file:///home/moa-dev/projetos/buscavag/src/utils/geoParser.ts)
- Definir interfaces:
  ```ts
  export interface CanonicalLocation {
    city?: string;
    state?: string;
    isRemote: boolean;
    canonicalLocation: string;
  }
  ```
- Constantes e dicionários:
  - `UF_MAP`: Mapeamento de siglas de UF para nomes canônicos e vice-versa.
  - `SC_CITIES`: Dicionário de cidades catarinenses com normalização acentuada/não-acentuada.
  - `MAJOR_CITIES`: Dicionário de grandes capitais e polos nacionais.
- Funções exportadas:
  - `cleanGeoText(text: string): string`
  - `extractStateUF(text: string): string | undefined`
  - `parseCanonicalLocation(location?: string | null, platform?: string, title?: string, description?: string): CanonicalLocation`

---

### Component 2: Tipos & Schema de Banco de Dados
#### [MODIFY] [src/types/job.ts](file:///home/moa-dev/projetos/buscavag/src/types/job.ts)
- Adicionar `city: z.string().optional()` e `state: z.string().optional()` em `RawJobSchema` e `ProcessedJobSchema`.

#### [MODIFY] [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar `city TEXT` e `state TEXT` no DDL de `CREATE TABLE IF NOT EXISTS jobs`.
- Adicionar `CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);` e `idx_jobs_state ON jobs(state);`.
- Adicionar `{ name: 'city', type: 'TEXT' }` e `{ name: 'state', type: 'TEXT' }` em `jobColumnsToAdd`.

---

### Component 3: Repositório & API
#### [MODIFY] [src/db/repository.ts](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts)
- Importar `parseCanonicalLocation` de `../utils/geoParser`.
- Estender `JobFilterOptions` com `city?: string` e `state?: string`.
- Atualizar `insert()` para salvar `city`, `state` e `location` canônico.
- Atualizar `mapRowToJob()` para retornar `city` e `state`.
- Atualizar `getAllJobs()` com filtragem precisa em `city` e `state`.

#### [MODIFY] [src/app/api/jobs/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/jobs/route.ts)
- Obter `city` e `state` dos query parameters e repassar para `getAllJobs()`.

---

### Component 4: Interface Pública do Usuário
#### [MODIFY] [src/app/(public)/jobs/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/(public)/jobs/page.tsx)
- Reorganizar o select de localização com os grupos semânticos de Santa Catarina, Remoto e Polos Nacionais.
- Garantir que o valor selecionado seja repassado para a busca de vagas sem perdas ou ambiguidades.

---

### Component 5: Script Retroativo & Suíte de Testes
#### [NEW] [src/scripts/normalize-locations.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/normalize-locations.ts)
- Script de varredura do banco `buscavag.db`, aplicando o normalizador canônico e persistindo `city`, `state` e `fingerprint`.

#### [NEW] [src/test-phase93.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase93.ts)
- Suíte automatizada cobrindo todos os requisitos da Phase 93 de ponta a ponta.

---

## Verification Plan

### Automated Tests
1. **Execução da Suíte da Phase 93**:
   ```bash
   npx tsx src/test-phase93.ts
   ```
2. **Execução das Suítes das Fases Anteriores (Regressão de Integridade)**:
   ```bash
   npx tsx src/test-phase92.ts
   npx tsx src/test-phase91.ts
   npx tsx src/test-phase90.ts
   ```
3. **Regressão Global de Testes**:
   ```bash
   npm test
   ```
4. **Verificação Estrita de Tipos**:
   ```bash
   npx tsc --noEmit
   ```

### Manual / Database Verification
- Validar via SQLite que todas as vagas de `buscavag.db` possuem `state` ou indicação explícita de `Remoto`, com índices `idx_jobs_city` e `idx_jobs_state` operacionais.
