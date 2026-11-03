# Phase 92 Summary: Matriz de Deduplicação Inteligente (Fingerprinting Multi-Fonte)

## Resumo Executivo
A **Phase 92** implementou e consolidou a **Matriz de Deduplicação Inteligente** do BuscaVagas. Anteriormente, o identificador de vaga dependia estritamente da URL da fonte raspada (`generateJobHash(url, company, title, platform)`), o que causava a criação de múltiplos registros duplicados no banco SQLite sempre que a mesma oportunidade era anunciada em múltiplos canais (ex.: LinkedIn, Indeed, Gupy, Recrutae, Catho).

Com a introdução do algoritmo determinístico de fingerprinting (`hash(slug(titulo) + '|' + slug(empresa) + '|' + slug(cidade_uf))`) e sua integração com a tabela `jobs` indexada no SQLite, o sistema agora unifica oportunidades idênticas independentemente da fonte, poupando tokens de inteligência artificial na ingestão, eliminando redundâncias visuais no Kanban do candidato e restaurando a precisão analítica do mercado. Além disso, todas as 530 vagas preexistentes no banco foram processadas, expurgando 92 cópias redundantes e consolidando 438 vagas únicas com integridade de 100%.

---

## Entregas Realizadas

### 1. Algoritmo de Fingerprinting Determinístico (`REQ-92-01`)
- **[src/utils/fingerprint.ts](file:///home/moa-dev/projetos/buscavag/src/utils/fingerprint.ts)**:
  - `cleanText(text: string)`: Converte texto para minúsculas, remove diacríticos/acentos via decomposição NFD e apara espaçamento.
  - `slugifyTitle(title: string)`: Limpeza semântica de cargo que elimina ruídos como `[Vaga]`, `[Remoto]`, `[Freela]`, `(PCD)`, `Vaga PCD`, `Candidatar-se` (mesmo concatenado no final da palavra), pontuações e gera slug alfanumérico uniforme.
  - `slugifyCompany(company: string)`: Limpeza de razão social eliminando sufixos corporativos como `Ltda`, `S.A.`, `SA`, `ME`, `EPP`, `Brasil` e prefixos de plataformas agregadoras (`Facebook:`, etc.).
  - `slugifyLocation(location?: string | null)`: Padronização canônica de regimes remotos (`"Remoto"`, `"Home Office"` $\rightarrow$ `"remoto"`) e desambiguação geográfica de cidades e estados com substituição de nomes por extenso por siglas de UF (`"Florianópolis - SC"`, `"Florianópolis, SC"`, `"Florianópolis / Santa Catarina"` $\rightarrow$ `"florianopolis-sc"`).
  - `generateJobFingerprint(title, company, location)`: Geração determinística de hash SHA-256 de 64 caracteres a partir da string canônica `${slugTitle}|${slugCompany}|${slugLocation}`.
  - `getJobFingerprintDetails(...)`: Retorna metadados detalhados de cada componente para auditoria e telemetria.

### 2. Schema SQLite & Indexação de Performance (`REQ-92-02`)
- **[src/types/job.ts](file:///home/moa-dev/projetos/buscavag/src/types/job.ts)**:
  - Adicionado campo opcional `fingerprint?: string` em `ProcessedJobSchema` e `ProcessedJob`.
- **[src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)**:
  - Adicionada coluna `fingerprint TEXT` na DDL de criação da tabela `jobs`.
  - Criado índice de busca instantânea: `CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);`.
  - Migração retrocompatível automática em `initDatabase()` aplicando `ALTER TABLE jobs ADD COLUMN fingerprint TEXT;` em bancos legados.

### 3. Barreira de Deduplicação no Repositório e Ingestão (`REQ-92-03`)
- **[src/db/repository.ts](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts)**:
  - Atualizado método `exists(url, company, title, platform, location)` para consultar `SELECT 1 FROM jobs WHERE id = ? OR url = ? OR fingerprint = ?`.
  - Criado método `findByFingerprint(fingerprint: string): ProcessedJob | null`.
  - Atualizado método `insert(...)` para calcular, persistir e retornar a coluna `fingerprint`.
  - Atualizado método `mapRowToJob` para carregar `fingerprint: row.fingerprint || undefined`.
- **[src/index.ts](file:///home/moa-dev/projetos/buscavag/src/index.ts)**:
  - Passagem de `job.location` na chamada a `repo.exists(...)`.
  - Descarte antecipado de vagas duplicadas antes da chamada ao Hermes IA, economizando requisições e latência.
  - Registro de auditoria no `ScraperLogger`: `[DEDUPLICAÇÃO FINGERPRINT] Vaga já cadastrada via outra fonte ou URL: "${job.title}" (${job.company})`.
  - Nova métrica `duplicateFilteredCount` computada nas estatísticas do ciclo de scraping.

### 4. Utilitário de Migração Retroativa e Higienização de Banco (`REQ-92-04`)
- **[src/scripts/deduplicate-jobs.ts](file:///home/moa-dev/projetos/buscavag/src/scripts/deduplicate-jobs.ts)**:
  - Script que percorreu todo o acervo do SQLite `buscavag.db`:
    - Atualizou 530 registros com fingerprints calculados.
    - Identificou 37 grupos de duplicatas cross-fonte e geradas por testes.
    - Preservou a vaga primária (priorizando maior score e antiguidade) e removeu 92 clones redundantes via Hard Delete.
    - Consolidou 438 vagas únicas no banco SQLite, com garantia de 0 duplicatas remanescentes.

---

## Verificação e Testes

- **Suíte Determinística da Phase 92**: [src/test-phase92.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase92.ts)
  - **43 testes executados e 43 aprovados (100% de sucesso)**:
    - Normalização de slugs de títulos com tags `[Vaga]`, `(Remoto)`, `(PCD)` e termos grudados (`Candidatar-se`).
    - Normalização de empresas com sufixos jurídicos (`Ltda.`, `S.A.`, `ME`) e prefixos agregadores (`Facebook:`).
    - Normalização de localizações geográficas e modelos remotos.
    - Invariância do hash SHA-256 para diferentes representações da mesma vaga.
    - Detecção de existência no `repo.exists` para vagas submetidas a partir de fontes distintas (LinkedIn vs Indeed vs Recrutei).
    - Presença da coluna `fingerprint` e do índice `idx_jobs_fingerprint` no SQLite.
    - Confirmação de 0 duplicatas e 0 fingerprints nulos no banco.
- **Regressão de Fases Recentes**:
  - Fases 88, 89, 90 e 91 executadas e aprovadas com 100% de sucesso.
- **Regressão Global (`npm test`)**:
  - 9/9 suítes completas aprovadas com 100% de sucesso (Core Base DB, Kanban & Analytics, Candidate Auth, RBAC Control, Multi-Tenant Isolation, Kanban Inbox, Agnostic Parser, Pitch Dinâmico, Security & Resilience).
- **Tipagem Estrita**:
  - `npx tsc --noEmit` executado com 0 erros de compilação.

---

## Próximo Passo
- **Phase 93**: Normalizador Geográfico Canônico & Parser Estrito de UF (resolução de desambiguação de cidades homônimas e validação estrita da sigla da UF).
