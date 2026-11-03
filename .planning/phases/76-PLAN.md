# Phase 76 Plan: Autenticação Admin Isolada & Sessão Dedicada com TOTP Configurável e Fundação Velzon

## Vision & Goal
Estabelecer o isolamento de segurança absoluto do ecossistema administrativo do BuscaVag, segregando completamente as credenciais (tabela dedicada `admin_users`), rastreamento de acessos (tabela `admin_sessions`), segredo criptográfico (`ADMIN_JWT_SECRET`) e cookie de autenticação (`admin_session`). A fase implementa autenticação em dois fatores (2FA / TOTP) via `otplib` e `qrcode` de forma configurável com onboarding seguro, atualiza o middleware de proteção com tolerância a rotas públicas administrativas e renovação deslizante de 2h, e estabelece a fundação de layout e componentes reutilizáveis baseada no **Design System Velzon Interactive (Themesbrand)** em `src/components/admin/`.

---

## Requirements Addressed

- **`REQ-76-01` (Esquema DB Isolado)**: Criar tabelas SQLite `admin_users`, `admin_sessions` e `admin_settings` no `src/db/index.ts` e implementar `src/db/adminRepository.ts` com métodos de CRUD, auditoria, revogação e seed automático em ambiente de desenvolvimento.
- **`REQ-76-02` (Sessão & Criptografia Dedicada)**: Implementar `src/lib/admin-auth.ts` com validação estrita de `ADMIN_JWT_SECRET`, geração/validação de tokens HMAC-SHA256, hash SHA-256 de token para persistência em `admin_sessions`, cookie `admin_session` (`HttpOnly`, `SameSite=Strict`, `Secure` em prod, `maxAge: 7200`) e sliding expiration de 2 horas.
- **`REQ-76-03` (2FA / TOTP Configurável)**: Instalar `otplib` e `qrcode`, implementar utilitário em `src/lib/totp.ts` para geração de segredo Base32, URL otpauth, geração de QR Code em Data URL e validação RFC 6238 com tolerância de 1 passo. Suporte a ativação via `ADMIN_TOTP_ENABLED` e onboarding guiado no primeiro acesso.
- **`REQ-76-04` (Middleware de Proteção Admin)**: Atualizar `src/middleware.ts` e implementar `src/lib/admin-edge-auth.ts` para proteger rotas `/admin/:path*` e `/api/admin/:path*`, excetuando explicitamente `/admin/login`, `/api/admin/auth/login` e `/api/admin/auth/setup-totp`.
- **`REQ-76-05` (Fundação Velzon Interactive)**: Criar os componentes modulares reutilizáveis com paleta Velzon (Navy `#1f2430`, Fundo `#f3f3f9`, Índigo `#405189`, acabamento soft-tint):
  - Layout: `AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx` em `src/components/admin/layout/`.
  - UI: `VelzonCard.tsx`, `VelzonBadge.tsx`, `VelzonStatWidget.tsx`, `VelzonModal.tsx` em `src/components/admin/ui/`.
- **`REQ-76-06` (Tela de Login & Rotas de API)**: Criar a página de login dedicada em `src/app/admin/login/page.tsx` no padrão Velzon e implementar as rotas de API em `src/app/api/admin/auth/login/route.ts`, `logout/route.ts`, `me/route.ts` e `setup-totp/route.ts` com registro de auditoria em `system_logs`.
- **`REQ-76-07` (Suíte de Testes Automatizada)**: Criar a suíte `src/test-phase76.ts` com testes determinísticos cobrindo schema isolado, tokens dedicados, rejeição de credenciais de candidatos, revogação em `admin_sessions`, validação TOTP e exceções no middleware.

---

## Proposed Changes

### Component 1: Dependências do Sistema

#### [INSTALL] Pacotes de 2FA e QR Code
- Instalação de bibliotecas leves de autenticação e geração gráfica:
  ```bash
  npm install otplib qrcode
  npm install -D @types/qrcode
  ```

---

### Component 2: Banco de Dados e Repositório Administrativo

#### [MODIFY] [index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar no script de inicialização do SQLite:
  ```sql
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    totp_secret TEXT,
    totp_enabled INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    admin_user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  ```

