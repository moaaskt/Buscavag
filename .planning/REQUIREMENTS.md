# Milestone 25.0 Requirements: Personal Workspace & Redesign AdminCN (shadcn/ui)

## Core Architecture Requirements

### 1. Workspace Unificado & Navegação (Single App Shell)
- **REQ-WS-01**: O sistema deve possuir uma casca de aplicação unificada com Sidebar expansível/colapsável no Desktop e gaveta (`Sheet`) no Mobile, com suporte a atalhos de teclado.
- **REQ-WS-02**: A navegação deve ser organizada nos grupos:
  1. *Minha Carreira* (Feed de Vagas, Kanban de Candidaturas, Meu Perfil & Diagnóstico de CV).
  2. *Operação & Coleta* (Central de Scrapers, Terminal SSE, Gestão Geral de Vagas, Empresas B2B).
  3. *Inteligência* (Auditoria & Logs de Execução).
  4. *Comunicação* (Hub de Mensageria Telegram & WhatsApp).
  5. *Configurações & Gestão* (Usuários, Permissões & Configurações do Workspace).
- **REQ-WS-03**: Breadcrumbs automáticos e dinâmicos no Header refletindo o caminho percorrido.
- **REQ-WS-04**: Suporte nativo a alternância de tema Dark / Light com persistência via cookie/localStorage e carregamento sem cintilação (*flash*).
- **REQ-WS-05**: Rota raiz `/` deve direcionar usuários autenticados para `/workspace/carreira` e anônimos para `/login`.

### 2. RBAC & Segurança Fundamentada
- **REQ-RBAC-01**: Acesso a recursos administrativos (*Operação & Coleta, Inteligência, Comunicação, Gestão*) deve ser estritamente bloqueado no backend e condicionalmente ocultado na interface para usuários sem a claim `role === 'ADMIN'`.
- **REQ-RBAC-02**: Usuários com `role === 'CANDIDATE'` acessam livremente as funcionalidades de *Minha Carreira*, interagindo com os dados de forma multi-tenant isolada por `userId`.
- **REQ-RBAC-03**: A funcionalidade de *impersonation* deve ser preservada exclusivamente para administradores.

### 3. Descomissionamento Comercial & Preservação Histórica
- **REQ-COM-01**: Eliminar limites artificiais de planos (`maxSavedJobs`, bloqueio de vagas recomendadas, travas de análise de CV). O Personal Workspace opera em modo irrestrito.
- **REQ-COM-02**: Desativar o modal `UpgradeModal` e remover botões "Fazer Upgrade Pro" e badges "Free/Pro" de todas as telas.
- **REQ-COM-03**: Desativar rota `/pricing`, redirecionando para o Workspace.
- **REQ-COM-04**: **Preservação de Dados**: Nenhuma tabela ou registro do banco de dados SQLite (`subscriptions`, `payment_webhooks`, etc.) será deletada. Dados históricos e financeiros permanecem intactos.

### 4. Retrocompatibilidade & Transição de Rotas Legadas
- **REQ-LEG-01**: Rotas legadas (`/candidate`, `/admin`) devem redirecionar suavemente para suas novas correspondências no Workspace sem quebrar bookmarks ou sessões ativas.
- **REQ-LEG-02**: Endpoints de API existentes (`/api/candidate/**`, `/api/admin/**`) devem permanecer totalmente operacionais para assegurar o funcionamento dos serviços e rotinas de background.

### 5. Design System, MCP shadcn & Governança GSD
- **REQ-DS-01**: Criação da skill permanente `buscavag-design-system` em `.gemini/config/skills/buscavag-design-system/SKILL.md` como guia obrigatório para todos os agentes GSD.
- **REQ-DS-02**: **MCP & Base de Componentes**: O agente deve consultar o MCP oficial do shadcn como referência primária de componentes. Na ausência do MCP registrado no ambiente atual, o agente deve relatar expressamente a indisponibilidade e utilizar como base oficial os componentes auditados de `admincn-v1.0.0/src/components/ui/`, sem alegar consultas fictícias.
- **REQ-DS-03**: Tokens centralizados em `globals.css` (paleta neutra, bordas sutis, raios padronizados, sem sombras pesadas ou saturação artificial).
- **REQ-DS-04**: Proibição de estilos genéricos de IA (gradientes vibrantes neon, efeitos de brilho excessivo). Visual minimalista, limpo e profissional (estilo Linear/Vercel).
- **REQ-DS-05**: Checklist obrigatório de validação de interface antes de considerar qualquer fase concluída.

### 6. Responsividade Global Obrigatória
- **REQ-RESP-01**: Todas as telas e componentes devem ser validados em Desktop (>= 1024px), Tablet (768px - 1023px) e Mobile (< 768px).
- **REQ-RESP-02**: Tabelas de dados devem possuir scroll horizontal controlado ou layout colapsável de cartões em telas estreitas.
- **REQ-RESP-03**: Modais e gavetas devem preencher a tela de forma amigável no mobile (bottom sheets ou full sheet).

### 7. Não-Regressão Funcional Estrita
- **REQ-FUNC-01**: **Feed & Matching**: Preservar filtros avançados, cálculo de afinidade, badges de senioridade/categoria e busca textual.
- **REQ-FUNC-02**: **Kanban**: Preservar drag-and-drop, transições de status (`APPLIED`, `INTERVIEWING`, `OFFER`, `REJECTED`, `SAVED`) e isolamento por candidato.
- **REQ-FUNC-03**: **Perfil & CV**: Preservar upload de PDF/Word, extração de texto via Gemini IA e enriquecimento de skills.
- **REQ-FUNC-04**: **Scrapers & Agendamento**: Preservar o funcionamento dos 34 scrapers (incluindo LinkedIn Posts com Chrome CDP e Facebook Groups), rotinas em cron e disparos manuais.
- **REQ-FUNC-05**: **Terminal SSE & Logs**: Preservar o streaming em tempo real via Server-Sent Events e console interativo de execução.
- **REQ-FUNC-06**: **Mensageria**: Preservar filtros estritos de notificação, bot do Telegram e disparos da Meta Cloud API (WhatsApp).
- **REQ-FUNC-07**: **Gestão de Usuários**: Preservar listagem, alteração de status/permissões e login delegado (impersonate).
