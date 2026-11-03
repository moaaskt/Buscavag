# Phase 12 Context: Motor Unificado de Extração de Data e Filtro Rígido

## Contexto & Regras de Negócio
- O usuário e a especificação exigem que nenhuma vaga com mais de 5 dias corridos avance para a análise de IA ou notificação no Telegram.
- Portais diferentes publicam datas em formatos extremamente variados (ex: "Publicado há 3 dias", "Postada ontem", "01/09/2026", "28 de agosto", timestamps ISO ou strings amigáveis de ATSs).
- Um motor unificado em `src/utils/date.ts` garante consistência em todas as 20 fontes.
