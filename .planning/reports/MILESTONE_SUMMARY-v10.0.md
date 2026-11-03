# Milestone 10 Summary: Painel do Candidato, Análise de CV com IA e Fundação SaaS

**Versão**: v10.0  
**Data de Conclusão**: 2026-09-09  
**Status**: 100% Concluído (Fases 36, 37, 38 e 39)

---

## 1. Overview & Propósito

O **Milestone 10** consolidou a transformação do Buscavag de um mero agregador/crawler de vagas para uma **plataforma SaaS B2C/B2B completa e inteligente para candidatos de tecnologia**.

Antes deste milestone, o Buscavag possuía um poderoso motor de scraping com 34 fontes sincronizadas (Milestone 9). O Milestone 10 adicionou:
1. Uma camada de **autenticação e portal exclusivo para o candidato** gerenciar carreira e currículos.
2. Um pipeline de **análise semântica e estruturação de CV com Inteligência Artificial** integrado ao microserviço Python (`scrapling-engine`).
3. Um motor de **Match Perfeito** em tempo real cruzando skills, senioridade e cargo com todo o banco de vagas.
4. Um modelo completo de **monetização e paywall SaaS** (Free vs Premium) com páginas de conversão e controles granulares.

---

## 2. Arquitetura do Sistema

```
                        ┌─────────────────────────────────────────┐
                        │      Next.js Frontend / App Router      │
                        │   - /candidate (Painel do Candidato)    │
                        │   - /pricing (Planos & Preços)          │
                        │   - /login & /register (Autenticação)   │
                        │   - UpgradeModal (Conversão Contextual) │
                        └────────────────────┬────────────────────┘
                                             │ HTTP / Server Actions
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │       Next.js API & Business Layer      │
                        │   - /api/auth/* (Sessão Segura Scrypt)  │
                        │   - /api/candidate/* (Perfis, CV, Match)│
                        │   - /api/saas/* (Assinaturas & Limites) │
                        │   - CandidateMatcher (Algoritmo Match)  │
                        └─────────────┬──────────────────┬────────┘
                                      │                  │
               RPC / HTTP Bridge      │                  │ SQLite DB (better-sqlite3)
                                      ▼                  ▼
┌───────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│     Microserviço Python (scrapling-engine)│   │  Tabelas do Banco de Dados:             │
│   - FastAPI + Pydantic                    │   │  - users (tiers Free / Premium)         │
│   - Parser PDF/DOCX (pypdf, python-docx)  │   │  - candidate_profiles                   │
│   - Gemini AI CV Analyzer (Fallback Regex)│   │  - candidate_resumes                    │
│   - POST /cv/parse & POST /cv/analyze     │   │  - user_saved_jobs                      │
└───────────────────────────────────────────┘   │  - jobs (34 fontes ativas)              │
                                                └─────────────────────────────────────────┘
```

---

## 3. Fases Entregues

### [Phase 36: Autenticação e Painel do Candidato](file:///home/moa-dev/projetos/buscavag/.planning/phases/36-PLAN.md)
- **Modelagem Relacional no SQLite**: Criação das tabelas `users`, `candidate_profiles`, `candidate_resumes` e `user_saved_jobs` gerenciadas por `CandidateRepository`.
- **Autenticação Segura**: Implementação de hash com `crypto.scryptSync`, tokens de sessão assinados e cookies `httpOnly`.
- **Portal do Candidato (`/candidate`)**: Interface moderna em abas com:
  - Edição de perfil profissional (cargo alvo, senioridade, pretensão salarial, modalidades).
  - Gestão de currículo com upload drag-and-drop de PDF/Word.
  - Painel de vagas salvas e candidaturas.
- **Navbar Dinâmica**: Exibição contextual de perfil, badge de plano e botão de logout.

### [Phase 37: Pipeline de IA no Motor Python (`scrapling-engine`)](file:///home/moa-dev/projetos/buscavag/.planning/phases/37-PLAN.md)
- **Extratores de Documentos**: Suporte nativo a arquivos `.pdf` e `.docx` via `pypdf` e `python-docx` no microserviço FastAPI.
- **Estruturação com Gemini AI**: Extração precisa de Senioridade real, Hard/Soft Skills categorizadas, Resumo executivo, Pontos Fortes e Dicas consultivas para ATS.
- **Fallback Inteligente**: Algoritmo heurístico/regex que assegura continuidade da análise mesmo sem chaves de API externas ativas.
- **Sincronização 1-Clique**: Permite ao candidato importar as habilidades detectadas pela IA diretamente para seu perfil.

### [Phase 38: Algoritmo de Match Perfeito](file:///home/moa-dev/projetos/buscavag/.planning/phases/38-PLAN.md)
- **Motor `CandidateMatcher`**: Algoritmo multidimensional de pontuação ponderada (`0-100%`):
  - Aderência de Stack Técnica (Hard Skills).
  - Alinhamento Semântico de Cargo & Título.
  - Compatibilidade de Nível de Senioridade.
  - Alinhamento de Localidade e Modalidade (Remoto / Híbrido / Presencial).
