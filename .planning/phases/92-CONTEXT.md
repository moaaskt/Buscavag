# Phase 92 Context: Matriz de Deduplicação Inteligente (Fingerprinting Multi-Fonte)

## Contexto & Motivação
O BuscaVagas agrega vagas de mais de 36 fontes distintas (LinkedIn, Indeed, Gupy, Catho, Glassdoor, Programathor, Facebook Groups, portais regionais de SC, etc.). Na prática, empresas contratantes publicam a mesmíssima oportunidade em múltiplos canais simultaneamente com links diferentes (ex.: link do ATS no Gupy, espelho no Indeed e post no LinkedIn).

Até a Phase 91, o identificador primário da vaga era derivado da URL (`generateJobHash(url, company, title, platform)`), o que fazia com que a mesma oportunidade gerasse registros duplicados no banco de dados SQLite, redundância no Kanban, envio repetido de alertas a candidatos e chamadas duplicadas à API de IA para reavaliar a mesma vaga.

A **Phase 92** implementa a **Matriz de Deduplicação Inteligente baseada em Fingerprinting Determinístico**, unificando oportunidades idênticas independentemente da fonte ou da URL de origem.

---

## Decisões Técnicas Travadas (Decisions Locked)

### 1. Algoritmo de Fingerprint Único Determinístico
- **Componentes do Fingerprint**:
  - Geração canônica: `hash(slug(titulo) + '|' + slug(empresa) + '|' + slug(cidade_uf))`
- **Normalização de Título (`slugifyTitle`)**:
  - Lowercase e remoção de acentos/diacríticos (`normalize('NFD')`).
  - Remoção de ruídos de scrapers: prefixos e sufixos como `[Vaga]`, `[Remoto]`, `[Freela]`, `(PCD)`, `Vaga PCD`, `Vaga Afirmativa`, `Candidatar-se`, etc.
  - Remoção de caracteres pontuais e condensação de espaços para hífens.
- **Normalização de Empresa (`slugifyCompany`)**:
  - Lowercase e remoção de acentos.
  - Remoção de sufixos corporativos e de redes: `ltda`, `s/a`, `s.a.`, `sa`, `me`, `epp`, `brasil`, prefixos de grupo como `facebook:` ou `grupo`.
- **Normalização de Localização (`slugifyLocation`)**:
  - Tratamento de vagas remotas/home office: qualquer menção a `"Remoto"`, `"Home Office"`, `"Anywhere"` ou variações resulta no slug canônico `"remoto"`.
  - Normalização de cidades e estados: uniformiza `"Florianópolis, SC"`, `"Florianópolis - SC"`, `"Florianópolis/SC"` para `"florianopolis-sc"`.
  - Quando omitida ou indefinida, atribui slug canônico `"remoto"` para evitar falsos negativos entre feeds nacionais.
- **Hash Criptográfico**:
  - Algoritmo SHA-256 sobre a tupla normalizada gerando uma chave determinística de 64 caracteres hexadecimais.

### 2. Schema SQLite & Indexação de Alta Performance
- **Coluna `fingerprint` na Tabela `jobs`**:
  - Coluna `fingerprint TEXT` adicionada no schema de criação em `src/db/index.ts`.
  - Índice dedicado: `CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);`
  - Migração retrocompatível executada automaticamente em `initDatabase()`.

### 3. Barreira de Deduplicação no Pipeline de Ingestão
- **Extensão de `JobRepository.exists`**:
  - Assinatura estendida: `exists(url: string, company: string, title: string, platform?: string, location?: string | null): boolean`.
  - Consulta otimizada no banco: `SELECT 1 FROM jobs WHERE id = ? OR url = ? OR fingerprint = ?`.
  - Suporte ao método `findByFingerprint(fingerprint: string): ProcessedJob | null`.
- **Prevenção de Avaliação Redundante da IA em `src/index.ts`**:
  - Se a vaga for identificada como duplicada via fingerprint:
    - O scraper pula imediatamente a avaliação do Hermes IA (economizando chamadas de API e tempo de execução).
    - Registra evento de auditoria no `ScraperLogger`: `[DEDUPLICAÇÃO FINGERPRINT] Vaga já cadastrada via outra fonte: "${job.title}" (${job.company})`.
    - Contabiliza nas estatísticas do ciclo (`duplicateFilteredCount++`).

### 4. Higienização e Deduplicação Retroativa do Banco
- **Script Utilitário `src/scripts/deduplicate-jobs.ts`**:
  - Percorre todas as vagas cadastradas no SQLite `buscavag.db`.
  - Calcula e preenche a coluna `fingerprint` para todas as vagas.
  - Para grupos com o mesmo fingerprint: mantém a vaga primária (mais antiga ou com maior score) e remove as duplicatas excedentes via hard delete (`DELETE FROM jobs WHERE id = ?`).
  - Emite relatório com total de vagas examinadas, fingerprints gerados e duplicatas eliminadas.

---

## Critérios de Sucesso
- A suíte determinística `src/test-phase92.ts` valida:
  - Estabilidade e invariância do fingerprint para títulos e empresas com pequenas variações de grafia, acentos, caixa alta/baixa e separadores de cidade.
  - Bloqueio imediato no `repo.exists(...)` quando a mesma vaga é submetida a partir de plataformas distintas (ex.: LinkedIn vs Indeed vs Recrutae).
  - Persistência e indexação correta da coluna `fingerprint` no banco SQLite.
  - Execução bem-sucedida do script de deduplicação retroativa, garantindo zero fingerprints duplicados no acervo.
- Todas as suítes de testes existentes (82 a 91) e o runner global (`npm test`) continuam passando com 100% de aprovação.
- `npx tsc --noEmit` executa com 0 erros de tipagem.
