---
status: complete
date: 2026-10-27
---
# Quick Task Summary: Blindagem Anti-Ruído e Filtros Rigorosos para Vagas Não-Tech e CNC

**Data:** 2026-10-27  
**Status:** complete ✓  

## 1. Problemas Diagnosticados & Causas Raízes

1. **Substrings Soltas no `matchesWhitelist`**:
   - O termo `'data'` na lista `TECH_WHITELIST` era testado via `.includes('data')`. Como o portal Recrutei concatenava o botão `"Candidatar-se"` ao título de quase todas as vagas (`candi-DATA-r-se`), vagas como "Analista de Recrutamento e Seleção", "Encarregado Logístico" e "Estágio de Ensino Médio" passavam na whitelist técnica.
2. **Loophole do "Programador CNC"**:
   - Vagas industriais de usinagem e torno mecânico continham "Programador" (ex: "Programador CNC", "Operador de Torno CNC"). No código anterior, a presença de "Programador" ativava `hasExplicitSoftware = true` e pulava completamente a verificação da blacklist.
3. **Lacunas na Blacklist de Cargos Não-Tech**:
   - Funções operacionais de RH ("recrutamento e seleção", "auxiliar de pessoas"), logística ("encarregado logístico", "operador logístico"), finanças ("departamento fiscal", "analista fiscal") e vendas ("consultor(a) de vendas") não possuíam padrões abrangentes com tratamento para variações como `(a)` e acentos Unicode.
4. **Slugs Excessivamente Genéricos nos Scrapers**:
   - Scrapers como `recruteiEmpregos`, `vagasSc`, `empregaPalhoca`, `saoJose` e `vagasFloripa` buscavam pelo termo `'tecnologia'` ou `'ti'`, retornando empresas de outros segmentos com vagas de limpeza, recepção e administração geral.
5. **Fallback Heurístico Permissivo do `HermesEvaluator`**:
   - Diante de indisponibilidade ou alta demanda da API Gemini (HTTP 503), o fallback heurístico aprovava vagas se a descrição da empresa mencionasse "desenvolvimento de software", aprovando títulos não-técnicos por contaminação de texto.

---

## 2. Soluções Implementadas

1. **Normalização e Veto Absoluto em [`src/config/jobFilters.ts`](file:///home/moa-dev/projetos/buscavag/src/config/jobFilters.ts)**:
   - Função `cleanJobTitle()`: remove sufixos de botões acoplados (`Candidatar-se`, `Ver vaga`, `Inscreva-se`), sufixos de badges (`NOVA`) e parênteses de gênero (`(a)`, `(o)`).
   - `HARD_EXCLUSION_PATTERNS`: Veto absoluto para CNC, Torno, Usinagem, Fresadora, Caldeiraria, Corte a Laser, Montador Físico e Esmerilhador.
   - `TITLE_BLACKLIST_PATTERNS`: Categorias completas para RH/R&S, Logística/Estoque, Fiscal/Contábil/Financeiro, Administrativo/Atendimento, Vendas/Comercial, Marketing Não-Tech, Saúde/Estética, Serviços Gerais e Estágios Não-Tech.
   - `TECH_WHITELIST_PATTERNS`: Expressões regulares com limite de palavra (`\b`) e flag Unicode (`/iu`), exigindo contexto técnico real (ex: `data engineer`, `analista de dados`, `cientista de dados`).

2. **Blindagem no `HermesEvaluator` ([`src/services/hermesEvaluator.ts`](file:///home/moa-dev/projetos/buscavag/src/services/hermesEvaluator.ts))**:
   - Bloqueio imediato pré-LLM para vagas que colidam com a blacklist ou não contenham termo técnico reconhecido, via método dedicado `buildNonTechResult()`.
   - Ajuste na categorização para prevenir falso "Data" em desenvolvedores full-stack.

3. **Otimização de Scrapers**:
   - Atualizados [`src/scrapers/recruteiEmpregos.ts`](file:///home/moa-dev/projetos/buscavag/src/scrapers/recruteiEmpregos.ts), [`src/scrapers/vagasSc.ts`](file:///home/moa-dev/projetos/buscavag/src/scrapers/vagasSc.ts), [`src/scrapers/empregaPalhoca.ts`](file:///home/moa-dev/projetos/buscavag/src/scrapers/empregaPalhoca.ts), [`src/scrapers/saoJose.ts`](file:///home/moa-dev/projetos/buscavag/src/scrapers/saoJose.ts) e [`src/scrapers/vagasFloripa.ts`](file:///home/moa-dev/projetos/buscavag/src/scrapers/vagasFloripa.ts) para buscar termos específicos (`desenvolvedor`, `programador`, `software`, `full stack`) e sanitizar títulos.

4. **Guarda de Defesa em Profundidade no Telegram e DB**:
   - Em [`src/index.ts`](file:///home/moa-dev/projetos/buscavag/src/index.ts): Validação `!isTechJob(job.title) || job.isTechSoftware === false` no loop de disparo do Telegram antes de enviar qualquer mensagem.
   - Em [`src/db/repository.ts`](file:///home/moa-dev/projetos/buscavag/src/db/repository.ts): `getPendingNotifications()` exige `is_tech_software = 1 AND is_junior_fullstack = 1 AND notified = 0`.
   - Banco de dados `buscavag.db`: 70 vagas não-tech legadas foram higienizadas e arquivadas (`is_tech_software = 0`, `is_junior_fullstack = 0`, `status = 'archived'`).

---

## 3. Validações Realizadas

1. **Nova Suíte de Testes Anti-Ruído ([`src/test-job-filters-antinoise.ts`](file:///home/moa-dev/projetos/buscavag/src/test-job-filters-antinoise.ts))**:
   - 34 casos não-tech e CNC testados: **34/34 rejeitados com 100% de precisão**.
   - 18 casos legítimos de software e infraestrutura testados: **18/18 aprovados**.
2. **Runner Unificado de Testes (`npm test`)**:
   - **10/10 suítes aprovadas com 100% de sucesso** em 6.04s.
