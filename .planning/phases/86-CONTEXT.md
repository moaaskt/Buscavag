# Phase 86 Context: Kanban de Vagas & Disparo Rápido para Canais em `/admin/vagas`

## Resumo e Alinhamento da Discussão

Na discussão da **Phase 86**, foram consolidadas as decisões de interface e arquitetura para a inclusão da visão Kanban e do fluxo de disparo direto para Telegram e WhatsApp na gestão de vagas do painel administrativo (`/admin/vagas`).

---

## Decisões Técnicas e Arquiteturais

### 1. Alternador de Exibição: Tabela vs. Kanban (`/admin/vagas`)
- **Alternador no Cabeçalho**: Botões de alternância com ícones `Table` e `LayoutGrid`, permitindo trocar instantaneamente entre a visualização clássica em tabela e a nova visualização em colunas Kanban.
- **Persistência de Preferência**: O modo de exibição escolhido ('table' ou 'kanban') pode ser armazenado em `localStorage ('buscavag_jobs_view')`.

### 2. Estrutura de Colunas Kanban por Status
- As oportunidades serão organizadas visualmente em 3 colunas baseadas no ciclo de vida da vaga:
  1. **Vagas Ativas** (Soft-status: `active`) — Badge verde com indicador de volume.
  2. **Vagas Ocultas / Rascunhos** (Soft-status: `hidden`) — Badge amarela/cinza.
  3. **Vagas Expiradas** (Soft-status: `expired`) — Badge vermelha.
- **Cards Kanban Velzon**:
  - Exibição de Título, Empresa, Plataforma de Origem (badge de fonte ex: LinkedIn, Gupy, Catho).
  - Nível/Senioridade, Modelo de trabalho (Remoto, Presencial, Híbrido) e Localização.
  - Stacks principais em mini-pills.
  - Ações rápidas no rodapé do card: Disparo para Canais (`Send`), Ocultar/Exibir (`Eye`/`EyeOff`), Editar (`Edit3`) e Deletar (`Trash2`).

### 3. Modal Velzon de Disparo Rápido para Canais (`VelzonModal`)
- **Acionamento**: Ícone `Send` presente em cada card do Kanban e em cada linha da Tabela.
- **Seletor de Canal**: Abas/Radio para **Telegram** ou **WhatsApp (Meta Cloud API)**.
- **Destinatário Flexível**: Campo para especificar destinatário/grupo customizado ou utilizar o canal oficial padrão da plataforma.
- **Prévia e Edição da Mensagem (`VelzonTextarea`)**:
  - Pré-carregada com o template estruturado oficial:
    ```text
    🚀 NOVA OPORTUNIDADE TECH - BUSCAVAG

    💼 Vaga: {Título}
    🏢 Empresa: {Empresa}
    📍 Localização: {Localização} ({Modelo})
    🎯 Senioridade: {Senioridade}
    💻 Stacks: {Stacks}

    🔗 Veja mais detalhes e candidate-se em: {URL_BuscaVag}
    ```
  - Permite ajustes no texto antes do envio.

### 4. Endpoint de Disparo (`POST /api/admin/vagas/[id]/dispatch`)
- Validação de sessão administrativa via `getAdminSessionUser`.
- Recebe `{ canal: 'telegram' | 'whatsapp', destinatario?: string, mensagem: string }`.
- Invoca `whatsappService.sendMessage` ou `TelegramNotifier.sendMessage`.
- Grava formalmente o log na tabela de auditoria (`logAdminAction`) e na tabela unificada de `logs` com origem `mensageria`.
- Retorna o resultado com ID da mensagem enviada ou indicação de mock em ambiente de teste.

### 5. Preservação de Padrões e Design System
- Utilização dos componentes da biblioteca Velzon UI (`VelzonCard`, `VelzonBadge`, `VelzonModal`, `VelzonInput`, `VelzonSelect`, `VelzonTextarea`, `VelzonLabel`).
- Suporte estrito a Tema Claro (Light Mode) e Tema Escuro (Dark Mode).

---

## Plano de Validação
- **Suíte Determinística**: `src/test-phase86.ts` testando alternância de views, estrutura das colunas do Kanban, acionamento do modal de disparo, integração com endpoint de dispatch e logs de auditoria.
- **Regressão Global**: Execução dos testes das fases 76 a 85, `npm test`, checagem de tipos `npx tsc --noEmit` e build de produção `npm run build:next`.
