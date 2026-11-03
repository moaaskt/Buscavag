# Quick Task: Diagnóstico e Correção do Parser de PDF, Sincronização do Perfil e Autocomplete

## Objetivo
1. Corrigir o leitor de PDF e a integração entre Next.js e o motor de análise para extrair 100% das hard skills do currículo (evitando envio de buffer corrompido em utf-8).
2. Garantir sincronização automática e manual do perfil com as competências extraídas, desbloqueando instantaneamente a aba de vagas recomendadas.
3. Implementar componente de Autocomplete / Combobox com busca em tempo real na aba de Perfil Profissional para evitar erros de digitação e padronizar competências.

## Etapas de Execução
- [ ] Task 1: Corrigir leitura e envio binário (base64) de currículos no `pythonBridge.ts` e `analyze-cv/route.ts`, garantindo extração textual precisa via pypdf.
- [ ] Task 2: Ajustar heurística e regras de extração no `cv_analyzer.py` e adicionar fallback resiliente no backend do Node.
- [ ] Task 3: Integrar auto-sincronização do perfil após análise e recarregamento instantâneo do match de vagas em `analyze-cv/route.ts` e `page.tsx`.
- [ ] Task 4: Implementar Autocomplete / Combobox com sugestões interativas e teclado em `ProfileTab.tsx`.
- [ ] Task 5: Validar com teste de extração no PDF real do usuário e verificação de tipos (`tsc`).
