---
task: 20261116-fix-chrome-linkedin-launcher
description: Correção do inicializador do Chrome dedicado para o LinkedIn (resolução de queda precoce, loop de redirecionamento e sincronização automática de cookies)
date: 2026-11-16
status: complete
---

# Quick Task: Correção do Inicializador Chrome LinkedIn (`npm run chrome:linkedin`)

## Diagnóstico do Problema
1. **Página "Fora do Ar" / Erro**: O script abria diretamente `https://www.linkedin.com/feed/` em um perfil sem sessão ativa. O LinkedIn respondia com redirecionamentos 302 seguidos de barreira de bot/Cloudflare challenge (HTTP 403), gerando a mensagem de "Página não está funcionando" / "Fora do ar".
2. **Queda precoce do Chrome**: O diretório `C:\buscavag-chrome-profile` continha dumps antigos de crash e conflito de inicialização, além de formatação com aspas escapadas `\"` no `-ArgumentList` do PowerShell.
3. **CDP moderno**: Faltava a flag `--remote-allow-origins=*` exigida pelo Chrome moderno (v115+) para conexões CDP seguras na porta 9222.
4. **Sincronização de Sessão**: `scripts/auth-linkedin.ts` não atualizava automaticamente as variáveis `LINKEDIN_SESSION_COOKIE` e `LINKEDIN_JSESSIONID` no arquivo `.env`.

## Plano de Execução
1. **Ajustar `scripts/start-chrome-linkedin.ps1`**:
   - Limpar arquivos residuais corrompidos no perfil.
   - Abrir diretamente `https://www.linkedin.com/login` (página oficial de login HTTP 200).
   - Incluir `--remote-allow-origins=*` e argumentos sanitizados para o PowerShell.
   - Finalizar qualquer processo zumbi anterior na porta 9222 antes de iniciar.
2. **Aprimorar `scripts/auth-linkedin.ts`**:
   - Detectar login ativo via CDP.
   - Salvar `li-cookies.json` E atualizar automaticamente o `.env` com `LINKEDIN_SESSION_COOKIE` e `LINKEDIN_JSESSIONID`.
3. **Testar e Validar**:
   - Testar inicialização do Chrome na porta 9222.
   - Testar detecção de porta e conexão CDP.
   - Rodar suíte unificada de testes (`npm test`).
