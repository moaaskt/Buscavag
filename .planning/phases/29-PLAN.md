# Phase 29 Plan: UI & Core Evaluator Enhancements

## Metadata
- **Phase**: 29
- **Milestone**: 8
- **Scope**: Ajuste Visual no JobCard, Hub Florianópolis no HermesEvaluator e Filtro de Cidade no Explorador de Vagas (`/jobs`).
- **Dependencies**: None

---

## Objective
Implementar as 3 melhorias de UI e Heurística de Avaliação do Milestone 8:
1. **Destaque colorido no feedback de IA do `JobCard`**: Realçar dinamicamente as palavras "Aprovada" em verde (`text-emerald-400 font-semibold`) e "Rejeitada" / "Descartada" em vermelho (`text-red-400 font-semibold`).
2. **Atualização da Heurística em `HermesEvaluator`**: Aceitar vagas tanto `Presencial` quanto `Híbrido` localizadas em Florianópolis/Floripa (`locationScore = 100`).
3. **Filtro de Localização/Cidade**: Adicionar seletor/filtro de Cidade no frontend `/jobs`, propagando para a API `GET /api/jobs` e o repositório SQLite `JobRepository`.

---

## Detailed Task Breakdown

### Task 1: Destaque de Status no Feedback de IA (`JobCard.tsx`)
- **Arquivo**: `src/components/JobCard.tsx`
- **Ações**:
  - Criar função utilitária `renderHighlightedReasoning(reasoning: string)` ou componente inline para parsear o texto de justificativa.
  - Se contiver "Aprovada" ou "aprovada", envelopar com `<span className="text-emerald-600 dark:text-emerald-400 font-semibold">...</span>`.
  - Se contiver "Rejeitada", "rejeitada", "Descartada" ou "descartada", envelopar com `<span className="text-rose-600 dark:text-rose-400 font-semibold">...</span>`.
  - Renderizar tanto no card padrão quanto nas áreas onde o feedback de IA for exibido.

### Task 2: Hub Florianópolis em `HermesEvaluator`
- **Arquivo**: `src/services/hermesEvaluator.ts`
- **Ações**:
  - No prompt da IA (`evaluate`):
    - Atualizar a regra: Híbrido ou Presencial em **Florianópolis (SC)** ou **Floripa**: `locationScore = 100`.
    - Manter rejeição (`locationScore = 0`) apenas para vagas presenciais/híbridas fora da Grande Florianópolis (São Paulo, Curitiba, BH, etc.).
  - Na avaliação heurística (`evaluateHeuristic`):
    - Se `isFlorianopolis`, definir `isLocationAccepted = true`, `locationScore = 100` e `locationReason = isHybrid ? 'Híbrido em Florianópolis (SC)' : 'Presencial em Florianópolis (SC)'`.

### Task 3: Filtro de Cidade / Localização (`JobRepository`, API e `/jobs`)
- **Arquivos**:
  - `src/db/repository.ts`: Atualizar `JobFilterOptions` com `location?: string` e adicionar cláusula `AND LOWER(location) LIKE ?` na query `getAllJobs`.
  - `src/app/api/jobs/route.ts`: Extrair parâmetro `location` da URL e repassar para `getAllJobs({ ..., location })`.
  - `src/app/jobs/page.tsx`:
    - Adicionar estado `const [locationFilter, setLocationFilter] = useState('all')`.
    - Adicionar select de **Localização / Cidade** na barra de filtros (Opções: Todas as Localizações, Remoto, Florianópolis, São José, Palhoça, Outras).
    - Incluir no `fetchJobs` e no botão de `clearFilters`.

---

## Verification Plan
1. **TypeScript Typecheck**: Executar `npx tsc --noEmit` para garantir ausência de erros de tipagem.
2. **Teste Unitário da Heurística**: Executar script de teste validando que `location = "Florianópolis"` resulta em `locationScore = 100` e `isJuniorFullStack = true`.
3. **Validação Visual no JobCard**: Verificar que textos com "Aprovada" e "Rejeitada" renderizam com as cores corretas.
4. **Validação do Filtro de Cidade**: Testar a query `/api/jobs?location=florianopolis` e conferir filtragem no banco.
