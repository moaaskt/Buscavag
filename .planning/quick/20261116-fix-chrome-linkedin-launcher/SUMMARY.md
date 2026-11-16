---
status: complete
date: 2026-11-16
---
# Quick Task Summary: Correção do Inicializador Chrome LinkedIn (`npm run chrome:linkedin`)

**Data:** 16 de Novembro de 2026  
**Status:** complete ✓  

## 1. Problemas Diagnosticados & Causas Raízes
1. **Página "Fora do Ar" / Loop de Redirecionamento (302 -> 403)**:
   - O comando abria diretamente `https://www.linkedin.com/feed/` em um perfil do Chrome sem cookies de autenticação válidos.
   - O LinkedIn enviava um redirecionamento 302 para `https://www.linkedin.com/uas/login?session_redirect=...` que por sua vez acionava o Cloudflare Bot Mitigation (HTTP 403 Forbidden com página "Just a moment..."). No navegador, o usuário via o erro de "Esta página não está funcionando / fora do ar".
2. **Queda Imediata do Chrome (Crash após 2 segundos)**:
   - O diretório `C:\buscavag-chrome-profile` continha arquivos corrompidos de sessões anteriores (`Crashpad/reports` e travas `lockfile`/`Singleton`), além de formatação incorreta com aspas escapadas `\"` na chamada PowerShell do `Start-Process`.
3. **Bloqueio de Depuração Remota (CDP)**:
   - Versões modernas do Google Chrome (v115+) exigem a flag `--remote-allow-origins=*` para aceitar conexões WebSocket do CDP (Chrome DevTools Protocol) na porta 9222.
4. **Falta de Sincronização Automática com o `.env`**:
   - O script `scripts/auth-linkedin.ts` salvava os cookies apenas no arquivo `li-cookies.json`, exigindo que o usuário copiasse manualmente o `li_at` para a variável `LINKEDIN_SESSION_COOKIE` no `.env`.

---

## 2. Soluções Implementadas

1. **Correção de [`scripts/start-chrome-linkedin.ps1`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/scripts/start-chrome-linkedin.ps1)**:
   - **URL Oficial de Login**: Alterada a URL inicial de `https://www.linkedin.com/feed/` para `https://www.linkedin.com/login` (que retorna HTTP 200 limpo e sem loops).
   - **Limpeza Automática de Travas e Crash**: Adicionada remoção preventiva de `Singleton*`, `lockfile` e `Crashpad/reports/*` antes da inicialização.
   - **Liberação de Porta Prévia**: Se a porta 9222 já estiver aberta por processo zumbi, finaliza-o automaticamente para evitar conflito.
   - **Argumentos CDP Seguros**: Incluída a flag `--remote-allow-origins=*` e formatação limpa de parâmetros sem aspas aninhadas quebradas.

2. **Aprimoramento de [`scripts/auth-linkedin.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/scripts/auth-linkedin.ts)**:
   - **Detecção Inteligente com Espera Ativa**: Se a janela do Chrome estiver na tela de login, o script aguarda até 90 segundos com indicador de progresso no terminal enquanto o usuário insere as credenciais.
   - **Sincronização Bidirecional**: Assim que o feed é detectado, extrai `li_at` e `JSESSIONID`, salva o arquivo `li-cookies.json` E atualiza automaticamente as chaves `LINKEDIN_SESSION_COOKIE` e `LINKEDIN_JSESSIONID` no arquivo `.env`.
   - **Reset de Cooldown**: Remove o arquivo `data/linkedin-cooldown.json` automaticamente para que as novas coletas comecem de imediato.

---

## 3. Validações Realizadas
1. **Teste de Inicialização do Chrome e Porta 9222**:
   - Chrome inicia sem crash (`HasExited: False`).
   - Porta 9222 entra em estado de `Listen` imediatamente.
   - Playwright conecta via `connectOverCDP('http://127.0.0.1:9222')` com sucesso instantâneo.
2. **Suíte Unificada de Testes (`npm test`)**:
   - 10 de 10 suítes executadas com sucesso total (16.89s).
