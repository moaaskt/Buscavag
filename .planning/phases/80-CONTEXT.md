# Phase 80 Context — Gestão Financeira & Pagamentos (/admin/pagamentos)

## Contexto e Objetivo
O BuscaVag conta com um modelo de assinatura SaaS (Plano Gratuito e Plano Premium Pro R$ 29,90/mês ou R$ 199,90/ano). Para viabilizar a gestão operacional de receita, controle de fluxo de caixa, atendimento a dúvidas de cobrança e auditoria financeira, a **Phase 80** entrega:
1. **Painel Financeiro em `/admin/pagamentos`**: Construído com o **Design System Velzon Interactive (Themesbrand)**, contendo 4 widgets analíticos (MRR, Receita Total Paga, Assinantes Ativos Pro e Inadimplência/Falhas), abas para **Transações**, **Assinaturas Recorrentes** e **Logs de Webhooks**.
2. **Modelagem de Dados Financeira**: Tabelas `payments` (transações), `subscriptions` (assinaturas com período de vigência) e `payment_webhooks` (eventos de gateways) no SQLite com índices dedicados.
3. **Múltiplos Gateways**: Estrutura agnóstica para suportar transações e webhooks de **Mercado Pago**, **Stripe**, **Asaas** e pagamentos manuais/cortesia.
4. **Operações de Suporte Financeiro**:
   - **Concessão de Cortesia Pro**: Atribuição manual de período Pro (ex: 7, 15, 30, 90 dias) gerando transação de R$ 0,00 e assinatura ativa, sem risco de cobrança indevida.
   - **Estorno / Reembolso**: Marcação como `refunded`, desativação/reversão controlada do plano e justificativa registrada na auditoria.
   - **Reenvio de Recibo**: Recuperação e cópia de fatura/link de pagamento.
5. **Auditoria Estrita**: Rastreamento de todas as intervenções financeiras manuais gravando em `logs` com `origem = 'admin_action'`.

---

## Decisões Arquiteturais e de Implementação (Locked Decisions)

### 1. Esquema SQLite Financeiro
- **Tabela `payments`**:
  - `id TEXT PRIMARY KEY` (ex: `txn_uuid`)
  - `user_id TEXT NOT NULL` (referencia `users.id`)
  - `gateway TEXT NOT NULL` ('mercadopago' | 'stripe' | 'asaas' | 'manual')
  - `gateway_payment_id TEXT` (id externo na adquirente)
  - `amount REAL NOT NULL` (valor monetário em BRL)
  - `currency TEXT DEFAULT 'BRL'`
  - `status TEXT NOT NULL` ('paid' | 'pending' | 'refunded' | 'failed' | 'courtesy')
  - `payment_method TEXT` ('pix' | 'credit_card' | 'boleto' | 'manual')
  - `plan_tier TEXT DEFAULT 'premium'`
  - `billing_cycle TEXT DEFAULT 'monthly'` ('monthly' | 'annual')
  - `invoice_url TEXT`
  - `metadata TEXT` (JSON para detalhes do pagador, cartão final XXXX, etc.)
  - `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`
  - Índices: `idx_payments_user_id`, `idx_payments_status`, `idx_payments_gateway`, `idx_payments_created_at`.
- **Tabela `subscriptions`**:
  - `id TEXT PRIMARY KEY` (ex: `sub_uuid`)
  - `user_id TEXT NOT NULL UNIQUE` (1 assinatura por usuário)
  - `gateway TEXT NOT NULL`
  - `gateway_subscription_id TEXT`
  - `tier TEXT DEFAULT 'premium'`
  - `billing_cycle TEXT DEFAULT 'monthly'`
  - `status TEXT NOT NULL` ('active' | 'canceled' | 'past_due' | 'trialing')
  - `amount REAL NOT NULL`
  - `current_period_start TEXT NOT NULL`, `current_period_end TEXT NOT NULL`
  - `cancel_at_period_end INTEGER DEFAULT 0`, `canceled_at TEXT`
  - `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`
  - Índices: `idx_subscriptions_user_id`, `idx_subscriptions_status`.
- **Tabela `payment_webhooks`**:
  - `id TEXT PRIMARY KEY`
  - `gateway TEXT NOT NULL`
  - `event_type TEXT NOT NULL`
  - `payload TEXT NOT NULL`
  - `processed INTEGER DEFAULT 1`
  - `created_at TEXT NOT NULL`
  - Índices: `idx_webhooks_gateway`, `idx_webhooks_created_at`.

