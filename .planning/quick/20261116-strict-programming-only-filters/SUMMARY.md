---
status: complete
date: 2026-11-16
---
# Quick Task Summary: Blindagem Estrita para Vagas Exclusivas de Programação e Engenharia de Software

**Data:** 16 de Novembro de 2026  
**Status:** complete ✓  

## 1. Problemas Diagnosticados & Causas Raízes
1. **Permissividade na Whitelist Técnica Antiga**:
   - `TECH_WHITELIST_PATTERNS` permitia títulos genéricos como `suporte técnico`, `analista de suporte`, `t[eé]cnico de ti`, `infraestrutura de ti`, `administrador de redes`, `consultor sap` e `product owner / product manager`.
2. **Loophole de Consultores Funcionais de ERP**:
   - Vagas como "Consultor(a) SAP SD", "Consultor(a) SAP MM", "Consultor(a) SAP FI", "Consultor(a) SAP PP" e "Consultor SAP Business One" passavam pelo filtro porque a palavra `sap` estava autorizada em combinação com termos de especialista/consultor, mesmo que tais vagas fossem de configuração funcional contábil/fiscal e não de programação.
3. **Loophole de Suporte e Infraestrutura Física**:
   - Cargos como "Analista de Suporte N1/N2", "Help Desk", "Service Desk" e "Estágio de Engenheiro de Redes" não tinham veto absoluto e acabavam catalogados no banco como `is_tech_software = 1`.
4. **Visibilidade no Repositório**:
   - O método `JobRepository.getAllJobs()` não filtrava explicitamente `is_tech_software = 1` na query SQL padrão para candidatos/usuários, permitindo que vagas com ruído aparecessem na UI.

---

## 2. Soluções Implementadas

1. **Refatoração dos Filtros em [`src/config/jobFilters.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/config/jobFilters.ts)**:
   - **Novas Categorias na Blacklist Estruturada**:
     - *Consultoria Funcional ERP/CRM (Não-Programação)*: Veto para SAP (SD, MM, FI, PP, PM, QM, B1, etc.), Oracle EBS funcional, Protheus funcional, analistas de sustentação e implantação de ERP.
     - *Suporte Técnico e Help Desk (Não-Programação)*: Veto para Suporte Técnico, Analista de Suporte, Help Desk, Service Desk, Suporte N1/N2/N3, Técnico de Informática e Atendimento de TI.
     - *Infraestrutura Física e Redes (Não-Programação)*: Veto para Analista de Redes, Administrador de Redes, Telecomunicações, Cabeamento, CFTV e Fibra Óptica.
     - *Gestão / Produtos / Ágil (Não-Programação)*: Veto para Product Owner, Product Manager, Scrum Master, Agilista, Agile Coach e Analista de Negócios tradicional.
     - *Design puro sem código*: Veto para UI/UX Designer, Product Designer e Designer Gráfico.
   - **Limpeza Rigorosa da Whitelist Técnica**:
     - Restrita estritamente a cargos de programação (Desenvolvedor, Developer, Programador, Engenheiro de Software, Full Stack, Frontend, Backend, Mobile, Data Engineer, Data Scientist, DevOps, SRE, QA Automation, Tech Lead).
     - Proteção para permitir contexto de negócio em vagas reais de desenvolvimento (ex: "Desenvolvedor Backend (Venda Direta)").

2. **Blindagem no Avaliador Hermes ([`src/services/hermesEvaluator.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/services/hermesEvaluator.ts))**:
   - Atualizado o prompt de IA para rejeitar explicitamente qualquer função que não seja desenvolvimento/engenharia de software ou dados/automação.
   - O fallback heurístico aplica os novos vetos pré-classificação.

3. **Garantia de Visibilidade no Repositório ([`src/db/repository.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/db/repository.ts))**:
   - Em `getAllJobs()`, adicionada cláusula obrigatória `AND (jobs.is_tech_software = 1 OR jobs.is_tech_software IS NULL)` no modo público/candidato, impossibilitando que vagas desativadas surjam na interface.

4. **Higienização Geral do Banco de Dados (`buscavag.db`) via [`scripts/sanitize-db-programming.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/scripts/sanitize-db-programming.ts)**:
   - Das 569 vagas cadastradas no banco:
     - **466 vagas genuínas de programação mantidas ativas** (`is_tech_software = 1`).
     - **103 vagas não-programação arquivadas/desativadas** (`is_tech_software = 0`, `is_junior_fullstack = 0`, `status = 'archived'`).

---

## 3. Validações Realizadas
1. **Suíte Anti-Ruído ([`src/test-job-filters-antinoise.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/test-job-filters-antinoise.ts))**:
   - **58/58 cargos não-tech e não-programação foram REJEITADOS (100%)**.
   - **20/20 cargos legítimos de programação e engenharia de software foram APROVADOS (100%)**.
   - Teste heurístico do `HermesEvaluator` aprovado com 100% de precisão.
2. **Runner Unificado de Testes (`npm test`)**:
   - **10/10 suítes executadas e aprovadas com 100% de sucesso**.
