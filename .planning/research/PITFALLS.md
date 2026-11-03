# Technical Pitfalls & Mitigations

1. **Bloqueio de IP por Rate Limit / Bot Detection (LinkedIn / Indeed)**
   - *Risco*: Scrapers serem bloqueados ou solicitarem CAPTCHA na VPS.
   - *Mitigação*: Uso de user-agents rotativos, delays randômicos e estratégias de coleta resilientes (Playwright stealth / APIs públicas sempre que possível).

2. **Formatação de datas inconsistente entre fontes**
   - *Risco*: Falha na filtragem dos 5 dias devido a formatos variados ("Há 2 horas", "Publicado ontem", "3d atrás").
   - *Mitigação*: Parser centralizado de timestamps / datas relativas para conversão padronizada em ISO Date.

3. **Rate Limits na API do Telegram**
   - *Risco*: Envio em lote de muitas vagas bloqueado temporariamente pela API de bots do Telegram.
   - *Mitigação*: Fila de envio com throttling / intervalo entre mensagens (ex: 500ms entre notificações).

4. **Custos / Carga da LLM no Hermes Agent**
   - *Risco*: Enviar centenas de vagas não filtradas para a IA consumir tokens desnecessariamente.
   - *Mitigação*: Aplicação prévia do filtro temporal e deduplicação ANTES de enviar para a IA do Hermes Agent.
