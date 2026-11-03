# Phase 93 Context: Normalizador Geográfico Canônico & Parser Estrito de UF

## Contexto & Motivação
Atualmente, as vagas no BuscaVagas possuem localizações gravadas como strings livres e heterogêneas na coluna `location` (ex.: `"Florianópolis - SC"`, `"Florianópolis, SC"`, `"Santa Catarina"`, `"São José"`, `"São Paulo - São Paulo"`, `"Barueri"`, `"Remoto / Brasil"`, `null`).

Essa heterogeneidade causa problemas críticos:
1. **Vazamento e Colisão de Siglas de UF**: Filtros de texto com `LIKE '%sc%'` ou `LIKE '%sp%'` colidem com palavras da língua portuguesa (ex.: "javascript", "fiscal", "spring", "especialista").
2. **Ambiguidade de Municípios Homônimos**: Nomes como *"São José"* colidem entre Santa Catarina (São José da Grande Florianópolis), São Paulo (*São José dos Campos* / *São José do Rio Preto*) e Paraná (*São José dos Pinhais*).
3. **Falta de Indexação e Filtros Confiáveis**: Sem colunas dedicadas de Cidade e Estado, não é possível filtrar com precisão de 100% "todas as vagas de Santa Catarina" ou "apenas vagas presenciais de Florianópolis".

A **Phase 93** implementa o **Normalizador Geográfico Canônico**, adiciona colunas estruturadas e indexadas (`city` e `state`) na tabela `jobs`, resolve desambiguações de municípios homônimos com base no contexto da plataforma e cria filtros geográficos de alta fidelidade na API e na interface.

---

## Decisões Técnicas Travadas (Decisions Locked)

### 1. Estruturação Geográfica no Banco SQLite
- **Colunas Dedicadas e Indexadas**:
  - Adicionar colunas `city TEXT` e `state TEXT` na tabela `jobs`.
  - Criar índices: `idx_jobs_city` e `idx_jobs_state` para pesquisas em tempo $O(1)$.
  - A coluna `location` existente é padronizada para o formato canônico:
    - Vagas com Cidade e Estado: `"Florianópolis, SC"`
    - Vagas apenas com Estado: `"Santa Catarina"`
    - Vagas 100% remotas: `"Remoto"`
    - Vagas sem dados locais ou de abrangência nacional: `"Remoto / Brasil"`

### 2. Parser Geográfico Canônico (`src/utils/geoParser.ts`)
- **Mapeamento de UFs Brasileiras**:
  - Tabela com as 27 UFs do Brasil e seus respectivos nomes por extenso.
  - Validação estrita por word boundary (`\bSC\b`, `\bSP\b`, etc.) e normalização de diacríticos para evitar falsos positivos.
- **Desambiguação Inteligente de Municípios Homônimos (Ex.: São José)**:
  - **Prioridade Contextual por Plataforma**:
    - Se a vaga for coletada por conector regional de SC (`sao_jose`, `vagas_floripa`, `emprega_palhoca`, `vagas_sc`) ou contiver referências explícitas à Grande Florianópolis/SC, atribui automaticamente: `city: "São José", state: "SC"`.
    - Se o texto citar "Campos", "Rio Preto" ou a sigla `SP`, atribui `state: "SP"` e a respectiva cidade.
    - Se citar "Pinhais" ou `PR`, atribui `city: "São José dos Pinhais", state: "PR"`.
- **Dicionário de Polos Tecnológicos**:
  - Reconhecimento automático de municípios catarinenses mesmo quando a UF estiver omitida no texto (Florianópolis, Palhoça, Biguaçu, Joinville, Blumenau, Itajaí, Balneário Camboriú, Criciúma, Chapecó, Tubarão, Brusque, Lages, Jaraguá do Sul).
  - Reconhecimento dos principais polos nacionais (São Paulo, Campinas, Curitiba, Porto Alegre, Belo Horizonte, Rio de Janeiro, Brasília, Recife, Salvador, Fortaleza).

### 3. Filtros Geográficos no Repositório e na API (`src/db/repository.ts` & `src/app/api/jobs/route.ts`)
- **Parâmetros Estruturados**:
  - `JobFilterOptions` ganha suporte aos campos `state?: string` e `city?: string`.
  - Compatibilidade com `location`: quando o usuário filtrar por `location = 'SC'`, o repositório filtra `state = 'SC' OR location = 'Remoto'`.
  - Quando filtrar por uma cidade (ex: `city = 'Florianópolis'`), filtra diretamente `city = 'Florianópolis'`.
  - Elimina definitivamente filtros vulneráveis como `LIKE '%sc%'`.

### 4. Experiência de Filtro na Interface (`src/app/(public)/jobs/page.tsx`)
- **Dropdown Inteligente e Organizado por Grupos**:
  - `🌐 100% Remoto (Nacional)`
  - **Grupo Santa Catarina (Foco Principal)**:
    - `🏔️ Todo o Estado de Santa Catarina (SC)`
    - `📍 Florianópolis / Floripa`
    - `📍 São José`
    - `📍 Palhoça`
    - `📍 Joinville`
    - `📍 Blumenau`
    - `📍 Balneário Camboriú / Itajaí`
  - **Grupo Outras Capitais & Polos**:
    - `🏙️ São Paulo (SP)`
    - `🏙️ Curitiba (PR)`
    - `🏙️ Porto Alegre (RS)`
    - `🏙️ Rio de Janeiro (RJ)`
    - `🏙️ Belo Horizonte (MG)`
    - `🏙️ Brasília (DF)`

### 5. Higienização e Normalização Retroativa do Acervo
- **Script Utilitário `src/scripts/normalize-locations.ts`**:
  - Percorre as 438 vagas existentes no SQLite `buscavag.db`.
  - Aplica o `parseCanonicalLocation(job.location, job.platform, job.title, job.description)`.
  - Popula `city` e `state` e reescreve `location` para o formato canônico.
  - Regenera o fingerprint das vagas para manter a consistência com a Phase 92.

---

## Critérios de Sucesso
- `src/test-phase93.ts` executado com 100% de aprovação comprovando:
  - Validação estrita de UFs (`SC` $\ne$ `SP` $\ne$ `PR` $\ne$ `RJ`).
  - Desambiguação correta de "São José" com base na plataforma e termos contextuais.
  - Formatação canônica de strings de localização (`"Cidade, UF"` e `"Remoto"`).
  - Consulta exata por `state` e `city` no `JobRepository`.
  - Confirmação de que todas as vagas no banco `buscavag.db` estão com dados geográficos normalizados.
- Regressão global (`npm test`) com 9/9 suítes aprovadas e 0 erros em `npx tsc --noEmit`.
