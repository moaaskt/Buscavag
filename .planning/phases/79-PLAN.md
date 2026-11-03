# Phase 79 Plan: Gestão de Usuários, Permissões & Suporte (/admin/usuarios)

## Vision & Goal
Implementar uma central completa de gestão de usuários e suporte em `/admin/usuarios` utilizando o **Design System Velzon Interactive (Themesbrand)**. O sistema adiciona controle estrito de ciclo de vida com as colunas `status` (`'active'` | `'suspended'`) e `force_password_change` na tabela `users`, bloqueando imediatamente o acesso de contas suspensas em `/api/auth/login`. Oferece operações administrativas de alto valor: alteração ágil de plano SaaS (`Free` ↔ `Pro`), redefinição segura de senha com credencial temporária, inspeção profunda de perfil e análise de currículo via IA, e o recurso de **Impersonate Auditável**, permitindo ao suporte acessar a visão do candidato em tempo real com rastreamento completo via `logAdminAction`.

---

## Requirements Addressed

- **`REQ-79-01` (Esquema SQLite & Ciclo de Vida do Usuário)**:
  - Adicionar colunas `status TEXT DEFAULT 'active'` e `force_password_change INTEGER DEFAULT 0` na tabela `users` com índices `idx_users_status` e `idx_users_tier`.
  - Migração idempotente preenchendo usuários legados com `status = 'active'`.

- **`REQ-79-02` (Bloqueio de Contas Suspensas no Login)**:
  - No endpoint `/api/auth/login`, validar o status do usuário. Caso `status === 'suspended'`, retornar HTTP 403:
    `{ success: false, error: 'Sua conta foi suspensa pela administração. Entre em contato com o suporte.' }`.

- **`REQ-79-03` (Repositório Administrativo de Usuários - AdminUserRepository)**:
  - Implementar métodos:
    - `getAdminUsers(params)`: Paginação, busca textual (`name`, `email`), filtros combinados (`tier`, `status`, `role`).
    - `getAdminUserStats()`: Contagem em tempo real de Total de Usuários, Assinantes Pro/Premium, Gratuitos (Free) e Suspensos.
    - `getUserDetail(userId)`: Consolidação de `users`, `candidate_profiles`, `candidate_resumes` e contagem de vagas salvas em `user_saved_jobs`.
    - `updateUserTier(userId, tier)`: Upgrade/downgrade de plano (`free` ↔ `premium`).
    - `toggleUserSuspension(userId)`: Alternância de suspensão (`active` ↔ `suspended`).
    - `resetUserPassword(userId)`: Geração de senha temporária segura randômica, cálculo de hash scrypt e definição de `force_password_change = 1`.

- **`REQ-79-04` (Mecanismo de Impersonate Auditável)**:
  - Em `src/lib/auth.ts`, estender `UserSession` com `impersonatedBy?: { adminId: string; adminEmail: string }`.
  - Endpoint `POST /api/admin/usuarios/[id]/impersonate`: Emite cookie `buscavag_session` assinado para o candidato alvo e registra log auditável com IP e dados do operador responsável.

- **`REQ-79-05` (Endpoints REST Administrativos)**:
  - `GET /api/admin/usuarios`: Listagem paginada, filtros e métricas de topo.
  - `GET /api/admin/usuarios/[id]`: Detalhes completos do perfil, currículo e métricas de Kanban.
  - `PATCH /api/admin/usuarios/[id]`: Ações de alteração de plano, toggle de suspensão e reset de senha, todas auditadas com `logAdminAction`.
  - `POST /api/admin/usuarios/[id]/impersonate`: Disparo de sessão de impersonate.

- **`REQ-79-06` (Interface Velzon Interactive `/admin/usuarios`)**:
  - 4 `VelzonStatWidget` (Total de Usuários, Assinantes Pro, Usuários Gratuitos, Contas Suspensas).
  - Barra de operações com busca em tempo real, seleção de Plano, Status e Papel.
  - Tabela Velzon com badges soft-tint e ações rápidas (Ver Perfil, Alterar Plano, Suspender/Reativar, Reset de Senha, Impersonate).
  - Modais Velzon:
    - Modal de Perfil e Currículo Completo do Candidato.
    - Modal de Reset de Senha com senha temporária monoespaçada e botão de cópia rápida.
    - Modais de Confirmação de Suspensão e Alteração de Plano.

