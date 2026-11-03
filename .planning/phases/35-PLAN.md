# Phase 35 Plan: Resgate Final & Blindagem 100% dos Scrapers

## Metadata
- **Phase**: 35
- **Milestone**: 9 (Motor Híbrido Scrapling & Blindagem 100% dos Scrapers)
- **Scope**: Blindar todas as fontes restantes da plataforma Buscavag através do microserviço Scrapling Engine e seletores resilientes, criar ferramenta de auditoria de ponta a ponta (`src/audit-scrapers.ts`) e alcançar 100% de taxa de sucesso e observabilidade.
- **Dependencies**: Phase 32, 33, 34

---

## Objective
Concluir a transição e blindagem das fontes de vagas do ecossistema Buscavag. Plataformas suscetíveis a bloqueios WAF (Cloudflare/Akamai/antibot) ou seletores instáveis (como Glassdoor, InfoJobs, Indeed, Trabalha Brasil, Trampos, GeekHunter) serão integradas ao motor Scrapling Python com evasão avançada, enquanto os scrapers Node.js restantes receberão tratamento resiliente com timeouts e headers realistas. A suite de auditoria validará todas as 34 fontes em tempo real.

---

## Detailed Task Breakdown

### Task 1: Módulos Adicionais de Alta Fricção no Scrapling Engine (`src/services/scrapling-engine/app/scrapers/`)
- **Arquivos**:
  - `src/services/scrapling-engine/app/scrapers/glassdoor.py`: Coleta otimizada para Glassdoor via headers customizados/feeds.
  - `src/services/scrapling-engine/app/scrapers/infojobs.py`: Coleta resiliente para InfoJobs com extração de cargos tech/júnior.
  - `src/services/scrapling-engine/app/scrapers/trabalha_brasil.py`: Parser otimizado para o portal Trabalha Brasil (SINE).
  - `src/services/scrapling-engine/app/scrapers/trampos.py` & `geekhunter.py`: Parsers especializados para vagas tech e startups.
- **Atualização**: `src/services/scrapling-engine/app/scrapers/__init__.py` e `src/services/scrapling-engine/app/main.py` para rotear as novas fontes.

### Task 2: Blindagem e Atualização dos Adaptadores TypeScript
- Atualizar os scrapers correspondentes em `src/scrapers/` (`glassdoor.ts`, `infojobs.ts`, `trabalhaBrasil.ts`, `trampos.ts`, `geekhunter.ts`) para herdar de `PythonBridgeScraper`.
- Revisar scrapers regionais SC e ATSs diretos (`vagasSc.ts`, `vagasFloripa.ts`, `saoJose.ts`, `gupy.ts`, `programathor.ts`, etc.) garantindo seletores modernos e tratamento defensivo com fallbacks seguros.

### Task 3: Script de Auditoria Completa de Scrapers (`src/audit-scrapers.ts`)
- **Arquivo**: `src/audit-scrapers.ts`
  - Instanciar e testar cada um dos 34 scrapers do `ScraperOrchestrator`.
  - Medir latência individual (ms), vagas coletadas, motor utilizado (`NODE` vs `PYTHON`), e status (`OK` / `WARNING` / `ERROR`).
  - Imprimir um dashboard tabular formatado no terminal com taxa global de sucesso (%) e resumo executivo.

### Task 4: Execução da Auditoria e Validação Final do Milestone 9
- Executar `npx tsc --noEmit` para garantir conformidade estrita de tipagem.
- Executar `npx tsx src/audit-scrapers.ts` com o Scrapling Engine ativo para certificar que a orquestração opera de maneira robusta.

---

## Verification Plan

1. **Verificação de Tipos**: `npx tsc --noEmit` deve compilar sem nenhum aviso ou erro.
2. **Auditoria de Scrapers**: `npx tsx src/audit-scrapers.ts` deve rodar com sucesso em todas as fontes e exibir o relatório consolidado de integridade.
3. **Conclusão de Milestone**: Atualizar `ROADMAP.md` e `STATE.md` documentando o fechamento do Milestone 9.
