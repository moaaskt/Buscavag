# Phase 91 Context: Refatoração Rigorosa do Fallback Heurístico & Blacklist Não-Tech

## Contexto & Motivação
Historicamente, o motor de fallback heurístico do `HermesEvaluator` e os filtros de títulos em `jobFilters.ts` possuíam brechas que permitiam a contaminação do banco de dados por vagas alheias à área de tecnologia (ex.: *Assistente Fiscal*, *Corretor de Imóveis*, *Assistente Administrativo*, *Engenheiro Eletricista Clínico*). Além disso, quando o fallback heurístico era acionado, qualquer vaga que passasse pela checagem mínima acabava recebendo a tag `"Full Stack"` por default (`else { category = 'Full Stack'; }`).

A **Phase 91** estabelece uma barreira rigorosa contra ruídos não-tech, refatora a heurística para jamais rotular vagas como "Full Stack" sem evidências explícitas e expurga os registros contaminados do banco de dados.

---

## Decisões Técnicas Travadas (Decisions Locked)

### 1. Blacklist Contextual & Precedência de Termos de Software
- **Padrões de Blacklist Não-Tech**:
  - Regex contextual para ocupações não-tech puras:
    - Cargos administrativos, comerciais e de atendimento: `\b(assistente (administrativo|fiscal|financeiro|de vendas|comercial|de rh|operacional|de departamento pessoal|cont[aá]bil|de compras)|auxiliar (administrativo|de escritório|financeiro|fiscal))\b`
    - Corretores e vendas puras: `\b(corretor(a)? (de im[oó]veis|de seguros)|vendedor(a)?|consultor(a)? de vendas|telemarketing|atendente|recepcionista)\b`
    - Saúde e serviços gerais: `\b(enfermeir[oa]|m[eé]dic[oa]|t[eé]cnico(a)? em enfermagem|fisioterapeuta|psic[oó]log[oa]|farmac[eê]utic[oa]|dentista|nutricionista|motorista|porteiro|vigilante)\b`
    - Estágios não-tech: `\b(est[aá]gio (em|de)?\s*(rh|recursos humanos|log[ií]stica|vendas|direito|pedagogia|enfermagem|administra[cç][aã]o))\b`
    - Engenharias não-software: `\b(engenheir[oa]\s+(eletricista|civil|mec[aâ]nic[oa]|cl[ií]nic[oa]|de produ[cç][aã]o|agr[oô]nom[oa]|qu[ií]mic[oa]|ambiental))\b`
- **Precedência de Termos Explícitos de TI/Software**:
  - Se o título contiver expressamente termos centrais de software (`desenvolvedor`, `software engineer`, `programador`, `developer`, `fullstack`, `frontend`, `backend`), esses termos têm precedência caso o contexto trate de tecnologia (ex: `"Engenheiro(a) de Software | Assistente e Júnior"` ou `"[Freela] Desenvolvimento de Sistema para Corretora"`).

### 2. Destino de Vagas Não-Tech na Ingestão (Histórico & Auditoria)
- Vagas identificadas como não-tech pelo fallback heurístico:
  - Devem ser persistidas com `application_status: 'rejected'`.
  - `overall_score: 0`.
  - `is_junior_fullstack: 0`.
  - `category: 'Não-Tech'` (ou `'Rejeitada'`).
  - `reasoning`: Explicação explícita do motivo da rejeição pelo filtro heurístico.
  - **Proibição Estrita**: Sob nenhuma hipótese atribuir a tag `"Full Stack"` como fallback default.

### 3. Expurgo Direto (Hard Delete) de Vagas Legadas Contaminadas
- Criar e executar rotina/migration de higienização do banco de dados:
  - Identificar todas as vagas salvas que correspondam aos novos padrões de blacklist (ex: *Corretores*, *Assistentes Fiscais*, *Engenheiros Clínicos/Eletricistas*, etc.) que receberam indevidamente `"Full Stack"` ou `is_junior_fullstack = 1`.
  - Executar hard delete dessas vagas espúrias para restaurar a fidelidade métrica da plataforma.

---

## Critérios de Sucesso
- A suíte determinística `src/test-phase91.ts` valida cenários de rejeição estrita (corretores, assistentes, engenheiros não-software) e cenários que devem ser aprovados (software engineers, devs).
- Nenhuma vaga sem menção clara a frontend, backend ou fullstack recebe a categoria `"Full Stack"` no fallback.
- O banco de dados SQLite `buscavag.db` é limpo de todas as vagas não-tech detectadas.
- Todas as suítes anteriores (82-90) e o runner global (`npm test`) continuam passando com 100% de sucesso.