- **`REQ-79-07` (Suíte de Testes Automatizada)**:
  - Criar `src/test-phase79.ts` com 10 testes determinísticos cobrindo schema, bloqueio no login, listagem paginada, estatísticas, consulta detalhada, alteração de plano, suspensão, reset de senha, impersonate e auditoria via `logAdminAction`.

---

## Proposed Changes

### Component 1: Banco de Dados & Esquema SQLite

#### [MODIFY] [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar colunas `status TEXT DEFAULT 'active'` e `force_password_change INTEGER DEFAULT 0` na definição de `users`.
- Migração automática em `initDatabase()` e criação dos índices `idx_users_status` e `idx_users_tier`.

---

### Component 2: Autenticação de Candidatos & Impersonate

#### [MODIFY] [src/app/api/auth/login/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/auth/login/route.ts)
- Bloquear login de usuários suspensos retornando HTTP 403.

#### [MODIFY] [src/lib/auth.ts](file:///home/moa-dev/projetos/buscavag/src/lib/auth.ts)
- Adicionar campo opcional `impersonatedBy?: { adminId: string; adminEmail: string }` na interface `UserSession`.

---

### Component 3: Repositório Administrativo de Usuários

#### [NEW] [src/db/adminUserRepository.ts](file:///home/moa-dev/projetos/buscavag/src/db/adminUserRepository.ts)
- Implementar classe `AdminUserRepository` com `getAdminUsers`, `getAdminUserStats`, `getUserDetail`, `updateUserTier`, `toggleUserSuspension`, `resetUserPassword`.

---

### Component 4: Endpoints REST Administrativos

#### [NEW] [src/app/api/admin/usuarios/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/usuarios/route.ts)
- `GET`: Listagem paginada e contadores de usuários.

#### [NEW] [src/app/api/admin/usuarios/[id]/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/usuarios/[id]/route.ts)
- `GET`: Detalhes completos do perfil, currículo e métricas de Kanban.
- `PATCH`: Ações de suporte (`change_tier`, `toggle_status`, `reset_password`).

#### [NEW] [src/app/api/admin/usuarios/[id]/impersonate/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/usuarios/[id]/impersonate/route.ts)
- `POST`: Geração de cookie `buscavag_session` com flag `impersonatedBy` e auditoria.

---

### Component 5: Interface Velzon Interactive (/admin/usuarios)

#### [NEW] [src/app/admin/usuarios/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/usuarios/page.tsx)
- Construído dentro do `AdminLayout`.
- 4 `VelzonStatWidget` analíticos.
- Barra de operações com busca em tempo real e filtros de Plano, Status e Papel.
- Tabela de usuários com badges soft-tint e ações rápidas.
- Modais Velzon de Inspeção de Perfil, Reset de Senha e Confirmações.

---

### Component 6: Testes Automatizados & Validação

#### [NEW] [src/test-phase79.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase79.ts)
- Suíte completa com 10 testes determinísticos cobrindo todos os cenários da fase.

---

## Verification Plan

### Automated Tests
```bash
npx tsx src/test-phase79.ts
npx tsx src/test-phase78.ts
npx tsx src/test-phase77.ts
npx tsx src/test-phase76.ts
npm test
npx tsc --noEmit
npm run build:next
```

### Manual Verification
- Acessar `/admin/usuarios` com sessão de admin.
- Testar a filtragem por nome, plano e status.
- Abrir o modal de detalhes do candidato e checar perfil/currículo.
- Testar a alteração de plano Free ↔ Pro.
- Testar a suspensão de conta e verificar que login em `/login` retorna 403.
- Testar o reset de senha com cópia da senha temporária.
- Testar o impersonate e verificar acesso à área do candidato em nova aba.
