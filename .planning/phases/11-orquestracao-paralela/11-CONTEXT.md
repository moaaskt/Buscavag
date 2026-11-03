# Phase 11 Context: Orquestração Paralela e Resiliência

## Contexto & Decisões Técnicas
- **Escalabilidade:** Com 20+ scrapers registrados, a execução puramente sequencial demora quase 3 minutos e fica vulnerável ao atraso de um único site com resposta lenta.
- **Concorrência Controlada:** O uso indiscriminado de `Promise.all` em 20 scrapers poderia abrir múltiplos browsers Playwright ao mesmo tempo e estourar a memória/CPU. Portanto, implementaremos controle de concorrência limitado a ~4-5 tarefas simultâneas.
- **Timeout Protetivo:** Cada scraper receberá uma camada de timeout de 60 segundos com cancelamento/fallback gracioso para garantir que o fluxo de coleta nunca trave.
