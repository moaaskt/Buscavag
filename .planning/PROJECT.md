# Project Details

## Current State

- **Shipped Milestone**: v24.0 — Sidebar Retrátil Inovadora, Telegram Notifier Estrito & LinkedIn Posts Scraper (2026-11-02)
- **Active Milestone**: v25.0 — Personal Workspace & Redesign AdminCN (shadcn/ui)
- **Status**: Em Planejamento / Governança Atualizada (Fase 99 pronta para início)

<details>
<summary>Previous Milestones</summary>

- v1.0 — Core Setup & Shared Modules
- v2.0 — Full Platform & Intelligence Evolution
- v3.0 — Expansão Massiva de Fontes e Especialização IoT
- v4.0 — Redesign Completo do Dashboard & Design System (Shadcn + Framer Motion)
- v5.0 — Gestão Avançada, Bulk Actions e Sincronização Real-time
- v6.0 — Sanitização e Triagem Inteligente de Vagas
- v7.0 — Observabilidade, Streaming de Logs em Tempo Real e Gestão de Erros
- v8.0 — Expansão Massiva de Fontes (11 Canais & Freelas 48h), Hub Florianópolis e Melhorias no Card
- v9.0 — Motor Híbrido Scrapling (Python/FastAPI) e Blindagem 100% dos Scrapers (34 fontes auditadas)
- v10.0 — Painel do Candidato, Análise de CV com IA e Fundação SaaS
- v11.0 — Painel Admin, RBAC e Refatoração de UI
- v12.0 — Polimento UI/UX, Total Multi-tenancy, Scraper Stream & Zero-State DB
- v13.0 — Experiência de Autenticação (/login, /register), Header Minimalista & Notificações WhatsApp
- v14.0 — Refatoração Completa da UI/UX e Consistência do Tema Claro na Área do Candidato (/candidate)
- v15.0 — Conector Facebook Groups, Parser Inteligente com Hermes IA & Painel Admin / Analytics (2026-09-21)
- v16.0 — Scraper de Posts do LinkedIn & Ingestão de Oportunidades Diretas do Feed (2026-09-21)
- v17.0 — Motor de Match Estrito, Onboarding Sequencial & Refatoração da Inbox do Candidato (2026-09-21)
- v18.0 — Ingestão Agnóstica Multi-Tenant, Dinamização de Abordagens e Blindagem do Sistema (2026-09-22)
- v19.0 — Inteligência Fiel de Currículo, Desbloqueio de Onboarding & Match Geográfico (2026-09-23)
- v20.0 — Resiliência Geográfica, Tratamento de Localizações Omissas & Tolerância de Payloads (2026-09-23)
- v21.0 — Expansão do Painel Administrativo, Sessão Isolada, Mensageria & Expurgo Automático (2026-09-29)
- v21.1 — Polimento & Consolidação UI/UX Admin (Design System, Isolamento de Layout, B2B & Ações de Canais) (2026-09-30)
- v22.0 — Refatoração da Dashboard Admin & Criação da Central Exclusiva de Scrapers (2026-10-01)
- v23.0 — Filtragem Estrita, Deduplicação Inteligente, Precisão Geográfica & Arquitetura de Sub-Navegação (2026-10-27)
- v24.0 — Sidebar Retrátil Inovadora, Telegram Notifier Estrito & LinkedIn Posts Scraper (2026-11-02)

</details>

## Next Milestone Goals (v25.0)

- **Transformação para Personal Workspace**: Unificação dos painéis antes segregados (`/candidate` e `/admin`) em uma casca de aplicação única (Single App Shell), eliminando atritos de navegação e múltiplas sessões.
- **Descomissionamento Comercial Seguro**: Eliminação da lógica de planos pagos, assinaturas artificiais e gates Free/Pro da experiência de uso, preservando 100% dos dados históricos e financeiros no SQLite sem exclusão de tabelas.
- **Redesign com Base no AdminCN & shadcn/ui**: Adoção do Design System definitivo baseado no template local `admincn-v1.0.0` e componentes oficiais shadcn/ui, garantindo visual minimalista, profissional, responsivo e sem estética genérica de IA.
- **Skill Permanente & Governança GSD**: Criação da skill `buscavag-design-system` para assegurar que futuros agentes sigam estritamente o Design System, tokens e checklist de validação visual.
- **Preservação Integral de Funcionalidades & RBAC**: Garantia de não-regressão em scraping (34 conectores), inteligência Hermes/Gemini, mensageria (Telegram/WhatsApp) e diferenciação estrita de permissões via RBAC fundamentado no código.
- **Responsividade Universal**: Validação obrigatória de todas as telas em Desktop, Tablet e Mobile.