#### [NEW] [adminRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/adminRepository.ts)
- Implementar classe `AdminRepository` com métodos:
  - `getAdminByEmail(email: string): AdminUser | null`
  - `getAdminById(id: string): AdminUser | null`
  - `createAdminUser(data: CreateAdminDTO): AdminUser`
  - `updateAdminTotp(id: string, secret: string, enabled: boolean): void`
  - `updateLastLogin(id: string): void`
  - `createSession(data: CreateAdminSessionDTO): AdminSession`
  - `getSessionByTokenHash(tokenHash: string): AdminSession | null`
  - `touchSession(sessionId: string, newExpiresAt: string): void`
  - `revokeSession(sessionId: string): void`
  - `revokeAllSessionsForUser(adminUserId: string): void`
  - `getSetting(key: string, defaultValue?: string): string`
  - `setSetting(key: string, value: string): void`
  - `ensureSeedAdmin(): Promise<void>` (cria admin padrão para desenvolvimento caso `admin_users` esteja vazia)

---

### Component 3: Núcleo de Autenticação Admin & Utilitário TOTP

#### [NEW] [admin-auth.ts](file:///home/moa-dev/projetos/buscavag/src/lib/admin-auth.ts)
- Gerenciamento de segredo `ADMIN_JWT_SECRET` com validação de segurança estrita em produção (mínimo 32 chars).
- Constante do cookie: `ADMIN_SESSION_COOKIE_NAME = 'admin_session'`.
- Funções criptográficas:
  - `createAdminSessionToken(payload: AdminSessionPayload): { token: string, tokenHash: string, expiresAt: string }`
  - `verifyAdminSessionToken(token: string): AdminSessionPayload | null`
  - `hashTokenForStorage(token: string): string` (SHA-256)
  - `getAdminSessionUser(req?: NextRequest): Promise<AdminSessionUser | null>` (valida token criptográfico e checa expiração em `admin_sessions`)

#### [NEW] [admin-edge-auth.ts](file:///home/moa-dev/projetos/buscavag/src/lib/admin-edge-auth.ts)
- Decodificador leve compatível com Edge runtime para extração inicial de payload do cookie `admin_session`.

#### [NEW] [totp.ts](file:///home/moa-dev/projetos/buscavag/src/lib/totp.ts)
- Utilitário baseado em `otplib` e `qrcode`:
  - `generateTotpSecret(): string`
  - `generateTotpUri(email: string, secret: string, issuer?: string): string`
  - `generateQrCodeDataUrl(otpAuthUri: string): Promise<string>`
  - `verifyTotpToken(token: string, secret: string): boolean`
  - `isTotpEnabledGlobally(): boolean` (avalia `process.env.ADMIN_TOTP_ENABLED` e `admin_settings`)

---

### Component 4: Middleware e Proteção de Rotas

#### [MODIFY] [middleware.ts](file:///home/moa-dev/projetos/buscavag/src/middleware.ts)
- Atualizar a função do middleware:
  - Isolar tratamento de rotas `/admin/**` e `/api/admin/**`:
    - Lista de exceções públicas:
      - `/admin/login`
      - `/api/admin/auth/login`
      - `/api/admin/auth/setup-totp`
    - Para qualquer outra rota sob `/admin` ou `/api/admin`:
      - Lê cookie `admin_session`.
      - Se ausente ou payload inválido/expirado:
        - Se rota de API (`/api/admin/**`): responde HTTP 401 `{ success: false, error: 'Sessão administrativa ausente ou inválida' }`.
        - Se página (`/admin/**`): redireciona para `/admin/login`.
  - Assegurar que a sessão de candidato (`buscavag_session`) **NÃO** conceda acesso às rotas administrativas, garantindo isolamento total.

---

### Component 5: Endpoints de Autenticação Administrativa

#### [NEW] [login/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/auth/login/route.ts)
- POST: Valida `email`, `password` e `totp_code` (condicional).
  - Se usuário existir e senha válida:
    - Se TOTP habilitado globalmente e usuário sem TOTP: retorna `{ success: true, requireSetupTotp: true, tempToken: ... }`.
    - Se TOTP ativo no usuário: valida `totp_code`. Falha emite 401 e loga `ADMIN_LOGIN_INVALID_TOTP`.
    - Sucesso: cria registro em `admin_sessions` com IP e User-Agent, define cookie `admin_session` e loga `ADMIN_LOGIN_SUCCESS`.

#### [NEW] [setup-totp/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/auth/setup-totp/route.ts)
- GET: Gera segredo e Data URL de QR Code para primeiro setup.
- POST: Valida o primeiro código de 6 dígitos informado pelo admin, grava `totp_secret` e `totp_enabled = 1` no banco e emite a sessão `admin_session`.

#### [NEW] [logout/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/auth/logout/route.ts)
- POST: Revoga sessão em `admin_sessions`, remove cookie `admin_session` e registra log `ADMIN_LOGOUT`.

