# Phase 76 Context — Autenticação Admin Isolada & Sessão Dedicada com TOTP Configurável

## Contexto e Objetivo
O BuscaVag conta atualmente com autenticação de candidatos compartilhando o cookie `buscavag_session`. A **Phase 76** inaugura o **Milestone 21.0** estabelecendo o isolamento absoluto da infraestrutura administrativa:
1. Uma base de credenciais administrativa completamente separada dos candidatos (tabela dedicada `admin_users`).
2. Sessão criptográfica independente via cookie `admin_session` assinado com segredo exclusivo (`ADMIN_JWT_SECRET`).
3. Suporte a 2FA/TOTP com `otplib` e `qrcode`, configurável e com onboarding seguro via QR Code.
4. Middleware de proteção estrito em rotas `/admin/**` e `/api/admin/**`, com expiração deslizante de 2 horas.
5. Tela de login dedicada em `/admin/login` com branding institucional e auditoria em tempo real.

---

## Decisões Arquiteturais e de Implementação (Locked Decisions)

### 1. Esquema de Banco de Dados e Isolamento de Credenciais
- **Tabela Dedicada `admin_users`**:
  - `id TEXT PRIMARY KEY`
  - `email TEXT UNIQUE NOT NULL`
  - `password_hash TEXT NOT NULL` (scrypt com salt aleatório)
  - `name TEXT NOT NULL`
  - `totp_secret TEXT` (segredo Base32 do TOTP)
  - `totp_enabled INTEGER DEFAULT 0`
  - `created_at TEXT NOT NULL`
  - `updated_at TEXT NOT NULL`
  - `last_login_at TEXT`
- **Tabela de Sessões Administrativas `admin_sessions` (Rastreamento & Revogação)**:
  - `id TEXT PRIMARY KEY`
  - `admin_user_id TEXT NOT NULL`
  - `token_hash TEXT NOT NULL`
  - `ip_address TEXT`
  - `user_agent TEXT`
  - `expires_at TEXT NOT NULL`
  - `created_at TEXT NOT NULL`
  - `FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE`
  - Permite auditoria de acessos concorrentes, rastreamento de IP e revogação remota de tokens comprometidos.
- **Tabela de Configurações Administrativas `admin_settings`**:
  - `key TEXT PRIMARY KEY`
  - `value TEXT NOT NULL`
  - `updated_at TEXT NOT NULL`
  - Chave padrão: `totp_enabled` ('true' | 'false').
- **Seed Inicial para Desenvolvimento**:
  - Caso `admin_users` esteja vazia na inicialização, criar usuário admin padrão (`admin@buscavag.com.br`) ou carregar de variáveis de ambiente (`ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_PASSWORD`), garantindo que o fluxo e os testes unitários funcionem out-of-the-box.

### 2. Autenticação de Dois Fatores (2FA / TOTP) com `otplib` + `qrcode`
- **Bibliotecas**:
  - `otplib` para geração de segredos e validação RFC 6238 de tokens de 6 dígitos com janela de tolerância de 1 passo.
  - `qrcode` para geração de Data URL / QR Code escaneável por aplicativos autenticadores (Google Authenticator, Microsoft Authenticator, Authy, etc.).
- **Ativação Configurável**:
  - O 2FA é controlado pela flag global `ADMIN_TOTP_ENABLED` (env ou registro na tabela `admin_settings`).
- **Fluxo do Primeiro Acesso com TOTP Habilitado**:
  - Quando o 2FA estiver ativado globalmente e o admin ainda não possuir `totp_enabled = 1`, o login em `/admin/login` valida a senha e exibe o modal/tela intermediária com o QR Code e chave manual Base32.
  - O admin escaneia, insere o primeiro código de 6 dígitos para confirmação. Validado com sucesso, o sistema persiste `totp_secret` e `totp_enabled = 1`, emitindo a sessão.
- **Fluxo com TOTP Já Configurado**:
  - O formulário `/admin/login` solicita `Email`, `Senha` e `Código 2FA (6 dígitos)` (ou solicitação sequencial / condicional).

### 3. Sessão Isolada (`admin_session`) & Políticas de Expiração
- **Cookie Dedicado**:
  - Nome: `admin_session`.
  - Configurações: `httpOnly: true`, `sameSite: 'strict'`, `secure: process.env.NODE_ENV === 'production'`, `path: '/'`.
  - Duração: 2 horas (`maxAge: 2 * 60 * 60`).
