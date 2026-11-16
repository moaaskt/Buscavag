---
task: 20261116-strict-programming-only-filters
description: Blindagem e refinamento dos filtros de vagas para aceitar estritamente programação e desenvolvimento de software
date: 2026-11-16
status: complete
---

# Quick Task: Filtros Rigorosos — Apenas Vagas de Programação e Engenharia de Software

## Objetivo
Garantir com certeza absoluta que a plataforma Buscavag exiba e notifique **exclusivamente vagas referentes a programação e desenvolvimento de software**, eliminando ruídos como consultores funcionais de ERP (SAP funcional, Oracle EBS), suporte técnico/help desk, infraestrutura de redes/telecom, agilistas/product managers e designers sem programação.

## Plano de Execução
1. **Refatoração de [`src/config/jobFilters.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/config/jobFilters.ts)**:
   - Expandir a blacklist com bloqueios estritos para:
     - Consultoria funcional ERP/CRM (Consultor SAP SD/MM/FI/PP/PM, Oracle EBS funcional, Salesforce funcional sem dev).
     - Suporte técnico, help desk, service desk e manutenção de computadores.
     - Redes, cabeamento, telecomunicações e infraestrutura de hardware.
     - Gestão não-técnica: Product Owner, Product Manager, Scrum Master, Agilista.
     - Design sem código: UI/UX Designer, Product Designer.
   - Limpar a whitelist técnica para remover termos permissivos (`suporte técnico`, `analista de suporte`, `sap`, `redes`, `product owner`, etc.).
   - Criar / consolidar a função `isProgrammingJob(title: string)` e reforçar `isTechJob(title: string)`.

2. **Ajuste no Avaliador Hermes ([`src/services/hermesEvaluator.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/services/hermesEvaluator.ts))**:
   - Ajustar as diretrizes de IA e o fallback heurístico para classificar `isTechSoftware = true` estritamente para programação / engenharia de software / dados / automação.
   - Vetar suporte, ERP funcional e gestão ágil.

3. **Blindagem no Repositório ([`src/db/repository.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/db/repository.ts))**:
   - Garantir que `getAllJobs` exija `is_tech_software = 1` por padrão na listagem pública e de candidatos.

4. **Higienização do Banco de Dados Ativo (`buscavag.db`)**:
   - Criar e rodar script de migração/higienização que reavalia os 567 registros do banco de dados com os novos filtros estritos e arquiva (`status = 'archived'`, `is_tech_software = 0`, `is_junior_fullstack = 0`) qualquer vaga que não seja estritamente de programação.

5. **Testes e Verificação**:
   - Atualizar e executar suíte de testes de filtros garantindo 100% de precisão nos testes de regressão e novos casos.