#### [NEW] [me/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/auth/me/route.ts)
- GET: Retorna dados do admin autenticado e status do 2FA.

---

### Component 6: Fundação de Componentes Velzon Interactive (Themesbrand)

#### [NEW] Componentes de Layout (`src/components/admin/layout/`)
1. **`AdminLayout.tsx`**: Layout principal do painel integrando Sidebar, Header, container com fundo `#f3f3f9` (dark `#141824`) e controle de estado colapsado.
2. **`AdminSidebar.tsx`**: Navegação lateral Navy `#1f2430` com categorias:
   - Dashboard
   - Vagas (Phase 78)
   - Logs & Auditoria (Phase 77)
   - Usuários (Phase 79)
   - Financeiro (Phase 80)
   - Mensageria (Phase 81)
3. **`AdminHeader.tsx`**: Header superior com indicador de ambiente, avatar/nome do admin, botão de logout e status de 2FA.

#### [NEW] Componentes UI Reutilizáveis (`src/components/admin/ui/`)
1. **`VelzonCard.tsx`**: Card com borda `#e9ebec` (dark `#232733`), acabamento soft-tint, header com title/badge/actions e body com padding equilibrado.
2. **`VelzonBadge.tsx`**: Badges temáticos soft-tint (`primary`, `success`, `warning`, `danger`, `info`).
3. **`VelzonStatWidget.tsx`**: Widget de KPI com container circular para ícone, valor em destaque e indicador de variação positiva/negativa.
4. **`VelzonModal.tsx`**: Modal com overlay suave, cabeçalho Velzon e botões temáticos para confirmações críticas e setup de 2FA.

---

### Component 7: Interface de Login Dedicada e Integração no Dashboard

#### [NEW] [page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/login/page.tsx)
- Página de login `/admin/login` estilizada no padrão Velzon Interactive:
  - Background institucional `#f3f3f9` com card centralizado elegante.
  - Campos de E-mail e Senha com ícones Lucide e feedback de validação.
  - Campo condicional de código TOTP (6 dígitos).
  - Modal integrado com QR Code caso seja o primeiro acesso e 2FA esteja ativado.

#### [MODIFY] [page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/page.tsx)
- Envolver o dashboard administrativo existente com `AdminLayout`, aproveitando a nova estrutura visual Velzon sem quebrar os monitores e funcionalidades de scrapers existentes.

---

### Component 8: Suíte de Testes Automatizada (`src/test-phase76.ts`)

#### [NEW] [test-phase76.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase76.ts)
- Suíte automatizada com cenários:
  1. **T01**: Criação e persistência na tabela `admin_users` isolada de `users`.
  2. **T02**: Criação de token `admin_session` assinado com `ADMIN_JWT_SECRET` e validação com sucesso.
  3. **T03**: Rejeição de token de candidato (`buscavag_session` assinado com `AUTH_SECRET`) pelo validador de admin.
  4. **T04**: Rejeição de token adulterado ou expirado.
  5. **T05**: Registro de sessão em `admin_sessions` e revogação remota bem-sucedida.
  6. **T06**: Geração de segredo TOTP e verificação determinística de token RFC 6238 com `otplib`.
  7. **T07**: Geração de QR Code em formato Data URL para onboarding 2FA.
  8. **T08**: Simulação de middleware garantindo bloqueio de rotas protegidas sem sessão e liberação de `/admin/login`.
  9. **T09**: Sliding expiration (renovação de `expires_at` em sessão ativa).
  10. **T10**: Seed automático em ambiente de desenvolvimento garantindo admin padrão inicial.

---

## Verification Plan

### Automated Tests
1. Instalação e execução da suíte dedicada da Phase 76:
   ```bash
   npx tsx src/test-phase76.ts
   ```
2. Execução da suíte de regressão da fase anterior:
   ```bash
   npx tsx src/test-phase75.ts
   ```
3. Execução do test runner unificado do BuscaVag:
   ```bash
   npm test
   ```
4. Verificação de compilação estrita e rotas Next.js:
   ```bash
   npm run build:next
   ```

### Manual Verification
- Acessar `/admin/login` em aba anônima e verificar a renderização do formulário no padrão Velzon.
- Tentar acessar `/admin` sem login e confirmar o redirecionamento automático para `/admin/login`.
- Realizar login com as credenciais administrativas e confirmar a criação do cookie `admin_session`.
- Testar o fluxo de ativação de 2FA escaneando o QR Code ou digitando o token de 6 dígitos.
- Testar o botão de Logout e confirmar a revogação da sessão e redirecionamento para o login.
