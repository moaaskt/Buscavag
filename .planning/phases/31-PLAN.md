# Phase 31 Plan: Expansão das 10 Novas Fontes de Vagas Tech

## Metadata
- **Phase**: 31
- **Milestone**: 8
- **Scope**: Criação e integração dos 10 adaptadores de scraping para plataformas tech e freelance adicionais: GeekHunter, Nerdin, Revelo, 99jobs, Sólides, RunTalent, Empregare, Workana, Trampos.co e revisão do Programathor.
- **Dependencies**: Phase 29, Phase 30

---

## Objective
Expandir o ecossistema de captura de vagas com a adição de **10 novas fontes especializadas**:
1. **GeekHunter** (`geekhunter.com/pt/vagas` / API de busca tech)
2. **Nerdin** (`nerdin.com.br`)
3. **Programathor** (`programathor.com.br` - revisão/consolidação de todas as categorias e slugs)
4. **Revelo** (`app.careers.revelo.com/home` ou API pública de oportunidades)
5. **99jobs** (`99jobs.com/oportunidades`)
6. **Sólides** (`vagas.solides.com.br` / busca por tecnologia)
7. **RunTalent** (`runtalent.zohorecruit.com/jobs/Careers`)
8. **Empregare** (`empregare.com/pt-br/vagas`)
9. **Workana** (`workana.com/pt/jobs?language=pt` - projetos dev e freelance com tags tech)
10. **Trampos.co** (`trampos.co/oportunidades`)

Garantir suporte anti-bot via `fetchHtml` / `createStealthContext` (Playwright) e tratamento individual com `try/catch` para que falhas de rede em um provedor não bloqueiem os demais.

---

## Detailed Task Breakdown

### Task 1: Atualização dos Enums (`job.ts`)
- **Arquivo**: `src/types/job.ts`
- **Ações**:
  - Adicionar ao `PlatformSource`:
    - `GEEKHUNTER = 'geekhunter'`
    - `NERDIN = 'nerdin'`
    - `REVELO = 'revelo'`
    - `NOVENTA_NOVE_JOBS = '99jobs'`
    - `SOLIDES = 'solides'`
    - `RUNTALENT = 'runtalent'`
    - `EMPREGARE = 'empregare'`
    - `WORKANA = 'workana'`
    - `TRAMPOS = 'trampos'`

### Task 2: Criação dos Novos Scrapers
- **Arquivos**:
  - `src/scrapers/geekhunter.ts`: Adaptador GeekHunter (busca por Dev Junior, Full Stack, React, Node, Python).
  - `src/scrapers/nerdin.ts`: Adaptador Nerdin (vagas de TI em SC e Brasil).
  - `src/scrapers/revelo.ts`: Adaptador Revelo (vagas tech).
  - `src/scrapers/noventaENoveJobs.ts`: Adaptador 99jobs (vagas de tecnologia/software).
  - `src/scrapers/solides.ts`: Adaptador Sólides Vagas (vagas de TI / desenvolvimento).
  - `src/scrapers/runTalent.ts`: Adaptador RunTalent (Zoho Recruit vagas tech).
  - `src/scrapers/empregare.ts`: Adaptador Empregare (vagas de TI / programação).
  - `src/scrapers/workana.ts`: Adaptador Workana (projetos tech com filtro de stack e recência).
  - `src/scrapers/trampos.ts`: Adaptador Trampos.co (vagas de TI/Dev).
  - `src/scrapers/programathor.ts`: Revisar e garantir múltiplos slugs e fallbacks.

### Task 3: Integração no Orquestrador e UI
- **Arquivos**:
  - `src/scrapers/index.ts`: Importar e instanciar todos os 10 adaptadores no array `this.scrapers` (totalizando 35+ fontes ativas).
  - `src/app/jobs/page.tsx`: Adicionar as 10 novas opções no seletor de plataforma com optgroups organizados.
  - `src/components/Navbar.tsx`: Atualizar contador de fontes ativas (`35+`).

---

## Verification Plan
1. **TypeScript Typecheck**: Executar `npx tsc --noEmit` para garantir 0 erros de tipo.
2. **Teste Individual dos Novos Scrapers**: Executar script standalone testando cada novo scraper e checando parse de dados.
3. **Teste do ScraperOrchestrator**: Executar orquestrador com timeout reduzido e verificar logs estruturados e métricas de execução.
