# Roadmap: Milestone 25.0 — Personal Workspace & Redesign AdminCN (shadcn/ui)

## Active Milestone: v25.0

### Phase Summary

| Phase | Title | Focus & Scope | Validation Gate | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **99** | Fundação do Design System, Tokens & Skill GSD | Criação da skill `buscavag-design-system`, tokens em `globals.css`, verificação do MCP/base AdminCN e port de componentes shadcn essenciais. | Componentes básicos renderizando, tokens neutros, sem quebra de CSS legado. | Complete ✓ |
| **100** | Workspace Shell Unificado & Validação Visual | Implementação da casca única (`Sidebar` Base UI oficial `base-nova`, `Header`, `Breadcrumbs`, Dark/Light mode neutro, resolução de conflitos e segurança). | **Gate Visual & Integrado Aprovado**: Auditoria automatizada via Playwright/Node (29/29 testes de segurança, 0px overlap, SSR anti-FOUC). | Complete ✓ |
| **101** | Descomissionamento Comercial & Unificação de Sessão | Neutralização de limites artificiais Free/Pro, desativação de paywalls/UpgradeModal, preservação integral de dados financeiros e transição de sessão. | Limites neutralizados para ilimitado, zero paywalls na UI, tabelas `subscriptions` e `payments` 100% íntegras no SQLite. | Ready (Discovery Concluído) |
| **102** | Migração do Módulo "Minha Carreira" | Port do Feed de Vagas, Kanban e Perfil/Diagnóstico de CV para o Workspace Shell sob o novo Design System. | Não-regressão em matching IA, drag-and-drop no Kanban, upload de CV e responsividade. | Pending |
| **103** | Migração dos Módulos "Operação & Coleta" & "Inteligência" | Port da Central de Scrapers (34 fontes), Terminal SSE, Gestão de Vagas, Empresas B2B e Logs de Auditoria. | Não-regressão em streaming de logs SSE, disparos de scrapers, filtros e responsividade. | Pending |
| **104** | Migração dos Módulos "Comunicação" & "Gestão" | Port do Hub de Mensageria (Telegram & WhatsApp) e Gestão de Usuários (RBAC, edições, impersonate). | Não-regressão em disparos de mensagens, segurança RBAC e ferramentas de suporte. | Pending |
| **105** | Limpeza Controlada, Testes E2E & Auditoria de Entrega | Validação da suíte de testes de ponta a ponta, auditoria de integridade visual e funcional, geração do `v25.0-MILESTONE-AUDIT.md`. | 100% de testes verdes, sem rotas órfãs, checklist de Design System aprovado. | Pending |

---

## Detailed Phase Breakdown

### Phase 99: Fundação do Design System, Tokens & Skill GSD Permanente
- **Objetivo**: Estabelecer a fundação obrigatória de interface do projeto para todos os agentes GSD e migrar o núcleo de componentes shadcn/ui.
- **Entregas**:
  1. Criação do arquivo de Skill: `.gemini/config/skills/buscavag-design-system/SKILL.md` contendo tokens, regras de UI/UX, checklist de validação visual e diretriz de consulta ao MCP shadcn ou à base `admincn-v1.0.0`.
  2. Ajuste fino de tokens em `src/app/globals.css` (paleta neutra profissional, raio de borda, tipografia, sem estética genérica de IA).
  3. Port dos componentes essenciais de `admincn-v1.0.0/src/components/ui/` para `src/components/ui/` (`sidebar`, `breadcrumb`, `sheet`, `collapsible`, `separator`, `dropdown-menu`, `skeleton`, `sonner`, `input-otp`).
- **Status**: Concluído e homologado.

