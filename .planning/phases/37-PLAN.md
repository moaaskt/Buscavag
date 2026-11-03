# Phase 37 Plan: Pipeline de IA no Motor Python (`scrapling-engine`)

## Metadata
- **Phase**: 37
- **Milestone**: 10 (Painel do Candidato, Análise de CV com IA e Fundação SaaS)
- **Scope**: Desenvolver a inteligência de extração e análise de currículos (PDF/Word) no microserviço Python (`scrapling-engine`), estruturando dados com IA generativa (Gemini/fallback inteligente) e conectando com o painel do candidato no frontend.
- **Dependencies**: Fase 36 (Upload e persistência de currículos no banco de dados e autenticação de usuários)

---

## Objective
Criar um pipeline automatizado de inteligência artificial no microserviço Python (`scrapling-engine`) capaz de processar arquivos PDF e DOCX enviados pelos candidatos, extrair texto estruturado e executar uma análise profunda com LLM (Gemini 2.5 / 1.5). 
A IA irá:
1. Detectar o cargo principal e o nível de senioridade real inferido das experiências.
2. Identificar e categorizar Hard Skills (linguagens, frameworks, bancos de dados, cloud, DevOps, IoT/Hardware) e Soft Skills.
3. Gerar um Resumo Executivo profissional e destacar Pontos Fortes do candidato.
4. Fornecer Dicas Consultivas e Recomendações ATS para aumentar a taxa de conversão em processos seletivos.
5. Integrar a análise de forma transparente no backend TypeScript e no frontend do Painel do Candidato (`/candidate`), permitindo a sincronização automática das habilidades com o perfil.

---

## Detailed Task Breakdown

### Task 1: Módulos de Extração e Análise de CV no Python (`scrapling-engine`)
- **Dependências**: Adicionar `pypdf`, `python-docx` e `google-genai` (ou cliente REST Gemini) em `src/services/scrapling-engine/requirements.txt`.
- **Arquivo**: `src/services/scrapling-engine/app/services/cv_parser.py`
  - Implementar extração de texto limpo a partir de buffers ou arquivos `.pdf` e `.docx`.
  - Tratamento de quebras de linha, remoção de ruídos e contagem de métricas (palavras, seções detectadas).
- **Arquivo**: `src/services/scrapling-engine/app/services/cv_analyzer.py`
  - Integração com API do Google Gemini com prompt estruturado em formato JSON rigoroso.
  - Fallback heurístico e regex inteligente caso chave de API não esteja presente ou ocorra timeout.
  - Modelo de dados:
    - `detected_role`: string
    - `detected_seniority`: string ('Estágio' | 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista / Tech Lead')
    - `hard_skills`: string[]
    - `soft_skills`: string[]
    - `summary`: string
    - `strengths`: string[]
    - `improvement_tips`: string[]
    - `raw_text_preview`: string

### Task 2: Endpoints FastAPI no Motor Python
- **Arquivo**: `src/services/scrapling-engine/app/schemas.py`
  - Definir schemas Pydantic: `CVParseRequest`, `CVParseResponse`, `CVAnalyzeRequest`, `CVAnalyzeResponse`.
- **Arquivo**: `src/services/scrapling-engine/app/main.py`
  - `POST /cv/parse`: Extração rápida de texto a partir de arquivo enviado ou caminho local.
  - `POST /cv/analyze`: Análise completa de IA a partir de arquivo ou texto bruto com métricas de tempo de execução.

### Task 3: Atualização do Repositório e Schemas no SQLite
- **Arquivo**: `src/db/index.ts`
  - Adicionar colunas na tabela `candidate_resumes`:
    - `ai_analysis TEXT` (JSON estruturado com o resultado da análise)
    - `analyzed_at TEXT` (Timestamp da última análise)
- **Arquivo**: `src/db/candidateRepository.ts`
  - Métodos `updateResumeAnalysis(userId: string, analysis: any)` e `getResumeAnalysis(userId: string)`.

### Task 4: Ponte TypeScript e Endpoints de Análise de CV
- **Arquivo**: `src/services/pythonBridge.ts`
  - Adicionar métodos `analyzeCV(filePath: string, text?: string)` no `PythonBridgeClient` com tratamento de timeout e fallback.
- **Rotas API Next.js**:
  - `POST /api/candidate/analyze-cv`: Lê o currículo atual do usuário logado, chama a análise de IA, persiste o JSON de resultado no SQLite e retorna ao cliente.
  - `GET /api/candidate/analyze-cv`: Retorna o histórico de análise salvo para o usuário.
  - `POST /api/candidate/sync-skills`: Permite ao candidato mesclar automaticamente as skills detectadas pela IA em seu perfil profissional com 1 clique.

### Task 5: Interface do Usuário (Frontend) no Painel do Candidato
- **Arquivo**: `src/app/candidate/page.tsx` (Aba "Meu Currículo"):
  - Botão "Analisar com IA" com estados dinâmicos e spinner animado.
  - Painel de Resultados de IA:
    - Badge de Senioridade Inferida e Cargo Detectado.
    - Badges interativos de Hard Skills e Soft Skills detectadas com botão "Adicionar ao Perfil".
    - Card de Resumo Profissional Gerado por IA.
    - Seção de Pontos Fortes e Dicas Consultivas para ATS.
    - Timestamp de quando a análise foi realizada.

### Task 6: Testes Automatizados e Validação
- **Arquivo**: `src/test-cv-ai-pipeline.ts`
  - Teste automatizado criando arquivos PDF/DOCX de teste, submetendo para o pipeline e validando a extração, análise de IA e persistência no banco.
- Executar `npx tsc --noEmit` para conformidade estrita de tipos.

---

## Verification Plan

1. **Testes do Motor Python**: Testar extração e endpoint `/cv/analyze` via script e chamadas HTTP.
2. **Tipagem e Build TypeScript**: `npx tsc --noEmit` sem erros.
3. **Teste de Integração End-to-End**: `npx tsx src/test-cv-ai-pipeline.ts` validando o fluxo completo de upload → análise de IA → salvamento no SQLite → leitura no perfil.
4. **Validação Visual**: Acessar `/candidate`, enviar currículo, disparar a análise por IA e verificar a renderização dos feedbacks e badges de skills.
