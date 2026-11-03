# Phase 86: Kanban de Vagas & Disparo Rápido para Canais em `/admin/vagas`

## Sumário Executivo

A **Phase 86** concluiu o **Milestone 21.1: Polimento & Consolidação UI/UX Admin**, entregando uma experiência visual de gestão ágil de vagas em formato Kanban com colunas inteligentes por status e um motor integrado de disparo rápido de vagas para canais de mensageria (Telegram e WhatsApp), auditado em conformidade com as diretrizes do sistema.

---

## 1. O Que Foi Construído & Entregue

### 1.1 Alternador de Visualização & Persistência em LocalStorage (`REQ-86-01`)
- **Top Banner com Alternador Velzon**: No topo da página `/admin/vagas`, foi adicionado um grupo de botões (`Tabela` / `Kanban`) com ícones Lucide (`List` e `LayoutGrid`), permitindo que o operador administrativo alterne a perspectiva de visualização com um único clique.
- **Persistência de Preferência**: O estado ativo é salvo imediatamente em `localStorage.getItem('buscavag_jobs_view')` com chave `'buscavag_jobs_view'`, restaurando a visualização preferida em recarregamentos futuros sem alterar parâmetros de URL.

### 1.2 Kanban de Vagas em 3 Colunas (`REQ-86-01`)
- **Colunas Baseadas em Status Real**:
  1. **Vagas Ativas (`active`)**: Header com badge verde esmeralda e contador dinâmico.
  2. **Ocultas / Soft-Hide (`hidden`)**: Header com badge âmbar/amarelo para vagas ocultadas de candidatos.
  3. **Expiradas (`expired`)**: Header com badge vermelho carmim para oportunidades vencidas.
- **Cards de Vaga Ricos no Padrão Velzon**:
  - Exibição de título, empresa, modelo de trabalho (`remoto`, `hibrido`, `presencial`), localização e senioridade.
  - Badges das principais tecnologias da stack.
  - Ações rápidas no rodapé do card:
    - **Disparar (`Send`)**: Abre o modal de despacho para canais de mensageria.
    - **Ocultar/Exibir (`Eye`/`EyeOff`)**: Executa o toggle soft-hide instantâneo.
    - **Editar (`Edit3`)**: Abre o modal Velzon de edição rápida de metadados.
    - **Excluir (`Trash2`)**: Abre confirmação para exclusão permanente.

### 1.3 Endpoint Dedicado de Disparo de Vagas (`REQ-86-01`)
- **Arquivo**: `src/app/api/admin/vagas/[id]/dispatch/route.ts`
- **Validação de Autorização**: Protegido por sessão administrativa via `getAdminSessionUser(req)`.
- **Integração com Provedores**:
  - **WhatsApp**: Conecta-se diretamente ao `whatsappService.sendMessage(destinatario, mensagem)`.
  - **Telegram**: Conecta-se ao `TelegramNotifier().sendMessage(destinatario, mensagem, 'HTML')`.
  - Modos de mock automáticos em desenvolvimento quando credenciais externas não estão configuradas no `.env`.
- **Auditoria Administrativa**: Registra o evento através de `logAdminAction`, salvando tipo `'acao'`, nível `'info'`, origem `'admin_action'` e metadados detalhados (`jobId`, `canal`, `destinatario`, `mock`) nas tabelas `system_logs` e `logs` (SQLite).

### 1.4 Modal Velzon de Disparo para Canais de Mensageria
- **Modal Integrado**: Aberto a partir do botão `Send` em qualquer linha da tabela ou card do Kanban.
- **Template Oficial Estruturado**: Formata automaticamente as informações da vaga:
  - Cabeçalho institucional `🚀 NOVA OPORTUNIDADE TECH - BUSCAVAG`.
  - Título da vaga, empresa, modelo e localização.
  - Senioridade requerida e tecnologias principais.
  - Link de candidatura direta com URL completa.
- **Campos Customizáveis**: Permite ao operador selecionar o canal (`Telegram` ou `WhatsApp`), definir destinatário/chat_id customizado ou usar o canal padrão configurado, e editar a mensagem antes do envio com prévia em tempo real.

### 1.5 Extensão do Repositório de Vagas (`AdminJobRepository`)
- Adicionado o método `getJobById(id: string): AdminJobEntry | null` com consulta otimizada no SQLite, garantindo validação de existência e enriquecimento dos disparos.

---

## 2. Verificação & Testes

- **Suíte Determinística Criada**: `src/test-phase86.ts`
  - 17 testes automatizados cobrindo existência de endpoints, exigência de sessão admin, integridade do repositório, validação do template oficial, simulação de despacho via Telegram e WhatsApp, persistência do log de auditoria, presença das 3 colunas Kanban e do modal Velzon.
  - **Resultado**: 17/17 testes aprovados (100% de sucesso).
- **Regressão das Fases Anteriores**:
  - `src/test-phase85.ts` a `src/test-phase76.ts`: Todos os testes executados e aprovados sem nenhuma regressão.
- **Suítes Globais do Projeto**:
  - `npm test`: 9/9 suítes orquestradas aprovadas (5.41s).
  - `npx tsc --noEmit`: 0 erros de tipagem estrita TypeScript.
  - `npm run build:next`: Build de produção executado com sucesso.

---

## 3. Arquivos Modificados / Criados

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/app/api/admin/vagas/[id]/dispatch/route.ts` | Criado | Rota de disparo rápido de vagas para Telegram/WhatsApp com auditoria |
| `src/db/adminJobRepository.ts` | Modificado | Adicionado método `getJobById(id: string)` |
| `src/app/admin/vagas/page.tsx` | Modificado | Implementação do viewMode (Tabela/Kanban), cards de status e modal de disparo |
| `src/test-phase86.ts` | Criado | Suíte determinística com 17 testes automatizados da Phase 86 |
| `.planning/phases/86-SUMMARY.md` | Criado | Documento de fechamento da Phase 86 e do Milestone 21.1 |