### Phase 100: Workspace Shell Unificado & Validação Visual
- **Objetivo**: Construir a casca unificada de aplicação (`WorkspaceLayout`) baseada na arquitetura oficial Base UI (`base-nova`) com navegação centralizada em 5 grupos, RBAC discreto, segurança de sessão e Dark Mode neutro.
- **Entregas Concluídas**:
  1. **Segurança & Resolução de Identidade (Unidade 1)**:
     - Detecção centralizada de conflito de sessão (`checkAdminSessionSecurity`).
     - Rota `/api/workspace/resolve-identity` para resolução atômica de identidade.
     - Rotação segura de sessão (`rotateSessionAtomic`) e mitigação anti-CSRF.
     - Proteção server-side em rotas de scrapers e `/api/admin/jobs/purge-non-tech`.
     - Suíte de segurança com 29/29 testes aprovados (`src/test-phase100-security.ts`).
  2. **Workspace Shell & Base UI `base-nova` (Unidade 2)**:
     - `WorkspaceSidebar.tsx`: Implementação oficial shadcn/ui Base UI (`base-nova`) com `@base-ui/react`, colapsável em desktop, tooltips flutuantes, atalhos de teclado (`Ctrl+B`) e navegação em 5 grupos.
     - `WorkspaceHeader.tsx`: Breadcrumbs dinâmicos, SidebarTrigger, seletor de tema e menu de usuário unificado.
     - `workspaceNavConfig.ts`: 5 grupos funcionais com filtro RBAC para itens administrativos.
     - Tema Dark neutro oficial (`oklch(0.145 0 0)` / HSL `0 0% 9%`) com preservação do tema claro e script síncrono no `<head>` anti-FOUC.
     - Auditoria integrada final aprovada com 100% de sucesso em Desktop, Laptop e Mobile (`scripts/phase100-final-integrated-audit.ts`).
- **Evidências**:
  - Relatório de Auditoria Integrada: `phase100-final-integrated-audit-report.md`.
  - Capturas visuais homologadas em Desktop (1795×800), Laptop (1366×768) e Mobile (390×844).
- **Limitações Documentadas**:
  - Telas internas do Workspace (`/workspace/carreira/*`, `/workspace/operacao/*`, etc.) utilizam cards informativos de placeholder até a migração de seus respectivos módulos nas Fases 102 a 104.
  - As rotas legadas (`/candidate`, `/admin`) permanecem ativas para manter a operabilidade diária durante a migração.
- **Status**: Concluído e Aprovado pelo Usuário.

### Phase 101: Descomissionamento Comercial & Unificação de Sessão
- **Objetivo**: Transformar o Buscavag em um Personal Workspace, desmantelando a experiência comercial de SaaS (paywalls, modais de upgrade, limites artificiais de vagas e CVs) sem deletar tabelas financeiras ou quebrar APIs existentes.
- **Discovery Concluído (Relatório `phase101-discovery-report.md`)**:
  - 5 Buckets mapeados (Remover da UI, Desativar na UX, Preservar por Compatibilidade, Preservar Infraestrutura Interna, Decisões Humanas).
- **Entregas Planejadas**:
  1. **Unidade 1 — Neutralização de Limites & Backend**:
     - Atualização de `saasLimits.ts` para cotas infinitas.
     - Remoção do HTTP 403 por limite de 5 vagas salvas em `/api/candidate/saved-jobs`.
     - Remoção da ofuscação de URLs (`#upgrade-required`) e truncamento de descrições em `/api/candidate/recommended-jobs`.
     - Liberação de reanálises com IA em `/api/candidate/analyze-cv` (preservando apenas o cooldown de 5s).
  2. **Unidade 2 — Limpeza Visual & Descomissionamento de Paywalls**:
     - Remoção do `UpgradeModal` e cards bloqueados (`LockedJobCard`).
     - Remoção de botões "Fazer Upgrade Pro", "Upgrade Pro para Reanalisar" e badges Free/Pro.
     - Redirecionamento da rota `/pricing` para `/workspace`.
  3. **Unidade 3 — Unificação de Sessão & Verificação de Não-Regressão**:
     - Preservação estrita das tabelas `subscriptions`, `payments` e `payment_webhooks` no SQLite.
     - Suíte de testes automatizados `src/test-phase101-decommissioning.ts`.
- **Critérios de Validação**:
  - Usuários salvando e recomendando vagas ilimitadamente.
  - Zero referências a paywall ou modais de upgrade na interface.
  - Nenhuma migration destrutiva ou perda de dados no banco de dados.

### Phase 102: Migração do Módulo "Minha Carreira"
- **Objetivo**: Migrar o Feed de Vagas, o Kanban e o Perfil/Diagnóstico de CV para o novo Workspace Shell.
- **Entregas**:
  1. `/workspace/carreira`: Feed moderno de vagas com cálculo de compatibilidade IA e busca facetada.
  2. `/workspace/carreira/kanban`: Kanban de candidaturas com drag-and-drop e status em tempo real.
  3. `/workspace/carreira/perfil`: Gestão de currículo, extração de texto via Gemini e skills.
- **Critérios de Validação**:
  - Responsividade validada em Desktop, Tablet e Mobile.
  - Testes funcionais de upload de CV, matching e transição de cards no Kanban 100% íntegros.

