# Phase 71 Plan: Extração Fiel de Currículo & Barreira Anti-Falso-Positivo

## Vision & Goal
Eliminar falsos-positivos na extração de currículos (em especial a captura indevida da linguagem "C" provocada por marcadores, hífens ou quebras de texto), introduzir higienização profunda do texto extraído de arquivos PDF/DOCX e aplicar validação estrita de schema sobre a saída da IA (Gemini) e do motor heurístico.

---

## User Stories & Requirements Addressed
- **`REQ-01`**: Higienização de texto extraído de PDF/DOCX (união de hífens no final de linha, normalização de quebras de linha e remoção de ruídos de formatação).
- **`REQ-02`**: Refatoração do prompt do Gemini e da heurística de fallback no Scrapling Engine (`cv_analyzer.py`), impedindo a captura de "C" isolado sem contexto inequívoco de programação.
- **`REQ-03`**: Validação e sanitização rigorosa de schema no retorno estruturado de IA/heurística, garantindo consistência entre `hard_skills`, `primary_stack` e `secondary_stack`.

---

## Proposed Changes

### Component 1: Engine Python (Scrapling Engine - `cv_parser.py` & `cv_analyzer.py`)

#### [MODIFY] [cv_parser.py](file:///home/moa-dev/projetos/buscavag/src/services/scrapling-engine/app/services/cv_parser.py)
- Aprimorar a função `clean_extracted_text(text: str)`:
  - Adicionar regex para juntar hífens de separação silábica em final de linha (ex: `desenvol-\nvimento` -> `desenvolvimento`).
  - Corrigir quebras de palavras com termos compostos/tecnológicos (ex: `Node.\njs` -> `Node.js`, `React\nNative` -> `React Native`, `C\n++` -> `C++`).
  - Tratar ruídos de marcadores de tópico (`•`, `*`, `o `, `- `) para evitar colisão com identificadores de tecnologia.

#### [MODIFY] [cv_analyzer.py](file:///home/moa-dev/projetos/buscavag/src/services/scrapling-engine/app/services/cv_analyzer.py)
- **Filtro Estrito para Linguagem "C"**:
  - Remover `"C"` ingênuo de `TECH_KEYWORDS`.
  - Adicionar regra de busca contextual estrita para a linguagem C via regex dedicado (`REGEX_C_LANG = r"\b(linguagem c|ansi c|c/c\+\+|c \/ c\+\+|c e c\+\+|c\+\+/c|desenvolvedor c)\b"`).
  - Garantir que "C" só seja adicionado às hard skills se essa regex de contexto seguro der match.
- **Prompt do Gemini Refinado**:
  - Incluir instrução explícita na prompt de `analyze_cv_with_gemini` proibindo a inclusão da linguagem "C" como skill a menos que o currículo especifique 'Linguagem C', 'ANSI C' ou 'C/C++'.
- **Sanitização de Schema**:
  - Criar a função `sanitize_analysis_output(data: dict) -> dict` que:
    1. Remove duplicatas preservando maiúsculas/minúsculas padronizadas.
    2. Garante que `primary_stack` e `secondary_stack` sejam subconjuntos válidos de `hard_skills`.
    3. Filtra letras isoladas ("c", "a", "b", "e") que possam ter vazado em `hard_skills`.

### Component 2: Runner de Testes & Validação de Suíte (`test-phase71.ts`)

#### [NEW] [test-phase71.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase71.ts)
- Criar suíte de testes end-to-end para validar a Phase 71:
  - Teste 1: Higienização de texto PDF/DOCX simulando hífens no final de linha e quebras em `Node.\njs`.
  - Teste 2: Análise de CV sintético contendo marcadores de tópicos "c)", expressões como "c/ 5 anos de exp" e validar que a linguagem "C" NÃO é extraída.
  - Teste 3: Análise de CV sintético de programador C++ / ANSI C e confirmar que "C" / "C++" são extraídos corretamente quando há contexto real.
  - Teste 4: Validação de consistência do schema (`primary_stack` e `secondary_stack` contidos em `hard_skills`).

---

## Verification Plan

### Automated Tests
- Executar o runner de testes dedicado da Phase 71:
  ```bash
  npx tsx src/test-phase71.ts
  ```
- Executar os testes existentes do projeto para garantir não-regressão:
  ```bash
  npm test
  ```
- Validar build e checagem de tipos TypeScript:
  ```bash
  npm run build:next
  ```

### Manual Verification
- Testar upload de um CV com marcadores de lista através da interface ou via chamada API e verificar a análise retornada.
