# Phase 5 Research: Automation & Cron Setup

## Cron Configuration for VPS
Exemplo de entrada no crontab (`crontab -e`):
```cron
0 8,18 * * * cd /caminho/para/buscavag && /usr/bin/node dist/index.js >> /var/log/buscavag.log 2>&1
```

## Production Build & Environmental Safety
- Compilar TypeScript via `npm run build` (`tsc`).
- Garantir tratamentos de exceções globais para que uma falha de conexão na VPS não trave futuras execuções do Cron.
