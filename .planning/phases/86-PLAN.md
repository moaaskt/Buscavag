# Phase 86 Plan: Kanban de Vagas & Disparo Rápido para Canais em `/admin/vagas`

## Vision & Goal
Aprimorar a experiência operacional de gestão de vagas no painel administrativo (`/admin/vagas`), introduzindo o alternador de visualização entre Tabela e colunas Kanban (Ativas, Ocultas e Expiradas), além do recurso de Disparo Rápido para canais de mensageria (Telegram e WhatsApp Meta Cloud API) diretamente da listagem com prévia editável da mensagem oficial formatada.

---

## Requirements Addressed

- **`REQ-86-01` (Kanban de Vagas & Disparo para Canais)**:
  - Implementar rota de API REST `POST /api/admin/vagas/[id]/dispatch` para processar disparos diretos de vagas para Telegram ou WhatsApp com auditoria em tempo real.
  - Adicionar o alternador de visualização Tabela vs. Kanban no cabeçalho de `/admin/vagas` com persistência em `localStorage`.
  - Construir a visualização Kanban em 3 colunas baseadas no status das vagas (`active`, `hidden`, `expired`), apresentando títulos, empresa, plataforma de origem, localização, senioridade, stacks e ações rápidas.
  - Construir o Modal Velzon de Disparo para Canais com seletor de canal (Telegram / WhatsApp), campo de destinatário flexível e prévia de mensagem oficial estruturada em HTML/Markdown.
  - Criar a suíte determinística de testes `src/test-phase86.ts` e garantir regressão total de todas as fases.

---

## Proposed Changes

### Component 1: Endpoint da API de Disparo de Vagas

#### [NEW] [src/app/api/admin/vagas/[id]/dispatch/route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/admin/vagas/[id]/dispatch/route.ts)
- Autenticação e autorização via `getAdminSessionUser(req)`.
- Validação do parâmetro `id` da vaga.
- Extração de `canal` ('telegram' | 'whatsapp'), `destinatario` e `mensagem` do body JSON.
- Integração com `TelegramNotifier` para envios ao Telegram e `whatsappService` para envios ao WhatsApp.
- Auditoria de ação via `logAdminAction` registrando canal, destinatário e preview do envio.
- Retorno JSON com `{ success, messageId, mock }`.

---

### Component 2: Interface Velzon em `/admin/vagas` (Kanban & Disparo)

#### [MODIFY] [src/app/admin/vagas/page.tsx](file:///home/moa-dev/projetos/buscavag/src/app/admin/vagas/page.tsx)
- Importar novos ícones de `lucide-react`: `LayoutGrid`, `Table`, `Send`, `Share2`, `Smartphone`, `MessageSquare`.
- Adicionar estado `viewMode`: `'table' | 'kanban'`, hidratado com `localStorage.getItem('buscavag_jobs_view') || 'table'`.
- Adicionar no cabeçalho os botões de alternância de visualização Tabela / Kanban.
- Construir a visualização em colunas Kanban:
  - Coluna 1: **Vagas Ativas** (badge verde, status `active`).
  - Coluna 2: **Vagas Ocultas / Rascunhos** (badge amarela, status `hidden`).
  - Coluna 3: **Vagas Expiradas** (badge vermelha, status `expired`).
- Renderizar os Cards do Kanban com dados completos da oportunidade e botões de ação rápida (`Send` para disparo, `Eye`/`EyeOff` para visibilidade, `Edit3` para edição e `Trash2` para exclusão).
- Adicionar os estados do Modal de Disparo Rápido (`dispatchJob`: `AdminJobEntry | null`, `dispatchChannel`: `'telegram' | 'whatsapp'`, `dispatchRecipient`: `string`, `dispatchMessage`: `string`, `dispatching`: `boolean`).
- Implementar a função `generateOfficialTemplate(job: AdminJobEntry)` para preencher automaticamente a mensagem estruturada no modal:
  ```text
  🚀 NOVA OPORTUNIDADE TECH - BUSCAVAG

  💼 Vaga: {job.title}
  🏢 Empresa: {job.company}
  📍 Localização: {job.location || 'Brasil'} ({job.work_model || 'Híbrido/Remoto'})
  🎯 Senioridade: {job.required_seniority || 'Não especificada'}
  💻 Stacks: {job.tech_stack || 'Geral'}

  🔗 Candidate-se ou veja mais detalhes: {job.url}
  ```
- Implementar a função `handleExecuteDispatch` que faz o POST para `/api/admin/vagas/[id]/dispatch` e exibe notificação toast de confirmação.

---

### Component 3: Suíte Determinística de Testes

#### [NEW] [src/test-phase86.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase86.ts)
- Testes automatizados executáveis com `npx tsx src/test-phase86.ts`:
  1. Verificação da existência do arquivo da rota `/api/admin/vagas/[id]/dispatch/route.ts`.
  2. Teste de bloqueio de acesso não autenticado (401) no endpoint de disparo.
  3. Teste do gerador de template oficial de disparo de vaga.
  4. Teste de disparo para Telegram (mock/serviço) com validação de payload.
  5. Teste de disparo para WhatsApp (mock/serviço) com validação de payload.
  6. Verificação de log de auditoria `logAdminAction` gravado após o disparo.
  7. Verificação dos botões de alternância de viewMode e colunas Kanban no arquivo `src/app/admin/vagas/page.tsx`.
  8. Verificação de botões de ação rápida (`Send`) nos cards Kanban e tabela.

---

## Verification Plan

### Automated Tests
1. **Execução da Nova Suíte**:
   ```bash
   npx tsx src/test-phase86.ts
   ```
2. **Execução das Suítes das Fases Anteriores**:
   ```bash
   npx tsx src/test-phase85.ts
   npx tsx src/test-phase84.ts
   npx tsx src/test-phase83.ts
   npx tsx src/test-phase82.ts
   npx tsx src/test-phase81.ts
   npx tsx src/test-phase80.ts
   npx tsx src/test-phase79.ts
   npx tsx src/test-phase78.ts
   npx tsx src/test-phase77.ts
   npx tsx src/test-phase76.ts
   ```
3. **Regressão Global do Sistema**:
   ```bash
   npm test
   ```
4. **Validação Estrita de Tipagem**:
   ```bash
   npx tsc --noEmit
   ```
5. **Build de Produção do Next.js**:
   ```bash
   npm run build:next
   ```
