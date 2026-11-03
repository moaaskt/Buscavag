# Phase 38 Plan: Algoritmo de Match Perfeito

## Metadata
- **Phase**: 38
- **Milestone**: 10 (Painel do Candidato, Análise de CV com IA e Fundação SaaS)
- **Scope**: Desenvolver o motor de cálculo de compatibilidade personalizado (Perfect Match Engine) que cruza as competências, senioridade, cargo alvo e preferências do candidato com o banco de vagas das 34 fontes, fornecendo ranking inteligente e interface de oportunidades recomendadas.
- **Dependencies**: Fase 36 (Autenticação e Perfil do Candidato) e Fase 37 (Extração de Dados do CV com IA)

---

## Objective
Criar um motor de pontuação e recomendação hiperpersonalizado que calcula em tempo real o percentual de aderência (`0-100%`) de cada vaga disponível no banco de dados para o perfil específico do candidato logado.
O algoritmo analisa:
1. **Aderência de Stack**: Cruzamento das habilidades do perfil e do currículo com os requisitos da vaga, destacando *habilidades correspondentes* e *lacunas técnicas (gaps)*.
2. **Alinhamento de Cargo & Título**: Afinidade semântica entre o cargo alvo/detectado e o título da vaga.
3. **Compatibilidade de Senioridade**: Validação do nível do candidato (Estágio, Júnior, Pleno, Sênior, Tech Lead) com as exigências da oportunidade.
4. **Modelo de Trabalho & Localização**: Cruzamento com as preferências do candidato (Remoto, Híbrido, Presencial).
5. **Apresentação e Usabilidade**: Aba dedicada no Painel do Candidato com filtros dinâmicos por score de match, badges de competências atendidas vs faltantes e feedback explicativo da IA.

---

## Detailed Task Breakdown

### Task 1: Motor de Cálculo do Match Perfeito (`CandidateMatcher`)
- **Arquivo**: `src/services/candidateMatcher.ts`
  - Implementar classe `CandidateMatcher` com métodos:
    - `calculateMatch(job: ProcessedJob | RawJob, candidate: CandidateContext): CandidateMatchResult`
    - `rankJobs(jobs: ProcessedJob[], candidate: CandidateContext, options?: MatchFilterOptions): RankedJobResult[]`
  - Estrutura de Retorno:
    - `overallMatchScore: number` (0 a 100)
    - `stackMatchScore: number` (0 a 100)
    - `roleMatchScore: number` (0 a 100)
    - `seniorityMatchScore: number` (0 a 100)
    - `locationMatchScore: number` (0 a 100)
    - `matchedSkills: string[]`
    - `missingSkills: string[]`
    - `matchReasoning: string`

### Task 2: Repositório & Otimização de Consultas de Match
- **Arquivo**: `src/db/candidateRepository.ts`
  - Adicionar método `getCandidateFullContext(userId: string)` que combina dados da tabela `candidate_profiles` e da tabela `candidate_resumes` (skills, cargo alvo, senioridade, modelos de trabalho).
  - Adicionar método `getRecommendedJobsForCandidate(userId: string, filters?: RecommendedJobsFilter)` que executa busca ponderada no SQLite e ranqueamento em memória.

### Task 3: Endpoints da API de Vagas Recomendadas
- **Arquivo**: `src/app/api/candidate/recommended-jobs/route.ts`
  - `GET`: Endpoint protegido que obtém o contexto do candidato autenticado, busca vagas ativas no banco, aplica o algoritmo de match e retorna a lista ordenada decrescente por score de compatibilidade, com suporte a filtros (`minMatch`, `search`, `workModel`, `platform`, `page`, `limit`).
- **Arquivo**: `src/app/api/candidate/match-stats/route.ts`
  - `GET`: Endpoint para métricas rápidas de compatibilidade (média de match, quantidade de vagas altamente compatíveis >= 75%, top tecnologias mais requisitadas para o perfil do candidato).

### Task 4: Interface do Usuário (Frontend) - Vagas Recomendadas no Painel
- **Arquivo**: `src/app/candidate/page.tsx`
  - Adicionar nova aba **"Vagas Recomendadas (Match IA)"** com:
    - Indicadores de resumo de match (ex: `Total de vagas compatíveis`, `Média de aderência`).
    - Barra de filtros: Slider/seletor de Match Mínimo (`>= 50%`, `>= 70%`, `>= 85%`), filtro por termo de busca, filtro por modalidade.
    - Grid de Cards de Vagas Recomendadas com:
      - Ring / Badge de Match (`95% Match`).
      - Lista de **Suas Habilidades Atendidas** (badges verdes).
      - Lista de **Requisitos Adicionais (Gaps)** (badges amarelos/neutros).
      - Explicação contextual de recomendação.
      - Botão de Favoritar / Salvar Vaga e Link direto para candidatura.
      - Estado vazio acolhedor caso o candidato ainda não tenha preenchido habilidades ou enviado CV.

### Task 5: Integração no Explorador Geral de Vagas (`/jobs`)
- **Arquivo**: `src/app/jobs/page.tsx` (ou card component de vaga):
  - Exibir badge sutil de Match Personalizado quando o usuário estiver logado.

### Task 6: Testes Automatizados e Validação
- **Arquivo**: `src/test-perfect-match.ts`
  - Teste automatizado com perfis variados (ex: Dev Jr React/Node, Dev Pleno Python/FastAPI, Dev Mobile Flutter) validando a precisão matemática do cálculo, detecção de gaps e ordenação correta das vagas.
- Executar `npx tsc --noEmit` para conformidade de tipos.

---

## Verification Plan

1. **Testes do Algoritmo**: Executar `npx tsx src/test-perfect-match.ts` garantindo que candidatos recebam notas altas para vagas de sua stack e notas baixas para stacks incompatíveis.
2. **Tipagem e Build**: `npx tsc --noEmit` sem erros.
3. **Validação de API**: Testar `GET /api/candidate/recommended-jobs` com diferentes filtros.
4. **Validação de UI**: Acessar o Painel do Candidato (`/candidate`) na aba "Vagas Recomendadas", testar os filtros de score de match, verificar a visualização de habilidades correspondentes vs lacunas e a ação de salvar vaga.
