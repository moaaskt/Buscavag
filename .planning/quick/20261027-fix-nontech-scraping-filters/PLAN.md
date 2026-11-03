---
status: complete
---
# Quick Plan: Blindagem Anti-Ruído e Filtros Rigorosos para Vagas Não-Tech e CNC

## Objetivo
Resolver a ingestão indevida e disparos ao Telegram de vagas não relacionadas à programação e TI (ex: cargos administrativos, RH, logística, vendas, estoquista, financeiro e operadores/programadores de torno mecânico CNC). Garantir que o comando `npm start dev` (que executa a pipeline) e o scraper autônomo realizem uma triagem rigorosa com rejeição absoluta de termos industriais e normalização de botões nos scrapers.

## Tarefas

1. **Blindagem e Normalização em `src/config/jobFilters.ts`**:
   - Implementar `cleanJobTitle(title)` para remover sufixos de botões acoplados por scrapers (`Candidatar-se`, `Ver vaga`), normalizar sufixos de badges (`NOVA`) e variações de gênero `(a)`, `(o)`.
   - Criar `HARD_EXCLUSION_PATTERNS` com veto absoluto para funções industriais/manufatura (CNC, torno, usinagem, fresa, caldeiraria, corte a laser, montador físico, esmerilhador), impedindo que a palavra "programador" (ex: "Programador CNC") burle a blacklist.
   - Refatorar `TITLE_BLACKLIST_PATTERNS` para cobrir RH/Recrutamento, Logística/Estoque, Fiscal/Contábil/Financeiro, Administrativo, Vendas/Comercial, Marketing Não-Tech e Estágios Não-Tech.
   - Atualizar `TECH_WHITELIST_PATTERNS` e `matchesWhitelist()` com checagem rigorosa de fronteira de palavras (`\b`) e suporte a Unicode (`/u`), eliminando falsos positivos graves como a substring solta `'data'` que capturava qualquer termo com `'candidatar-se'`.

2. **Refatoração do `HermesEvaluator` (`src/services/hermesEvaluator.ts`)**:
   - Adicionar validação prévia mandatória antes de acionar IA: rejeitar sumariamente títulos na blacklist ou fora da whitelist técnica via `buildNonTechResult()`.
   - No fallback heurístico, impedir que descrições corporativas genéricas aprovem títulos não-técnicos.
   - Refinar a categorização semântica (evitar que menções a "banco de dados" classifiquem desenvolvedores full-stack como "Data").

3. **Otimização dos Scrapers Regionais e Portais ATS**:
   - `src/scrapers/recruteiEmpregos.ts`: Remover o slug genérico `'tecnologia'` (que retornava empresas de qualquer setor com vagas operacionais) e aplicar `cleanJobTitle()` no texto extraído.
   - `src/scrapers/vagasSc.ts`: Substituir busca genérica `'ti'` por `'software'` e sanitizar título.
   - `src/scrapers/empregaPalhoca.ts`, `src/scrapers/saoJose.ts`, `src/scrapers/vagasFloripa.ts`: Refinar queries para termos estritamente técnicos (`desenvolvedor`, `programador`, `software`, `full stack`).

4. **Blindagem na Notificação Telegram e Repositório**:
   - `src/index.ts`: Adicionar barreira de defesa em profundidade no loop de disparo do Telegram (`if (!isTechJob(job.title) || job.isTechSoftware === false)`), descartando e logando qualquer vaga não-tech que eventualmente esteja pendente.
   - `src/db/repository.ts`: Ajustar `getPendingNotifications()` para consultar estritamente `is_tech_software = 1 AND is_junior_fullstack = 1 AND notified = 0`.
   - Limpeza e arquivamento das 70 vagas não-tech legadas armazenadas no `buscavag.db`.

5. **Testes & Validação**:
   - Criar suíte dedicada `src/test-job-filters-antinoise.ts` com casos de teste positivos e negativos exaustivos.
   - Integrar ao `scripts/test-runner.ts` e validar execução 100% verde em todas as 10 suítes.
