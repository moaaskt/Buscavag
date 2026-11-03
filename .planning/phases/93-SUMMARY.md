# Phase 93 Summary: Normalizador Geográfico Canônico & Parser Estrito de UF

## Resumo Executivo
A **Phase 93** implementou e consolidou o **Normalizador Geográfico Canônico** no BuscaVagas. Anteriormente, as localizações eram gravadas em texto livre e heterogêneo na coluna `location` (ex.: `"Florianópolis - SC"`, `"Florianópolis, SC"`, `"Santa Catarina"`, `"São José"`, `"Remoto / Brasil"`), o que gerava colisões severas em consultas de texto como `LIKE '%sc%'` (atingindo falsos positivos como "javascript", "fiscal", "especialista"), gerava ambiguidade de municípios homônimos (como *São José* em SC vs SP vs PR) e impedia consultas instantâneas e indexadas por cidade e estado.

Com a criação do motor [`src/utils/geoParser.ts`](file:///home/moa-dev/projetos/buscavag/src/utils/geoParser.ts), a adição das colunas `city TEXT` e `state TEXT` com índices dedicados `idx_jobs_city` e `idx_jobs_state` no SQLite, o suporte a filtros estruturados no `JobRepository` e na API `/api/jobs`, e a reorganização da UI pública de vagas (`/jobs`), o sistema agora possui precisão geográfica determinística, alta velocidade de consulta em tempo $O(1)$ e 100% do acervo histórico normalizado.

---

## Entregas Realizadas

### 1. Motor de Parsing Geográfico Canônico (`REQ-93-01` & `REQ-93-02`)
- **[src/utils/geoParser.ts](file:///home/moa-dev/projetos/buscavag/src/utils/geoParser.ts)**:
  - `BRAZILIAN_UFS`: Mapeamento das 27 UFs brasileiras (sigla e nome por extenso).
  - `cleanGeoText(text)`: Normalização de diacríticos e caixa baixa via NFD.
  - `extractStateUF(text)`:
    - Extração estrita por nome por extenso de estado, com ordenação por tamanho decrescente para priorizar nomes compostos (*Mato Grosso do Sul* antes de *Mato Grosso*; *Rio Grande do Norte/Sul* antes de *Rio de Janeiro/Grande*).
    - Extração estrita de siglas de 2 letras com delimitadores de palavra (`\b(SC|SP|...)\b`), impedindo falsos positivos com palavras como "javascript", "fiscal", "spring", "especialista".
  - `parseCanonicalLocation(location, platform, title, description)`:
    - Desambiguação contextual de municípios homônimos (*São José*):
      - Plataformas regionais de SC (`sao_jose`, `vagas_floripa`, `emprega_palhoca`, `vagas_sc`) e menções à Grande Florianópolis são resolvidas como `city: "São José", state: "SC"`.
      - Menções a "Campos", "Rio Preto" ou UF `SP` são resolvidas como `state: "SP"`.
      - Menções a "Pinhais" ou UF `PR` são resolvidas como `state: "PR"`.
    - Dicionário de polos catarinenses (Florianópolis, Palhoça, Biguaçu, Joinville, Blumenau, Itajaí, Balneário Camboriú, Criciúma, Chapecó, Tubarão, etc.) com inferência automática de `state: 'SC'`.
    - Dicionário de grandes polos nacionais (São Paulo, Campinas, Curitiba, Porto Alegre, Belo Horizonte, Rio de Janeiro, Brasília, etc.).
    - Detecção estrita de modalidades remotas (`isRemote = true`), padronizando para `"Remoto"` ou `"Remoto / Brasil"`.
    - Formatação canônica: `"Cidade, UF"`, `"Estado"`, `"Remoto"` ou `"Remoto / Brasil"`.

### 2. Schema SQLite & Indexação de Performance (`REQ-93-03`)
- **[src/types/job.ts](file:///home/moa-dev/projetos/buscavag/src/types/job.ts)**:
  - Adicionadas propriedades opcionais `city?: string` e `state?: string` em `RawJobSchema` e `ProcessedJobSchema`.
- **[src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)**:
  - Adicionadas colunas `city TEXT` e `state TEXT` na instrução `CREATE TABLE IF NOT EXISTS jobs`.
  - Criados índices dedicados:
    - `CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);`
    - `CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);`
  - Inclusão em `jobColumnsToAdd` para migração automática e segura em bancos preexistentes.

### 3. Filtros Geográficos Estruturados no Repositório & API (`REQ-93-04` & `REQ-93-05`)
- **[src/db/repository.ts](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts)**:
  - `JobFilterOptions` estendido com `city?: string` e `state?: string`.
  - `insert()` agora executa `parseCanonicalLocation()` durante a ingestão, preenchendo `city`, `state` e reescrevendo `location` com a string canônica.
  - `mapRowToJob()` atualizado para carregar `city` e `state`.
  - `getAllJobs()` otimizado:
    - Filtro exato por `city` (`city = ?`).
    - Filtro exato por `state` (`state = ? OR (state IS NULL AND location LIKE '%remoto%')`).
    - Tratamento estruturado do parâmetro legado `location` com mapeamento para as cidades canônicas (ex: `sao_jose` -> `city = 'São José'`, `florianopolis` -> `city = 'Florianópolis'`, `sc` -> `state = 'SC'`), erradicando consultas frágeis com `LIKE '%sc%'`.
- **[src/app/api/jobs/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/jobs/route.ts)**:
  - Captura e repasse dos parâmetros `city` e `state` na rota `/api/jobs` GET.

### 4. Experiência de Filtro na UI Pública (`REQ-93-05`)
- **[src/app/(public)/jobs/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/(public)/jobs/page.tsx)**:
  - Dropdown de localização reformulado com agrupamentos semânticos via `<optgroup>`:
    - `🌐 100% Remoto (Nacional)`
    - **🏔️ Santa Catarina (Foco Principal)**: Todo o Estado de SC, Florianópolis / Floripa, São José, Palhoça, Joinville, Blumenau, Balneário Camboriú / Itajaí.
    - **🏙️ Outras Capitais & Polos**: São Paulo (SP), Curitiba (PR), Porto Alegre (RS), Rio de Janeiro (RJ), Belo Horizonte (MG), Brasília (DF).

### 5. Script Retroativo e Normalização do Acervo (`REQ-93-06`)
- **[src/scripts/normalize-locations.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/normalize-locations.ts)**:
  - Processou todas as vagas do SQLite `buscavag.db`:
    - 809 vagas analisadas e atualizadas com `city`, `state`, `location` e `fingerprint`.
    - 280 vagas identificadas com cidade canônica.
    - 327 vagas identificadas com Estado (UF).
    - 434 vagas classificadas em modalidade remota.
    - Sincronização e expurgo subsequente das duplicatas recém-descobertas via `deduplicate-jobs.ts`.

---

## Verificação e Testes

- **Suíte Determinística da Phase 93**: [src/test-phase93.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase93.ts)
  - **124 testes executados e 124 aprovados (100% de sucesso)**:
    - Validação de todas as 27 UFs brasileiras (extenso e sigla delimitada).
    - Bloqueio estrito de falsos positivos com termos técnicos e corporativos ("JavaScript", "Fiscal", "Spring Boot", etc.).
    - Desambiguação de "São José" em Santa Catarina (conectores regionais), São Paulo (Campos/Rio Preto) e Paraná (Pinhais).
    - Inferência de cidades e polos tecnológicos catarinenses e capitais nacionais.
    - Padronização canônica de vagas remotas.
    - Validação das colunas `city`, `state` e índices `idx_jobs_city`, `idx_jobs_state` no SQLite.
    - Inserção e filtros de consultas no `JobRepository`.
    - Execução e auditoria do banco após o script de normalização.
- **Suítes de Regressão Anteriores**:
  - `src/test-phase92.ts`: 43/43 aprovados ✓
  - `src/test-phase91.ts`: 59/59 aprovados ✓
  - `src/test-phase90.ts`: 19/19 aprovados ✓
- **Regressão Global (`npm test`)**: 9/9 suítes orquestradas aprovadas (100% de sucesso) ✓
- **Validação de Tipagem (`npx tsc --noEmit`)**: 0 erros de compilação TypeScript ✓
