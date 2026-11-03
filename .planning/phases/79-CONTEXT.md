# Phase 79 Context — Gestão de Usuários, Permissões & Suporte (/admin/usuarios)

## Contexto e Objetivo
O BuscaVag conta com uma base crescente de candidatos cadastrados na plataforma. Para viabilizar a operação de suporte, controle de permissões e gestão comercial do SaaS, a **Phase 79** entrega:
1. **Painel Operacional em `/admin/usuarios`**: Listagem paginada no padrão Velzon Interactive com filtros de plano, status e papel, além de busca em tempo real por nome e e-mail.
2. **Ciclo de Vida & Suspensão de Contas**: Adição das colunas `status TEXT DEFAULT 'active'` e `force_password_change INTEGER DEFAULT 0` na tabela `users`. Bloqueio imediato no endpoint de autenticação de candidatos (`/api/auth/login`) para contas suspensas com HTTP 403.
3. **Mecanismo de Impersonate Auditável (Acesso em Suporte)**: Capacidade de o administrador autenticado gerar uma sessão temporária de candidato (`buscavag_session`) assinada com flag `impersonatedBy`, abrindo a área `/candidate` em nova aba para diagnóstico imediato e registrando o evento via `logAdminAction`.
4. **Reset de Senha Administrativo**: Geração de senha temporária segura randômica com hash scrypt e sinalização de troca obrigatória de senha no próximo acesso.
5. **Gestão de Planos SaaS (Free ↔ Pro)**: Ação rápida para upgrade/downgrade de planos diretamente no painel.
6. **Gaveta/Modal de Inspeção Detalhada do Candidato**: Visualização dos dados de `candidate_profiles` (cargo alvo, senioridade, cidade/UF, pretensão salarial, stack primária/secundária, bio e IA score), currículo analisado e métricas do Kanban.

---

## Decisões Arquiteturais e de Implementação (Locked Decisions)

### 1. Esquema de Banco de Dados e Ciclo de Vida do Usuário
- **Colunas na Tabela `users`**:
  - `status TEXT DEFAULT 'active'` ('active' | 'suspended')
  - `force_password_change INTEGER DEFAULT 0`
  - Índices dedicados:
    - `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`
    - `CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);`
- **Bloqueio de Contas Suspensas**:
  - No endpoint `/api/auth/login`: se `user.status === 'suspended'`, retornar HTTP 403:
    `{ success: false, error: 'Sua conta foi suspensa pela administração. Entre em contato com o suporte.' }`.

### 2. Mecanismo de Suporte / Impersonate
- **Token de Sessão com Metadados de Suporte**:
  - Em `src/lib/auth.ts`, estender `UserSession` com `impersonatedBy?: { adminId: string; adminEmail: string }`.
  - Endpoint `POST /api/admin/usuarios/[id]/impersonate`:
    - Valida sessão administrativa com `getAdminSessionUser(req)`.
    - Busca o usuário alvo.
    - Emite cookie `buscavag_session` assinado contendo os dados do candidato e o identificador do administrador responsável.
    - Grava auditoria detalhada via `logAdminAction`.
    - Retorna `{ success: true, redirectUrl: '/candidate' }`.

### 3. Reset de Senha pelo Suporte
- **Geração Segura de Credencial Temporária**:
  - Gerar senha randômica de 10 caracteres (ex: `BV-xxxx-xxxx`).
  - Calcular hash scrypt seguro compatível com `hashPassword()` do BuscaVag.
  - Atualizar `users` com `password_hash`, `force_password_change = 1` e `updated_at = datetime('now')`.
  - Exibir a senha temporária no modal com botão "Copiar Senha" para repasse ao candidato.
  - Gravar auditoria via `logAdminAction`.

### 4. Gestão de Planos SaaS
- **Ação Rápida de Plano**:
  - Atualização do campo `tier` ('free' ↔ 'premium').
  - Gravar auditoria via `logAdminAction`.

### 5. Repositório Administrativo de Usuários (`src/db/adminUserRepository.ts`)
- Métodos:
  - `getAdminUsers(params)`: paginação, busca, filtros combinados (`tier`, `status`, `role`).
  - `getAdminUserStats()`: contagem de Total, Pro/Premium, Free e Suspensos.
  - `getUserDetail(userId)`: consolidação dos dados de `users`, `candidate_profiles`, `candidate_resumes` e contagem de vagas salvas em `user_saved_jobs`.
  - `updateUserTier(userId, tier)`: atualização de plano.
  - `toggleUserSuspension(userId)`: alternância de status.
  - `resetUserPassword(userId)`: geração e gravação de senha temporária.

### 6. Interface Velzon Interactive (`/admin/usuarios`)
- **4 StatWidgets**:
  - Total de Usuários (primária)
  - Assinantes Pro (sucesso)
  - Usuários Gratuitos (info)
  - Contas Suspensas (perigo)
- **Barra de Operações**:
  - Campo de busca em tempo real com debounce.
  - Dropdowns: Plano (`Todos`, `Free`, `Pro`), Status (`Todos`, `Ativas`, `Suspensas`), Papel (`Todos`, `CANDIDATE`, `ADMIN`).
- **Tabela Velzon**:
  - Colunas: Usuário (Nome & E-mail), Papel, Plano SaaS, Onboarding, Status, Ações.
  - Ações por linha:
    - 👁️ Visualizar Perfil & Currículo (abre modal completo).
    - 🔄 Alterar Plano (Free ↔ Pro).
    - 🔒 Suspender / Reativar Conta.
    - 🔑 Reset de Senha (abre modal com senha temporária).
    - 👤 Impersonate (abrir `/candidate` como o usuário em nova aba).
- **Modais Velzon**:
  1. *Modal de Perfil do Candidato*: exibe dados cadastrais, cargo alvo, senioridade, pretensão salarial, modelo de trabalho, cidade/UF, stacks, bio, status de onboarding e resumo da análise de IA do currículo.
  2. *Modal de Reset de Senha*: exibe a senha gerada em bloco monoespaçado com botão "Copiar Senha" (feedback "Copiado!").
  3. *Modal de Confirmação de Suspensão / Alteração de Plano*.

---

## Verificação e Suíte de Testes da Fase (`src/test-phase79.ts`)
1. **T01**: Colunas `status` e `force_password_change` existem na tabela `users`.
2. **T02**: Tentativa de login de candidato suspenso é rejeitada com HTTP 403.
3. **T03**: Consulta paginada de usuários com busca e filtros combinados (`tier`, `status`, `role`).
4. **T04**: Obtenção de estatísticas consolidadas de usuários (Total, Pro, Free, Suspensos).
5. **T05**: Consulta consolidada de detalhes do candidato (`users` + `candidate_profiles` + `candidate_resumes` + Kanban stats).
6. **T06**: Alteração de plano SaaS (`free` ↔ `premium`).
7. **T07**: Suspensão e reativação de conta (`active` ↔ `suspended`).
8. **T08**: Reset de senha administrativo gera hash scrypt e ativa `force_password_change`.
9. **T09**: Geração de token de Impersonate com `impersonatedBy` assinado corretamente.
10. **T10**: Auditoria completa de ações de suporte via `logAdminAction`.
