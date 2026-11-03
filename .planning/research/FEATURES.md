# Features & Functional Requirements

## Core Features (Table Stakes)
1. **Scraping Multicanal**:
   - LinkedIn Jobs Collector
   - Indeed Collector
   - Gupy Portal Collector
   - Google Jobs Collector
   - Telegram Groups Collector
2. **Filtro de Recorrência**: Descarte automático de anúncios postados há mais de 5 dias.
3. **Classificação Inteligente com Hermes Agent**:
   - Validação se é efetivamente "Dev Full Stack Junior" ou "Junior".
   - Rejeição de vagas Senior/Pleno ou vagas de suporte/estágio incompatíveis.
4. **Notificação Formata no Telegram**:
   - Título da Vaga, Empresa, Plataforma, Nível/Regime, Link Direto e Resumo das tecnologias.
5. **Deduplicação Inteligente**:
   - Hash único por URL e título/empresa no SQLite para evitar alertas duplicados.

## Differentiators
- Resumo automático gerado por IA dos pontos chave da vaga (Stack exigida, Benefícios, Local/Remoto).
- Logs detalhados de execução para monitoramento em produção na VPS.
