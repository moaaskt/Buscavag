# Phase 46 PLAN — Paywall Free na Análise de CV

Restringir a re-análise de CV por IA a usuários Premium no backend (403) e na UI com feedback de Toast e redirecionamento para `/pricing`.

## Tasks
1. Auditar a trava de segurança em `POST /api/candidate/analyze-cv`.
2. Adicionar o tratamento HTTP 403 em `handleAnalyzeResume` (`src/app/candidate/page.tsx`) exibindo a mensagem/toast de upsell e efetuando `router.push('/pricing')`.
3. Ajustar o botão "Reanalisar" na aba do candidato para se transformar em "Upgrade Pro para Reanalisar".
4. Executar validação e `npm run build`.
