# Phase 9: Real-time Alerts, Monitoring & Deployment Hardening - Context & Decisions

## Context
O Buscavag v2 (Milestone 2) agora conta com diversos scrapers atuando em paralelo, avaliador via IA (`HermesEvaluator`), e um Web Dashboard robusto em Next.js. O banco SQLite armazena o histórico e gerencia o Kanban.
Para fechar o Milestone 2, precisamos garantir que o sistema seja resiliente, que falhas (ex: mudança de layout num site que quebra o Playwright) sejam notificadas imediatamente, e que o deploy na VPS seja simples e orquestrado.

---

## Decisões Arquiteturais e Tecnológicas

### 1. Monitoramento e Alertas (Health Checks)
- **Canal de Notificação:** O próprio bot do Telegram (que já usamos para notificar novas vagas) será usado para enviar os alertas proativos.
- **Formato:** Mensagens com a tag `[ALERTA]` ou `[FALHA]` descrevendo qual scraper falhou e o motivo (ex: timeout, erro de selector).
- **Tratamento:** O orquestrador (`ScraperOrchestrator`) deve interceptar os erros dos scrapers e enviar essas mensagens, além de garantir que a falha de um scraper não derrube o processo dos demais (failover/resiliência).

### 2. Estratégia de Dockerização
- **Arquitetura:** `Docker Compose` com serviços separados.
  1. **Service `web`**: Rodará a aplicação Next.js (Dashboard) exposta na porta 3000 (ou mapeada para 80/443 via reverse proxy futuramente).
  2. **Service `scraper`**: Rodará o Node.js em background para execução contínua.
- **Vantagem:** Facilita escalabilidade, visualização de logs independentes e reinicializações segmentadas (ex: reiniciar apenas o scraper caso trave, sem derrubar o dashboard).
- **Volume:** O arquivo `buscavag.db` precisará estar num Docker Volume compartilhado entre os dois containers para que o scraper grave e o dashboard leia e atualize.

### 3. Orquestração e Agendamento
- **Mecanismo:** Uso da biblioteca `node-cron` no processo do `scraper`.
- **Funcionamento:** O script Node (`src/index.ts` ou um novo `src/cron.ts`) ficará rodando eternamente no container (`CMD ["npm", "run", "start:cron"]`), disparando a rotina principal (orquestrador) a cada `X` horas.

---

## Critérios de Sucesso da Fase 9
- [ ] Orquestrador captura erros e envia notificação de falha via Telegram.
- [ ] Implementação de `node-cron` no projeto para execução contínua.
- [ ] Criação de `Dockerfile` para o Next.js (Dashboard) otimizado para produção.
- [ ] Criação de `Dockerfile` para o Scraper/Cron (com dependências do Playwright se necessário).
- [ ] Criação do `docker-compose.yml` unindo ambos os serviços e mapeando um volume compartilhado para o banco de dados.