### Phase 103: Migração dos Módulos "Operação & Coleta" & "Inteligência"
- **Objetivo**: Migrar a Central de Scrapers, o Terminal SSE, a Gestão Geral de Vagas, Empresas e Logs.
- **Entregas**:
  1. `/workspace/operacao/scrapers` e `/terminal`: Painel de controle das 34 fontes e console SSE em tempo real.
  2. `/workspace/operacao/vagas`: Tabela completa com filtros de deduplicação e expurgo em lote.
  3. `/workspace/operacao/empresas`: Gestão de parceiros B2B.
  4. `/workspace/inteligencia/logs`: Auditoria de sistema e logs unificados.
- **Critérios de Validação**:
  - Não-regressão em streaming de logs SSE.
  - Disparo manual e em cron dos scrapers (LinkedIn, Facebook, Gupy, etc.) funcionando perfeitamente.
  - Responsividade de tabelas e filtros em todos os viewports.

### Phase 104: Migração dos Módulos "Comunicação" & "Gestão"
- **Objetivo**: Migrar o Hub de Mensageria e a Gestão de Usuários e Permissões.
- **Entregas**:
  1. `/workspace/comunicacao`: Monitoramento e envio para Telegram Bot e Meta Cloud API (WhatsApp).
  2. `/workspace/gestao/usuarios`: Gestão de usuários, controle de permissões e ferramenta de impersonate para suporte.
- **Critérios de Validação**:
  - Envio de teste de mensagens para Telegram e WhatsApp funcionando.
  - Troca de perfil e impersonation testados sem vazamento de privilégios.
  - Layout totalmente responsivo.

### Phase 105: Limpeza Controlada, Testes E2E & Auditoria de Entrega
- **Objetivo**: Testagem completa, remoção segura de rotas legadas após substituição integral e fechamento formal da v25.0.
- **Entregas**:
  1. Execução de testes de integração e regressão (`npm run test`, `audit:scrapers`).
  2. Validação final do checklist de Design System e acessibilidade.
  3. Emissão do relatório de auditoria `v25.0-MILESTONE-AUDIT.md`.
- **Critérios de Validação**:
  - 100% de aprovação técnica e funcional sem links quebrados ou pendências abertas.

---

## Previous Milestones
- [x] **[Milestone 24.0: Sidebar Retrátil Inovadora, Telegram Notifier Estrito & LinkedIn Posts Scraper](milestones/v24.0-ROADMAP.md)** (Concluído em 2026-11-02)
- [x] **[Milestone 23.0: Filtragem Estrita, Deduplicação Inteligente, Precisão Geográfica & Arquitetura de Sub-Navegação](milestones/v23.0-ROADMAP.md)** (Concluído em 2026-10-27)
- [x] **[Milestone 22.0: Refatoração da Dashboard Admin & Criação da Central Exclusiva de Scrapers](milestones/v22.0-ROADMAP.md)** (Concluído em 2026-10-01)
- [x] **[Milestone 21.1: Polimento & Consolidação UI/UX Admin](milestones/v21.1-ROADMAP.md)** (Concluído em 2026-09-30)
- [x] **[Milestone 21.0: Expansão do Painel Administrativo, Sessão Isolada, Mensageria & Expurgo Automático](milestones/v21.0-ROADMAP.md)** (Concluído em 2026-09-29)
- [x] **[Milestone 20.0: Resiliência Geográfica, Tratamento de Localizações Omissas & Tolerância de Payloads](milestones/v20.0-ROADMAP.md)** (Concluído em 2026-09-23)
- [x] **[Milestone 19.0: Inteligência Fiel de Currículo, Desbloqueio de Onboarding & Match Geográfico](milestones/v19.0-ROADMAP.md)** (Concluído em 2026-09-23)
- [x] **[Milestone 18.0: Ingestão Agnóstica Multi-Tenant, Dinamização de Abordagens e Blindagem do Sistema](milestones/v18.0-ROADMAP.md)** (Concluído em 2026-09-22)
- [x] **[Milestone 17.0: Motor de Match Estrito, Onboarding Sequencial & Refatoração da Inbox do Candidato](milestones/v17.0-ROADMAP.md)** (Concluído em 2026-09-21)
- [x] **[Milestone 16.0: Scraper de Posts do LinkedIn & Ingestão de Oportunidades Diretas do Feed](milestones/v16.0-ROADMAP.md)** (Concluído em 2026-09-21)
- [x] **[Milestone 15.0: Conector Facebook Groups, Parser Inteligente com Hermes IA & Painel Admin / Analytics](milestones/v15.0-ROADMAP.md)** (Concluído em 2026-09-21)
