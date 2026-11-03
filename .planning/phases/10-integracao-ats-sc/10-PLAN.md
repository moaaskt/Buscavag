# Phase 10 Execution Plan: Integração ATS Nacionais e Regionais SC

## Objective
Expandir o ecossistema de scrapers do Buscavag desenvolvendo e integrando 11 novas fontes (além das 4 originais) de vagas focadas no mercado de SC e portais nacionais. A extração priorizará HTTP requests (Cheerio/Axios) para escalabilidade, adotando Playwright apenas em SPAs ou portais com proteção avançada.

## Pre-requisites
- O core (`RawJob`, banco de dados, `ScraperOrchestrator`) já deve estar funcional (entregues na Milestone 1).
- Estratégia híbrida definida no `10-CONTEXT.md`.

## Implementation Steps

### 1. Preparação da Arquitetura Híbrida
- [ ] Revisar `src/scrapers/base.ts` para facilitar a criação rápida de scrapers baseados em `Axios/Cheerio` caso atualmente a base seja muito acoplada ao `Playwright`.

### 2. Implementação: Regionais de Santa Catarina
- [ ] Criar scraper para `saojosemaisempregos.empregaja.org` em `src/scrapers/saoJose.ts`.
- [ ] Criar scraper para `vagas.sc` em `src/scrapers/vagasSc.ts`.
- [ ] Criar scraper para `vagasfloripa.com.br` em `src/scrapers/vagasFloripa.ts`.
- [ ] Criar scraper para `empregapalhoca.com.br` em `src/scrapers/empregaPalhoca.ts`.

### 3. Implementação: Portais Nacionais
- [ ] Criar scraper para `infojobs.com.br` em `src/scrapers/infojobs.ts`.
- [ ] Criar scraper para `chawork.com.br` em `src/scrapers/chawork.ts`.
- [ ] Criar scraper para `trabalhabrasil.com.br` em `src/scrapers/trabalhaBrasil.ts`.
- [ ] Criar scraper para `bne.com.br` em `src/scrapers/bne.ts`.
- [ ] Criar scraper para `bebee.com/br/jobs` em `src/scrapers/bebee.ts`.
- [ ] Criar scraper para `empregos.com.br` em `src/scrapers/empregos.ts`.
- [ ] Criar scraper para `recrutasimples.com.br/vagas` em `src/scrapers/recrutaSimples.ts`.

### 4. Implementação: ATSs / Integradores Adicionais
- [ ] Criar scraper para `empregos.recrutei.com.br` em `src/scrapers/recruteiEmpregos.ts`.
- [ ] Criar scraper para `jobs.quickin.io/anarecrutamento` em `src/scrapers/quickin.ts`.
- [ ] Criar scraper para `jobs.recrutei.com.br/PeoplePlan` em `src/scrapers/recruteiJobs.ts`.
- [ ] Criar scraper para `gtorh.pandape.infojobs.com.br` em `src/scrapers/pandape.ts`.

### 5. Mapeamento de Dados e Integração (Data Uniformity)
- [ ] Garantir que cada scraper mapeie os dados brutos exatamente para a interface `RawJob`.
- [ ] Descartar metadados extra ou concatená-los formatados na string de descrição da vaga (Ex: pacote de benefícios, modelo de trabalho).
- [ ] Registrar todos os 11 novos scrapers no index (`src/scrapers/index.ts`) ou na factory do orchestrator.

## Verification
- Testar cada scraper isoladamente verificando se retorna arrays populados de `RawJob`.
- Analisar falhas de parsing nas datas ou salários.
- Confirmar que scrapers baseados em HTTP (Cheerio) finalizam em segundos, minimizando uso da CPU comparado ao Playwright.