### 2. Repositório Administrativo Financeiro (`src/db/adminPaymentRepository.ts`)
- `getPaymentStats()`:
  - **MRR (Monthly Recurring Revenue)**: Soma dos valores de assinaturas ativas mensalizadas (mensal = valor integral; anual = valor / 12).
  - **ARR (Annual Recurring Revenue)**: MRR * 12.
  - **Ticket Médio**: Receita total aprovada dividida pelo número de transações pagas.
  - **Total de Receita Paga**: Soma de pagamentos com status `paid`.
  - **Assinantes Ativos Pro**: Contagem de assinaturas com status `active` ou `trialing`.
  - **Inadimplência / Falhas**: Contagem de transações `failed` e assinaturas `past_due`.
- `getAdminPayments(params)`:
  - Paginação (`page`, `limit`), busca ampla (`userName`, `userEmail`, `gatewayPaymentId`, `id`), filtros combinados por `status`, `gateway`, `payment_method` e ordenação decrescente por `created_at`.
- `getAdminSubscriptions(params)`:
  - Listagem paginada de assinaturas ativas e históricas dos usuários.
- `getPaymentDetail(id)`:
  - Retorna o pagamento com dados do usuário associado e metadata parseado.
- `refundPayment(paymentId, reason, adminUser)`:
  - Atualiza o status do pagamento para `refunded`, reverte a assinatura para `canceled` (e usuário para `free`), e registra a intervenção no `logAdminAction`.
- `grantCourtesySubscription(userId, days, reason, adminUser)`:
  - Cria registro em `payments` com `amount = 0`, `status = 'courtesy'`, `payment_method = 'manual'`.
  - Cria ou atualiza `subscriptions` com status `active`, `current_period_end = now + days`.
  - Atualiza `users.tier = 'premium'`.
  - Registra a concessão em `logAdminAction`.
- `getRecentWebhooks(limit)`:
  - Consulta aos últimos eventos recebidos.

### 3. Endpoints REST Administrativos e Webhooks
- `GET /api/admin/pagamentos`: Listagem paginada e resumo de métricas.
- `GET /api/admin/pagamentos/[id]`: Detalhamento completo da transação.
- `PATCH /api/admin/pagamentos/[id]`: Ações de estorno (`action: 'refund'`) e reenvio de recibo.
- `POST /api/admin/pagamentos/cortesia`: Concessão manual de plano Pro de cortesia.
- `POST /api/webhooks/payments/[gateway]`: Endpoint público para recepção e ingestão de webhooks.

### 4. Interface Velzon Interactive (`/admin/pagamentos`)
- 4 `VelzonStatWidget`: MRR, Receita Paga Total, Assinantes Ativos Pro, Inadimplência/Falhas.
- Barra de operações com busca em tempo real, filtros dinâmicos de Gateway, Status e Método, e botão "+ Conceder Cortesia Pro".
- 3 Abas Velzon:
  - **Transações**: Tabela com badges soft-tint, dados do candidato, método, gateway e ações.
  - **Assinaturas**: Visão de recorrências com datas de expiração/renovação.
  - **Webhooks**: Log visual de payloads recebidos dos gateways com formatador JSON.
- 3 Modais Velzon:
  - Modal de Detalhes da Transação com visualizador de faturas e metadata JSON.
  - Modal de Concessão de Cortesia Pro (seleção de candidato, dias e motivo).
  - Modal de Confirmação de Estorno.

---

## Verificação e Suíte de Testes da Fase (`src/test-phase80.ts`)
1. **T01**: Criação de tabelas `payments`, `subscriptions` e `payment_webhooks` com índices no SQLite.
2. **T02**: Cálculo exato de MRR, ARR, Ticket Médio e Total Pago em `getPaymentStats`.
3. **T03**: Consulta paginada com busca textual e filtros combinados em `getAdminPayments`.
4. **T04**: Detalhamento consolidado da transação (`getPaymentDetail`) com usuário e metadata.
5. **T05**: Concessão de cortesia Pro (`grantCourtesySubscription`) atualiza assinatura e eleva usuário para `premium`.
6. **T06**: Estorno de pagamento (`refundPayment`) altera status para `refunded`, reverte plano e registra log.
7. **T07**: Ingestão de webhooks em `payment_webhooks` com gravação do payload JSON.
8. **T08**: Processamento de evento de webhook aprovado ativando assinatura do candidato.
9. **T09**: Listagem e métricas de assinaturas recorrentes (`getAdminSubscriptions`).
10. **T10**: Rastreamento de auditoria via `logAdminAction` em intervenções manuais financeiras.
