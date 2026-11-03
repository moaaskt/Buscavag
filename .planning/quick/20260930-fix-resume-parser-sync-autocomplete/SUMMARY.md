---
status: complete
date: 2026-09-30
slug: fix-resume-parser-sync-autocomplete
task: "Diagnóstico e Correção do Parser de PDF, Sincronização do Perfil e Autocomplete"
---

# Quick Task Summary: Correção do Parser de PDF, Sincronização do Perfil e Autocomplete

## Problemas Resolvidos
1. **Parser de PDF retornando 0 habilidades**:
   - **Causa Raiz**: O endpoint Node.js `/api/candidate/analyze-cv` fazia leitura do arquivo PDF com `fs.readFileSync(..., 'utf-8')`. Como PDFs são arquivos binários compactados, a string resultante continha bytes corrompidos (`%PDF-1.4...`), impossibilitando a extração tanto por regex quanto por LLM.
   - **Solução**: `PythonBridgeClient` foi atualizado para ler o buffer binário real e transmitir via `contentBase64`. O endpoint `/cv/parse` do microserviço Python decodifica os bytes via `pypdf.PdfReader` com integridade total, extraindo 500+ palavras e 27 hard skills no currículo real.
   - **Refinamento de Senioridade**: Ajustada a heurística de `cv_analyzer.py` para priorizar a declaração do título profissional no cabeçalho do candidato (ex: "Desenvolvedor Full Stack Junior" agora é classificado corretamente como "Júnior", sem ser sobreposto por ocorrências dispersas no corpo do texto).

2. **Auto-Sincronização e Desbloqueio da Aba de Vagas**:
   - A rota `/api/candidate/analyze-cv` agora executa automaticamente `repo.syncSkillsToProfile(...)` logo após a análise, salvando as habilidades, cargo e senioridade no banco de dados SQLite.
   - O front-end em `candidate/page.tsx` atualiza o estado do perfil e dispara `fetchRecommendedJobs()` e `fetchMatchStats()`, liberando o painel de vagas recomendadas imediatamente.

3. **Autocomplete / Combobox no Preenchimento Manual**:
   - Implementado em `ProfileTab.tsx` um catálogo com 70+ tecnologias tech padronizadas.
   - Componente Combobox interativo com filtro em tempo real, suporte à navegação por teclado (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), fechamento ao clicar fora e chips de sugestões populares rápidas (TypeScript, React, Node.js, PHP, Docker, PostgreSQL, etc.) para adição em 1 clique.

## Testes e Validação
- Teste de extração ponta a ponta com o currículo real (`usr_560536e3f8b6701e_1789051573270_CV_Moacir_dev.pdf`): 27 hard skills identificadas com precisão e senioridade "Júnior" validada.
- Sincronização no SQLite: `isOnboardingComplete` validado com retorno `true`.
- Verificação de tipos TypeScript (`npx tsc --noEmit`): 0 erros.