- **Segredo Dedicado (`ADMIN_JWT_SECRET`)**:
  - Não compartilha a chave `AUTH_SECRET` utilizada para candidatos.
  - Validação estrita em produção (bloqueio se ausente ou < 32 caracteres) e fallback seguro em desenvolvimento.
- **Renovação Deslizante (Sliding Expiration)**:
  - A cada requisição autenticada ativa no painel admin, a sessão é renovada estendendo o prazo para mais 2 horas (atualizando também o `expires_at` em `admin_sessions`).

### 4. Middleware e Proteção de Rotas
- **Atualização de `src/middleware.ts`**:
  - Protege `/admin/:path*` e `/api/admin/:path*`.
  - **Exceções Expressas**:
    - `/admin/login` (página de login)
    - `/api/admin/auth/login` (endpoint de autenticação)
    - `/api/admin/auth/setup-totp` (confirmação inicial de 2FA se necessário)
  - Se acessar `/admin/**` sem `admin_session` válida: redireciona imediatamente para `/admin/login`.
  - Se chamar `/api/admin/**` sem `admin_session`: retorna HTTP 401 `{ success: false, error: 'Sessão administrativa ausente ou inválida' }`.

### 5. Design System Velzon Interactive (Themesbrand) & Tela de Login Admin (`/admin/login`)
- **Identidade Visual Velzon**:
  - Sidebar Navy `#1f2430` com menus estruturados e tipografia limpa.
  - Fundo institucional suave `#f3f3f9` (dark mode `#141824`).
  - Cor primária e acentos em Índigo `#405189` (hover `#364574`).
  - Acabamento **soft-tint**: cards e widgets com cantos ligeiramente arredondados (`rounded-lg`), bordas sutis (`border-[#e9ebec]`), sombras suaves e badges com fundo pastel/soft e texto saturado.
- **Tela de Login (`/admin/login`)**:
  - Card centralizado estilizado no padrão Velzon com topo em Índigo `#405189` e logo institucional do BuscaVag Admin.
  - Feedback em tempo real com estados de loading, alertas de erro com ícones e transições suaves.
  - Modal ou etapa intermediária para ativação de TOTP com QR Code integrado.

### 6. Fundação de Componentes Velzon Reutilizáveis
- **Componentes de Layout (`src/components/admin/layout/`)**:
  - `AdminLayout.tsx`: Casca mestre do painel com Header, Sidebar colapsável e área principal `#f3f3f9`.
  - `AdminSidebar.tsx`: Sidebar Navy `#1f2430` com navegação organizada em categorias (Dashboard, Vagas, Usuários, Pagamentos, Mensageria, Logs).
  - `AdminHeader.tsx`: Barra superior com breadcrumbs, perfil do administrador autenticado, indicador de status e botão de logout.
- **Componentes UI Reutilizáveis (`src/components/admin/ui/`)**:
  - `VelzonCard.tsx`: Card padrão com acabamento soft-tint, header personalizável com título/ações e corpo com padding equilibrado.
  - `VelzonBadge.tsx`: Badges estilizados com padrão soft-tint nas variantes primária (índigo), sucesso (esmeralda), atenção (âmbar) e perigo (vermelho).
  - `VelzonStatWidget.tsx`: Widget de KPI para métricas de topo com ícone em container circular soft-tint, valor em destaque e variação percentual.
  - `VelzonModal.tsx`: Diálogo modal com transição suave, backdrop escurecido e botões temáticos para confirmações de ações críticas.

### 7. Auditoria de Segurança
- Registro no `system_logs` para cada evento com IP e User-Agent:
  - `ADMIN_LOGIN_SUCCESS`
  - `ADMIN_LOGIN_INVALID_PASSWORD`
  - `ADMIN_LOGIN_INVALID_TOTP`
  - `ADMIN_TOTP_ACTIVATED`
  - `ADMIN_LOGOUT`
  - `ADMIN_SESSION_REVOKED`

---

## Verificação e Suíte de Testes da Fase
- Criação de `src/test-phase76.ts` cobrindo:
  1. Criação e isolamento das tabelas `admin_users`, `admin_sessions` e `admin_settings`.
  2. Validação criptográfica do token `admin_session` com `ADMIN_JWT_SECRET`.
  3. Rejeição de tokens adulterados, expirados ou revogados em `admin_sessions`.
  4. Geração e validação de tokens TOTP com `otplib`.
  5. Comportamento do middleware para rotas protegidas vs exceção do `/admin/login`.
  6. Renovação deslizante do cookie de sessão e persistência de IP/User-Agent.
- Verificação de não-regressão: `npm test` (9/9 suítes verdes) e `npm run build:next`.
