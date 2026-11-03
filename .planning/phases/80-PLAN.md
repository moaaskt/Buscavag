# Phase 80 Plan: Gestão Financeira & Pagamentos (/admin/pagamentos)

## Vision & Goal
Implementar uma central de inteligência e controle financeiro completa para o modelo de monetização SaaS do BuscaVag em `/admin/pagamentos` com o **Design System Velzon Interactive (Themesbrand)**. O sistema adiciona modelagem robusta de pagamentos (`payments`), assinaturas recorrentes (`subscriptions`) e ingestão de webhooks (`payment_webhooks`) no SQLite. Provê dashboard com métricas financeiras essenciais (MRR, ARR, Ticket Médio, Receita Total Paga e Inadimplência), suporte agnóstico a múltiplos gateways (Mercado Pago, Stripe, Asaas, Manual), operações de suporte de alto valor (concessão de cortesia Pro e estorno de pagamentos com reversão de plano) e interface moderna em abas com tabela de badges soft-tint e modais de operação.

---

## Requirements Addressed

- **`REQ-80-01` (Esquema SQLite Financeiro)**:
  - Criação das tabelas `payments`, `subscriptions` e `payment_webhooks` com índices de alta performance para `user_id`, `status`, `gateway` e `created_at`.
  - Migração idempotente em `initDatabase()`.

- **`REQ-80-02` (Métricas Financeiras & Analytics)**:
  - Método `getPaymentStats()` calculando com precisão matemática:
    - **MRR (Monthly Recurring Revenue)**: Soma ponderada de planos ativos mensais e anuais proporcionalizados.
    - **ARR (Annual Recurring Revenue)**: `MRR * 12`.
    - **Receita Total Paga**: Soma de transações aprovadas (`paid`).
    - **Ticket Médio**: Receita aprovada dividida pelo número de transações pagas.
    - **Assinantes Ativos Pro**: Quantidade de assinaturas `active` ou `trialing`.
    - **Inadimplência / Falhas**: Contagem de transações `failed` e assinaturas `past_due`.

- **`REQ-80-03` (Repositório Financeiro - AdminPaymentRepository)**:
  - `getAdminPayments(params)`: Listagem paginada, filtros combinados (`status`, `gateway`, `payment_method`) e busca textual ampla (`user.name`, `user.email`, `id`, `gateway_payment_id`).
  - `getPaymentDetail(paymentId)`: Consulta detalhada com dados do cliente e metadata.
  - `getAdminSubscriptions(params)`: Listagem de assinaturas de candidatos com período de vigência.

- **`REQ-80-04` (Operações de Suporte Financeiro & Auditoria)**:
  - `grantCourtesySubscription(userId, days, reason, adminUser)`: Concessão manual de plano Pro (transação de R$ 0,00, assinatura estendida e atualização para `premium` em `users`).
  - `refundPayment(paymentId, reason, adminUser)`: Estorno de pagamento com cancelamento de assinatura e reversão para `free` em `users`.
  - Rastreamento estrito via `logAdminAction`.

- **`REQ-80-05` (Ingestão & Processamento de Webhooks)**:
  - Tabela `payment_webhooks` gravando todos os eventos recebidos com JSON integral.
  - Processamento automático de confirmação de pagamento aprovado ativando a assinatura do usuário.

- **`REQ-80-06` (Interface Velzon Interactive `/admin/pagamentos`)**:
  - 4 `VelzonStatWidget` (MRR, Receita Total Paga, Assinantes Ativos Pro, Inadimplência/Falhas).
  - 3 Abas Velzon: Transações, Assinaturas e Logs de Webhooks.
  - Tabela com badges soft-tint (Verde = Pago, Âmbar = Pendente, Rosa = Reembolsado/Falha, Roxo = Cortesia).
  - Modais Velzon: Detalhes da Transação com visualizador de JSON, Concessão de Cortesia Pro e Confirmação de Estorno.

- **`REQ-80-07` (Suíte de Testes Automatizada)**:
  - Criar `src/test-phase80.ts` com 10 testes determinísticos cobrindo todos os requisitos.

---

## Proposed Changes

### Component 1: Banco de Dados & Esquema SQLite

#### [MODIFY] [src/db/index.ts](file:///home/moa-dev/projetos/buscavag/src/db/index.ts)
- Adicionar a criação das tabelas `payments`, `subscriptions` e `payment_webhooks`.
- Criar índices `idx_payments_user_id`, `idx_payments_status`, `idx_payments_gateway`, `idx_payments_created_at`, `idx_subscriptions_user_id`, `idx_subscriptions_status`, `idx_webhooks_gateway`, `idx_webhooks_created_at`.

---

### Component 2: Repositório Administrativo Financeiro

#### [NEW] `src/db/adminPaymentRepository.ts`
- Implementar classe `AdminPaymentRepository` com:
  - `getPaymentStats()`
  - `getAdminPayments(params)`
  - `getAdminSubscriptions(params)`
  - `getPaymentDetail(paymentId)`
  - `refundPayment(paymentId, reason, adminUser)`
  - `grantCourtesySubscription(userId, days, reason, adminUser)`
  - `saveWebhookEvent(gateway, eventType, payload)`
  - `getRecentWebhooks(limit)`

---

### Component 3: Endpoints REST Administrativos e Webhooks

#### [NEW] `src/app/api/admin/pagamentos/route.ts`
- `GET`: Listagem paginada de transações com filtros e métricas de topo.

#### [NEW] `src/app/api/admin/pagamentos/[id]/route.ts`
- `GET`: Detalhes da transação.
- `PATCH`: Ações de estorno (`action: 'refund'`) com auditoria.

#### [NEW] `src/app/api/admin/pagamentos/cortesia/route.ts`
- `POST`: Concessão manual de cortesia Pro para candidatos.

#### [NEW] `src/app/api/webhooks/payments/[gateway]/route.ts`
- `POST`: Recepção de webhooks de pagamento (Mercado Pago, Stripe, Asaas) com gravação em `payment_webhooks` e processamento automático de status.

---

### Component 4: Interface Velzon Interactive (/admin/pagamentos)

#### [NEW] `src/app/admin/pagamentos/page.tsx`
- Dashboard Velzon com 4 `VelzonStatWidget`.
- 3 Abas Velzon: Transações, Assinaturas e Webhooks.
- Barra de operações com busca, filtros de status/gateway/método e botão "+ Conceder Cortesia Pro".
- Tabela de transações com badges soft-tint.
- Modais Velzon de Detalhes com formatador JSON, Concessão de Cortesia e Estorno.

---

### Component 5: Suíte de Testes Automatizada

#### [NEW] `src/test-phase80.ts`
- Suíte completa com 10 testes determinísticos cobrindo schema, cálculo de MRR, estorno, cortesia, webhooks e auditoria.

---

## Verification Plan

### Automated Tests
```bash
npx tsx src/test-phase80.ts
npx tsx src/test-phase79.ts
npx tsx src/test-phase78.ts
npx tsx src/test-phase77.ts
npx tsx src/test-phase76.ts
npm test
npx tsc --noEmit
npm run build:next
```

### Manual Verification
- Acessar `/admin/pagamentos` com sessão administrativa.
- Inspecionar os 4 widgets com métricas financeiras consolidadas.
- Alternar entre as abas Transações, Assinaturas e Webhooks.
- Abrir modal de concessão de cortesia Pro e conceder dias a um usuário.
- Testar a filtragem por status (Pago, Pendente, Reembolsado, Cortesia).
- Abrir o modal de detalhes de uma transação e verificar o JSON formatado.
- Testar o estorno e validar a reversão da assinatura.