- **Interface de Vagas Recomendadas**: Aba interativa no portal do candidato com:
  - Ring/Badge de aderência percentual.
  - Destaque visual de **Habilidades Atendidas** (verde) vs **Lacunas / Gaps Técnicos** (amarelo/neutro).
  - Filtros dinâmicos por score mínimo (`>= 50%`, `>= 70%`, `>= 85%`).

### [Phase 39: Paywall e Regras SaaS (Free vs Premium)](file:///home/moa-dev/projetos/buscavag/.planning/phases/39-PLAN.md)
- **Matriz de Regras e Limites**:
  - **Free**: Limite de 5 vagas salvas, top 5 vagas recomendadas com visual liberado (demais com lock/blur), 1 análise de CV.
  - **Premium**: Vagas salvas ilimitadas, todas as recomendações desbloqueadas, análises de CV ilimitadas.
- **Página de Planos & Preços (`/pricing`)**: Comparativo visual completo com toggle Mensal / Anual (45% de economia) e FAQ.
- **Modal de Upgrade Contextual (`UpgradeModal`)**: Ativação imediata de assinatura com 1 clique e disparo de eventos reativos (`buscavag:auth-changed`).
- **Guards e Proteção**: Validações aplicadas em nível de rota e banco, retornando status `403` com payload informativo de limite atingido quando aplicável.

---

## 4. Principais Decisões Técnicas & Padrões

1. **Arquitetura Híbrida TypeScript + Python**: O frontend e backend web rodam em Next.js para máxima agilidade e SSR, enquanto tarefas intensivas de parsing de arquivos e pipelines de LLM rodam no microserviço Python FastAPI, comunicando-se via `PythonBridgeClient`.
2. **Resiliência e Fallbacks Heurísticos**: O analisador de currículos possui um motor de regex e extração de vocabulário técnico capaz de estruturar o perfil mesmo em caso de indisponibilidade da API de IA.
3. **Cálculo de Match em Duas Camadas**: Busca com filtros preliminares indexados no SQLite combinada com ranqueamento algorítmico em memória para garantir respostas em milissegundos sem sobrecarregar o banco.
4. **Estado Reativo no Cliente**: Utilização de Custom Events (`buscavag:auth-changed`) para sincronizar instantaneamente Navbar, modais e componentes sem necessidade de recarregar a página após login, logout ou upgrade de plano.

---

## 5. Requisitos & Cobertura de Testes

O milestone inclui uma suíte completa de testes de integração executáveis via TypeScript:

| Teste | Arquivo | Cobertura |
|---|---|---|
| Autenticação & Perfil | [`src/test-candidate-auth.ts`](file:///home/moa-dev/projetos/buscavag/src/test-candidate-auth.ts) | Registro, login, verificação de hash, persistência de preferências e salvamento de vagas. |
| Pipeline de IA & CV | [`src/test-cv-ai-pipeline.ts`](file:///home/moa-dev/projetos/buscavag/src/test-cv-ai-pipeline.ts) | Parsing de PDF/DOCX, análise de skills via Python Engine e persistência no banco. |
| Match Perfeito | [`src/test-perfect-match.ts`](file:///home/moa-dev/projetos/buscavag/src/test-perfect-match.ts) | Precisão de pontuação por stack, gaps técnicos e ordenação decrescente de vagas. |
| Paywall & SaaS | [`src/test-saas-paywall.ts`](file:///home/moa-dev/projetos/buscavag/src/test-saas-paywall.ts) | Limites de vagas Free (5 itens), travas de bloqueio de recomendações e ciclo de upgrade/downgrade. |

---

## 6. Débito Técnico & Oportunidades para v11.0

- **Gateway de Pagamento Real**: A simulação de upgrade atual é instantânea via banco; a v11.0 pode integrar webhooks reais do Stripe ou Mercado Pago (PIX / Cartão).
- **Notificações Proativas**: Envio automatizado de alertas de vagas com Match > 90% via Telegram ou WhatsApp direto para o candidato.
- **Gerador de Cartas de Apresentação (Cover Letters)**: Uso do motor de IA para criar cartas personalizadas cruzando o CV com a descrição exata da vaga salva.

---

## 7. Como Iniciar e Testar Localmente

1. **Iniciar Servidores**:
   ```bash
   # Iniciar o motor Python (FastAPI):
   cd src/services/scrapling-engine && uvicorn app.main:app --port 8000
   
   # Iniciar o frontend Next.js:
   npm run dev
   ```
2. **Executar Testes de Validação do Milestone**:
   ```bash
   npx tsx src/test-candidate-auth.ts
   npx tsx src/test-cv-ai-pipeline.ts
   npx tsx src/test-perfect-match.ts
   npx tsx src/test-saas-paywall.ts
   ```
3. **Acessar no Navegador**:
   - Cadastro / Login: `http://localhost:3000/login`
   - Painel do Candidato: `http://localhost:3000/candidate`
   - Planos e Preços: `http://localhost:3000/pricing`
