# Quick Plan: Correção e Otimização do Pipeline de Scrapers (BUSCAVAG)

## Objetivo
Corrigir falhas em scrapers críticos (Workana, BeBee, Chawork), otimizar scrapers de SPAs (Revelo, 99jobs, RunTalent, Empregare) para inicialização direta via Playwright stealth sem fetch estático desnecessário, adicionar scripts de encerramento gracioso para processos zumbis no `package.json`, e validar com typecheck e execução de teste.

## Tarefas

1. **Workana Scraper (`src/scrapers/workana.ts`)**:
   - Pular a tentativa de fetch estático (que toma 403 Forbidden via Cloudflare/WAF).
   - Iniciar diretamente via Playwright com `createStealthContext()`.
   - Adicionar tratamento de erro gracioso para fechar instâncias de browser/contexto com segurança e retornar array de vagas.

2. **Bebee Scraper (`src/scrapers/bebee.ts`)**:
   - Atualizar a URL base e endpoints: o domínio e rota anteriores retornavam 410 Gone.
   - Nova URL oficial: `https://bebee.com/br/jobs?q=${query}` com Next.js SSR.
   - Atualizar seletores para a nova estrutura do BeBee (`h3 a[href*="/br/jobs/"]`, localização com pin, empresa, data).
   - Adicionar tratamento de erro gracioso por busca e a nível de scraper.

3. **Chawork Scraper (`src/scrapers/chawork.ts`)**:
   - Corrigir erro 404: a URL anterior com barra final (`https://chawork.com.br/vagas/?q=...`) causava 404 no servidor Nginx/Cloudflare da Chawork.
   - Atualizar para a URL limpa `https://chawork.com.br/vagas?q=${query}` e seletores da Chawork (`.job-item`, `.job-item-title`, `.job-item-location`, `a[href*="/vaga"]`).
   - Adicionar tratamento de erro gracioso contínuo sem travar outros scrapers.

4. **Otimização de Scrapers de SPAs (Revelo, 99jobs, RunTalent, Empregare)**:
   - `src/scrapers/revelo.ts`: Chamar `scrapeViaPlaywright()` diretamente em `scrape()`, removendo o roundtrip estático prévio.
   - `src/scrapers/noventaENoveJobs.ts`: Chamar `scrapeViaPlaywright()` diretamente em `scrape()`.
   - `src/scrapers/runTalent.ts`: Chamar `scrapeViaPlaywright()` diretamente em `scrape()`.
   - `src/scrapers/empregare.ts`: Chamar `scrapeViaPlaywright()` diretamente em `scrape()`.

5. **Tratamento de Processos Node Zumbis (`package.json`)**:
   - Adicionar script `kill:zombies` e `clean:ports` para liberação segura das portas (ex: porta 3000) e finalização de processos Node/tsx sem falhas de permissão de `killall node`.

6. **Validação & Testes**:
   - Executar `npx tsc --noEmit` para garantir ausência de erros de compilação.
   - Executar script de teste direcionado validando a captura dos scrapers alterados (Workana, BeBee, Chawork, Revelo, 99jobs, RunTalent, Empregare).
