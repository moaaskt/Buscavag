# Phase 101 Plan: Descomissionamento Comercial & Unificação de Sessão (Revisão Técnica Final)

## 1. Visão Executiva & Contexto

A **Phase 101** executa a transição da experiência do Buscavag para um **Personal Workspace**. O sistema desmantela o modelo comercial de SaaS multi-tenant voltado a terceiros (planos Free/Pro, barreiras de paywall, limites artificiais de vagas e bloqueio de reanálise de currículo) e passa a operar como uma ferramenta pessoal irrestrita de gestão de carreira e inteligência de vagas.

Esta transformação é regida por **tolerância zero a regressões**:
1. **Preservação de Dados e Integridade Estrutural do SQLite**: Tabelas (`subscriptions`, `payments`, `payment_webhooks`), colunas e registros históricos permanecem 100% íntegros. Nenhuma instrução DDL destrutiva (`DROP`, `ALTER`) ou `DELETE` será executada.
2. **Preservação das Rotas Legadas**: As páginas `/candidate` e `/admin` permanecem operacionais sem redirecionamentos globais durante as Fases 101 a 104, reservando a unificação definitiva de URLs para a Fase 105.
3. **Desacoplamento Estrito entre `tier` e Autorização/RBAC**: A propriedade `tier` permanece no schema e no token exclusivamente por compatibilidade reversa. O acesso administrativo é governado estritamente por `role === 'ADMIN'`.

---

## 2. Decisões Aprovadas & Correções Técnicas Incorporadas

A revisão técnica incorpora integralmente as correções obrigatórias exigidas pelo Tech Lead:

1. **Webhooks de Pagamento**:
   - Preservar o registro de eventos brutos em `payment_webhooks` e inserções em `payments`/`subscriptions` para histórico e auditoria.
   - **Remoção da atualização de `users.tier` no handler de webhooks**: Webhooks (antigos ou novos, de aprovação, cancelamento ou estorno) **nunca mais alterarão `users.tier`, `users.role` ou credenciais** de usuários.
   - Webhooks antigos não concederão nem revogarão benefícios no Personal Workspace.
   - `tier` não é utilizado como mecanismo de autorização.

2. **Usuários Existentes e Sessões Antigas**:
   - O banco de dados ativo possui 31 usuários candidatos existentes com `tier = 'free'`.
   - Todos os usuários existentes com `tier = 'free'` terão acesso imediato e irrestrito a todas as funcionalidades (salvar vagas ilimitadas, ver 100% das recomendações sem bloqueio, reanalisar CV).
   - Sessões antigas ativas contendo a claim `tier = 'free'` continuarão funcionando normalmente com acesso completo e irrestrito.
   - As verificações de autorização e de limites em APIs **não mais consultarão `tier === 'free'` para restringir operações**. A claim e o campo `tier` permanecem apenas como dados de compatibilidade.

3. **Endpoints `/api/saas/*` Sem Falso Sucesso & Independência de Cache**:
   - Nenhum endpoint simulará contratação, cancelamento ou operações financeiras.
   - Não retornar `success: true` para operações que não aconteceram.
   - **Esclarecimento sobre HTTP 410 e Cache**: O status HTTP 410 (Gone) indica formalmente que o recurso foi permanentemente removido no servidor (conforme RFC 9110), mas **não garante a invalidação automática de caches intermediários ou de clientes**. Portanto, a descontinuação dos endpoints opera de forma totalmente independente de comportamentos de cache:
     - O servidor responderá com cabeçalhos explícitos `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.
     - Qualquer requisição que atinja o servidor será imediatamente rejeitada com payload semântico explícito, sem jamais disparar mutações financeiras ou de privilégios.
   - Comportamento individual explícito:
     - `GET /api/saas/plans`: HTTP 200, retornando `{ success: false, decommissioned: true, code: 'COMMERCIAL_DECOMMISSIONED', mode: 'personal_workspace', message: 'O catálogo comercial de planos foi descontinuado. O Buscavag opera como Personal Workspace irrestrito e gratuito.', plans: [] }`.
     - `POST /api/saas/upgrade`: HTTP 410 (Gone), retornando `{ success: false, decommissioned: true, code: 'COMMERCIAL_DECOMMISSIONED', mode: 'personal_workspace', message: 'Operações de upgrade comercial foram descontinuadas. Todos os recursos do Personal Workspace já estão ativos para todos os usuários.' }`.
     - `POST /api/saas/cancel`: HTTP 410 (Gone), retornando `{ success: false, decommissioned: true, code: 'COMMERCIAL_DECOMMISSIONED', mode: 'personal_workspace', message: 'Operações de cancelamento foram descontinuadas. Não existem cobranças nem assinaturas ativas no Personal Workspace.' }`.

4. **Limpeza Visual Completa & Preservação Não-Destrutiva**:
   - Remoção do CTA comercial "Conhecer Planos" da Landing Page (`src/app/(public)/page.tsx`, linhas 272–278).
   - Inventário e remoção de todos os elementos visuais de planos e paywall nas páginas consumidoras.
   - **Preservação de arquivos**: Os componentes `UpgradeModal.tsx` e `LockedJobCard.tsx` serão desacoplados das telas consumidoras e marcados como `@deprecated` com stubs seguros, sem exclusão física do disco, evitando quebras em ferramentas ou testes legados.
   - A rota e a interface `/admin/pagamentos` permanecem preservadas para auditoria administrativa histórica.

5. **Backup Consistente em SQLite com WAL & Verificação por Hashes**:
   - **Caminho Real do Banco**: Confirmado a partir de `src/db/index.ts` como `process.env.DATABASE_PATH || path.resolve(process.cwd(), 'buscavag.db')`.
   - **Operação em Modo WAL**: O banco opera com `PRAGMA journal_mode = WAL`.
   - **Risco de Cópia Ingênua**: Uma simples cópia de arquivo (`fs.copyFileSync`) do arquivo `.db` principal ignoraria transações ativas gravadas no arquivo `.db-wal`, gerando um backup corrompido ou defasado.
   - **Procedimento Seguro de Backup**:
     - Utilizar o método nativo de backup do Better-SQLite3 (`db.backup('buscavag.db.phase101-backup')`) ou executar um checkpoint forçado `PRAGMA wal_checkpoint(TRUNCATE)` antes de gerar o arquivo de backup.
     - Este procedimento consolida e sincroniza todas as páginas do WAL no arquivo principal antes da cópia, garantindo um snapshot 100% consistente e ACID.
   - **Verificação Categórica por Hashes e Chaves Primárias**:
     - O critério `>= baseline` é insuficiente para comprovar ausência de exclusões.
     - O teste T15 capturará as chaves primárias (`id`) e gerará hashes SHA-256 de todas as linhas pré-existentes de `subscriptions`, `payments` e `payment_webhooks`, comprovando que cada registro histórico permanece presente e inalterado após a execução.

---

## 3. Diretrizes Técnicas Obrigatórias

- **Proibição de `Infinity` em JSON**: Em JavaScript, `JSON.stringify(Infinity)` serializa como `null`. Portanto, não usar `Infinity` em contratos ou payloads de API. Utilizar inteiros seguros altos (`maxSavedJobs: 999999`, `maxRecommendedJobsUnlocked: 999999`) e flags semânticas (`unlimited: true`), omitindo restrições nas respostas.
- **Manutenção Estrita de Validações Técnicas Anti-Abuso**: A neutralização é comercial, não de segurança. O cooldown técnico de 5 segundos contra flood de IA em `/api/candidate/analyze-cv` (`COOLDOWN_ACTIVE`, HTTP 429) **permanece estritamente preservado**.
- **Independência Total entre Tier e Autorização**: APIs de candidatos passam a autorizar qualquer usuário autenticado com sessão válida (`getSessionUser()`), independentemente do valor de `tier` contido na sessão ou no banco.
- **Novos Cadastros**: Usuários registrados via `/api/auth/register` receberão `tier = 'premium'` no SQLite e no cookie de sessão, com `role = 'CANDIDATE'`.

---

## 4. Decomposição do Escopo em Unidades de Trabalho

```mermaid
flowchart TD
    subgraph U1[Unidade 1: Backend, Neutralização de Limites & Blindagem]
        A1[saasLimits.ts: cotas sem Infinity/null] --> A2[saved-jobs: remoção do 403 e autorização agnóstica a tier]
        A2 --> A3[recommended-jobs: URLs e textos reais para qualquer tier]
        A3 --> A4[analyze-cv: remoção de bloqueio Free, preservação do cooldown 5s]
        A4 --> A5[register & repo: tier = premium para novos usuários]
        A5 --> A6[Webhooks: remoção de UPDATE users.tier, foco em auditoria]
        A6 --> A7[saas endpoints: respostas 410/200 com COMMERCIAL_DECOMMISSIONED e Cache-Control no-store]
    end

    subgraph U2[Unidade 2: Limpeza Visual, Desacoplamento & Redirecionamento]
        B1[Sidebar: remoção de gestao-pagamentos de WORKSPACE_NAV_GROUPS] --> B2[Landing Page: remoção do CTA Conhecer Planos]
        B2 --> B3[/pricing: Server Component com redirect HTTP 307]
        B3 --> B4[Tabs e Header: remoção de botões e badges Pro]
        B4 --> B5[Desacoplamento não-destrutivo de UpgradeModal e LockedJobCard sem deleção física]
    end

    subgraph U3[Unidade 3: QA Automatizado, Integridade SQLite WAL & Build]
        C1[WAL Checkpoint + Backup nativo consistente buscavag.db.phase101-backup] --> C2[Captura de PKs e SHA-256 baseline das tabelas financeiras]
        C2 --> C3[Suíte determinística test-phase101-decommissioning.ts: 16 testes]
        C3 --> C4[Auditoria de integridade SQLite: comparação de PKs e Hashes, PRAGMA integrity_check e foreign_key_check]
        C4 --> C5[Validação TypeScript tsc e bundle npm run build]
    end

    U1 --> U2 --> U3
```

---

### Unidade de Trabalho 1: Backend, Neutralização de Limites & Blindagem

#### Objetivo
Neutralizar barreiras comerciais em todas as rotas do candidato, tornando o acesso irrestrito para usuários novos e existentes (inclusive com `tier = 'free'`), atribuir `tier = 'premium'` para novos cadastros, desarmar alterações de privilégios em webhooks e descontinuar endpoints `/api/saas/*` com respostas explícitas de descontinuação e cabeçalhos `no-store`.

#### Arquivos Envolvidos
1. `src/lib/saasLimits.ts`
2. `src/app/api/candidate/saved-jobs/route.ts`
3. `src/app/api/candidate/recommended-jobs/route.ts`
4. `src/app/api/candidate/analyze-cv/route.ts`
5. `src/app/api/auth/register/route.ts`
6. `src/db/candidateRepository.ts`
7. `src/app/api/saas/plans/route.ts`
8. `src/app/api/saas/upgrade/route.ts`
9. `src/app/api/saas/cancel/route.ts`
10. `src/app/api/webhooks/payments/[gateway]/route.ts`

#### Detalhamento das Alterações

1. **`src/lib/saasLimits.ts`**:
   - Substituir qualquer `Infinity` por inteiros seguros altos (`maxSavedJobs: 999999`, `maxRecommendedJobsUnlocked: 999999`).
   - Configurar `unlimitedAiCvAnalysis: true` em todos os planos.
   - Atualizar `canUserSaveMoreJobs` para sempre retornar `{ allowed: true, maxAllowed: 999999, currentCount, isUnlimited: true }`.

2. **`src/app/api/candidate/saved-jobs/route.ts`**:
   - Remover as linhas 50–61 que rejeitam requisições com HTTP 403 `limitReached: true`.
   - Não checar `tier === 'free'`. Qualquer usuário autenticado pode salvar vagas livremente.

3. **`src/app/api/candidate/recommended-jobs/route.ts`**:
   - Remover a lógica de mascaramento das linhas 41–63 (`isLocked = isFree && ...`).
   - Todos os usuários (seja `tier === 'free'` ou `tier === 'premium'`) recebem 100% das vagas com `isLocked: false`, links autênticos de candidatura, descrições completas e reasoning real.
   - Retornar `unlockedCount: processedItems.length` e omitir limites artificiais.

4. **`src/app/api/candidate/analyze-cv/route.ts`**:
   - Remover as linhas 91–101 que bloqueiam reanálise com HTTP 403 para usuários `tier === 'free'`.
   - **Preservar integralmente** as linhas 71–86: validação técnica de cooldown de 5 segundos contra flood de IA (`COOLDOWN_ACTIVE`, HTTP 429).

5. **`src/app/api/auth/register/route.ts` & `src/db/candidateRepository.ts`**:
   - Criar novos usuários definindo `tier: 'premium'` por padrão no SQLite.
   - Emitir cookie inicial com claim `tier: 'premium'`.
   - Preservar estritamente `role: 'CANDIDATE'`.

6. **`src/app/api/saas/plans/route.ts`**:
   - Responder HTTP 200 com contrato explícito de descontinuação comercial e cabeçalho `Cache-Control: no-store`:
     ```json
     {
       "success": false,
       "decommissioned": true,
       "code": "COMMERCIAL_DECOMMISSIONED",
       "mode": "personal_workspace",
       "message": "O catálogo comercial de planos foi descontinuado. O Buscavag opera como Personal Workspace irrestrito e gratuito.",
       "plans": []
     }
     ```

7. **`src/app/api/saas/upgrade/route.ts` & `src/app/api/saas/cancel/route.ts`**:
   - Responder HTTP 410 (Gone) com cabeçalhos `Cache-Control: no-store, no-cache, must-revalidate` e payload informativo:
     - `upgrade`: `{ "success": false, "decommissioned": true, "code": "COMMERCIAL_DECOMMISSIONED", "mode": "personal_workspace", "message": "Operações de upgrade comercial foram descontinuadas. Todos os recursos do Personal Workspace já estão ativos para todos os usuários." }`
     - `cancel`: `{ "success": false, "decommissioned": true, "code": "COMMERCIAL_DECOMMISSIONED", "mode": "personal_workspace", "message": "Operações de cancelamento foram descontinuadas. Não existem cobranças nem planos ativos no Personal Workspace." }`
   - Não executar `UPDATE users SET tier`, não modificar tokens de sessão e não alterar registros de pagamentos.

8. **`src/app/api/webhooks/payments/[gateway]/route.ts`**:
   - Preservar a gravação de auditoria em `payment_webhooks` e inserção em `payments`/`subscriptions`.
   - **Remover a linha 132** (`UPDATE users SET tier = ...`). Webhooks não alteram a tabela `users`.
   - Garantir que nenhum webhook de cancelamento, chargeback ou estorno rebaixe usuários ou altere a coluna `role`.

#### Critérios de Aceite da Unidade 1
- Usuário existente com `tier = 'free'` salva mais de 5 vagas sem receber HTTP 403.
- Usuário existente com `tier = 'free'` recebe 100% das recomendações com `isLocked: false` e links reais.
- Usuário existente com `tier = 'free'` reanalisa CV após os 5s de cooldown sem receber HTTP 403.
- Cooldown técnico de 5s retorna HTTP 429 se disparado consecutivamente.
- Novo cadastro gera usuário com `tier = 'premium'` no SQLite e no cookie.
- Webhook registra transação sem alterar `users.tier` ou `users.role`.
- Rotas `/api/saas/*` retornam `success: false` e `code: 'COMMERCIAL_DECOMMISSIONED'` (com status 410 em upgrade/cancel e cabeçalho `no-store`).
- Zero valores `null` por serialização de `Infinity`.

---

### Unidade de Trabalho 2: Limpeza Visual, Desacoplamento & Redirecionamento

#### Objetivo
Remover CTAs comerciais, banners, badges promocionais e modais de upgrade de todas as páginas públicas e do candidato, desacoplar componentes comerciais sem deleção física destrutiva, ocultar o item financeiro da Sidebar do Workspace e implementar redirecionamento HTTP 307 server-side em `/pricing`.

#### Inventário Completo de Referências Comerciais
| Arquivo | Localização / Linhas | Elemento Comercial | Ação na Unidade 2 |
| :--- | :--- | :--- | :--- |
| `src/app/(public)/page.tsx` | Linhas 272–278 | Botão/CTA "Conhecer Planos" com ícone Crown | Remover botão e manter apenas "Criar Conta Gratuita". |
| `src/components/Navbar.tsx` | Linhas 138, 185, 327 | Link `/pricing` e badge de plano | Remover link e badge de plano. |
| `src/components/layout/AppSidebar.tsx` | Linhas 136, 308 | Link `/pricing` e badge Pro no rodapé | Remover link e badge Pro. |
| `src/components/candidate/CandidateHeader.tsx` | Linhas 32–47, 56–70 | Badge "Plano Free/Premium Pro" e botão "Fazer Upgrade Pro" | Remover botão e badge promocional, mantendo apenas identificação neutra do usuário. |
| `src/components/candidate/RecommendedTab.tsx` | Linhas 53–75, 164–171 | Banner amarelo "Plano Free" e renderização do `LockedJobCard` | Remover banner e renderizar diretamente `CandidateJobCard` para todas as vagas. |
| `src/components/candidate/ResumeTab.tsx` | Linhas 78–86 | Botão condicional "Upgrade Pro para Reanalisar" | Remover botão promocional; exibir sempre o botão funcional de análise. |
| `src/app/(public)/candidate/page.tsx` | Linhas 25, 77, 357, 482, 551, 584, 621, 636–639 | Import, estado `isUpgradeModalOpen` e `<UpgradeModal />` | Remover estado, handlers e JSX do modal. |
| `src/app/(public)/pricing/page.tsx` | Arquivo inteiro (350 linhas) | Tabela comparativa de planos, FAQ e modal de compra | Substituir por Server Component com redirect HTTP 307. |
| `src/configs/workspaceNavConfig.ts` | Linhas 184–193 | Item `gestao-pagamentos` na Sidebar | Remover o item de `WORKSPACE_NAV_GROUPS`. |
| `src/components/UpgradeModal.tsx` | Arquivo inteiro (186 linhas) | Componente modal de upgrade | Desacoplar das páginas consumidoras e marcar como `@deprecated` (manter stub seguro). |
| `src/components/candidate/LockedJobCard.tsx` | Arquivo inteiro (60 linhas) | Componente de card com cadeado | Desacoplar de `RecommendedTab.tsx` e marcar como `@deprecated` (manter stub seguro). |

#### Detalhamento das Alterações

1. **`src/app/(public)/page.tsx`**:
   - Remover o bloco `<Link href="/pricing">` (L272–278). Preservar o CTA principal "Criar Conta Gratuita".

2. **`src/configs/workspaceNavConfig.ts`**:
   - Remover o objeto `gestao-pagamentos` do array de navegação.
   - A rota legada `/admin/pagamentos` permanece preservada no arquivo `src/app/admin/pagamentos/page.tsx` para acesso direto por administradores.

3. **`src/app/(public)/pricing/page.tsx`**:
   - Substituir a página client-side por Server Component com redirect HTTP 307:
     ```tsx
     import { redirect } from 'next/navigation';
     import { getSessionUser } from '@/lib/auth';

     export const dynamic = 'force-dynamic';

     export default async function PricingPage() {
       const session = await getSessionUser();
       if (session) {
         redirect('/workspace/carreira');
       }
       redirect('/login');
     }
     ```

4. **Componentes do Candidato (`RecommendedTab.tsx`, `ResumeTab.tsx`, `CandidateHeader.tsx`, `candidate/page.tsx`)**:
   - Eliminar banners amarelos, botões de upgrade, coroas e badges Free/Pro.
   - Desacoplar a invocação de `UpgradeModal` e `LockedJobCard`.

5. **Política de Desacoplamento Não-Destrutivo**:
   - `UpgradeModal.tsx` e `LockedJobCard.tsx` não são deletados fisicamente do disco.
   - São desacoplados de todos os consumidores e anotados com comentários `@deprecated`.

#### Critérios de Aceite da Unidade 2
- Landing Page (`/`) não exibe o botão "Conhecer Planos".
- Sidebar do Workspace não exibe `gestao-pagamentos`.
- Rota `/pricing` redireciona via HTTP 307 para `/workspace/carreira` (logado) ou `/login` (anônimo).
- Painel do candidato (`/candidate`) não exibe modais de upgrade, banners de plano ou cards bloqueados.
- Rota `/admin/pagamentos` continua acessível e operacional diretamente via navegador para administradores.
- Nenhum arquivo foi deletado sem comprovação de isolamento.

---

### Unidade de Trabalho 3: QA Automatizado, Integridade SQLite WAL & Build

#### Objetivo
Executar o protocolo de backup consistente de banco SQLite operando em modo WAL, validar a integridade histórica de registros via chaves primárias e hashes SHA-256, executar a suíte determinística de 16 testes de integração e certificar o build de produção sem erros de TypeScript.

#### Arquivos Envolvidos
1. `src/test-phase101-decommissioning.ts` (nova suíte automatizada)
2. `.planning/ROADMAP.md` e `.planning/STATE.md` (registro de progresso)
3. `./buscavag.db.phase101-backup` (arquivo de snapshot consistente gerado)

#### Protocolo de Integridade e Backup do SQLite com WAL
1. **Procedimento de Backup Consistente (Antes da Unidade 1)**:
   - Caminho confirmado do banco: `path.resolve(process.cwd(), 'buscavag.db')`.
   - Como o SQLite opera em `journal_mode = WAL`, transações ativas podem residir em `buscavag.db-wal`.
   - O backup seguro executará:
     ```typescript
     // Força a sincronização/flush de todas as páginas sujas do WAL no arquivo principal
     db.pragma('wal_checkpoint(TRUNCATE)');
     // Gera snapshot consistente do arquivo principal sincronizado
     fs.copyFileSync(dbPath, backupPath);
     ```
     ou utilizará `await db.backup(backupPath)`.
   - Este procedimento garante que nenhum registro confirmado seja perdido na cópia.

2. **Captura de Baseline de Chaves Primárias e Hashes (Antes da Unidade 1)**:
   - Coletar todos os registros de `subscriptions`, `payments` e `payment_webhooks`.
   - Mapear o conjunto de IDs pré-existentes: `preSubIds`, `prePayIds`, `preWebhookIds`.
   - Gerar hash SHA-256 dos dados serializados de cada linha pré-existente: `rowHashes[table][id] = sha256(JSON.stringify(row))`.

3. **Verificação de Integridade Pós-Execução (Unidade 3 / Teste T15)**:
   - Executar `PRAGMA integrity_check;` exigindo `ok`.
   - Executar `PRAGMA foreign_key_check;` exigindo zero violações.
   - Consultar as tabelas `subscriptions`, `payments` e `payment_webhooks`:
     - **Verificação de Chaves Primárias**: Comprovar que 100% dos IDs presentes no baseline permanecem presentes no banco (`preIds.every(id => postIds.has(id))`). Isso detecta qualquer exclusão, mesmo que substituída por novo registro.
     - **Verificação de Hashes**: Para cada ID pré-existente, comparar o hash SHA-256 atual com o hash do baseline. Qualquer mutação indevida em dados financeiros históricos acusa falha fatal no teste.

#### Matriz de Casos de Teste (`src/test-phase101-decommissioning.ts`)

| ID | Caso de Teste | Critério de Validação |
| :--- | :--- | :--- |
| **T01** | Vagas salvas sem limite | Candidato salva $\ge 6$ vagas com sucesso (HTTP 200, `isSaved: true`). |
| **T02** | Vagas salvas para usuário existente `tier = 'free'` | Usuário existente com `tier = 'free'` salva $\ge 6$ vagas sem receber HTTP 403. |
| **T03** | Recomendações desbloqueadas | `GET /api/candidate/recommended-jobs` retorna todas as vagas com `isLocked: false` e URLs autênticas. |
| **T04** | Recomendações para usuário existente `tier = 'free'` | Usuário existente com `tier = 'free'` recebe 100% das vagas recomendadas sem mascaramento (`#upgrade-required`). |
| **T05** | Reanálise de CV irrestrita | Reanálise de currículo com IA permitida sem restrição de plano (inclusive para `tier = 'free'`). |
| **T06** | Cooldown técnico de 5s preservado | Segunda análise disparada $< 5$s retorna HTTP 429 `COOLDOWN_ACTIVE`. |
| **T07** | Sessão antiga com claim `tier = 'free'` | Token com claim `tier = 'free'` opera com acesso irrestrito em todas as rotas do candidato. |
| **T08** | Novos cadastros com tier premium | Cadastro via `/api/auth/register` grava `tier = 'premium'` e emite sessão correspondente. |
| **T09** | **Isolamento Estrito de RBAC com Tier Premium** | Usuário candidato com `tier = 'premium'` e `role = 'CANDIDATE'` realiza requisição autenticada a rota administrativa (`POST /api/admin/jobs/purge-non-tech` ou `GET /api/admin/usuarios`). **Exigir HTTP 403 (ou 401)** e **verificar que zero conteúdo administrativo ou dados confidenciais são retornados no corpo da resposta**. |
| **T10** | Webhook sem alteração de privilégios | Webhook de pagamento grava auditoria sem alterar `users.tier` ou `users.role`. |
| **T11** | Endpoint `/api/saas/plans` descontinuado | Retorna HTTP 200 com `success: false`, `COMMERCIAL_DECOMMISSIONED` e cabeçalho `Cache-Control: no-store`. |
| **T12** | Endpoints `/api/saas/upgrade` e `/cancel` | Retornam HTTP 410 Gone com `success: false`, `COMMERCIAL_DECOMMISSIONED` e `Cache-Control: no-store` (sem alterar banco). |
| **T13** | Redirecionamento HTTP 307 de `/pricing` | Anônimo redireciona para `/login`; autenticado redireciona para `/workspace/carreira`. |
| **T14** | Sidebar limpa & `/admin/pagamentos` preservado | Sidebar sem `gestao-pagamentos`; rota `/admin/pagamentos` responde HTTP 200 para admin. |
| **T15** | **Integridade Estrita de Registros Financeiros (PKs & Hashes)** | Capturar PKs e hashes SHA-256 de todas as linhas de `subscriptions`, `payments` e `payment_webhooks` antes da execução. Confirmar presença integral de 100% das PKs originais e integridade exata dos hashes após a execução (detectando deleções ou alterações espúrias), com `PRAGMA integrity_check` retornando `ok`. |
| **T16** | Ausência de `Infinity` serializado | Respostas JSON de limites e planos não contêm campos serializados como `null`. |

#### Validação de Compilação & Build
- `npx tsc --noEmit` confirmando zero erros de tipagem TypeScript.
- `npm run build` confirmando compilação bem-sucedida do Next.js.

---

## 5. Ordem de Execução & Dependências

```
Etapa 0: Salvaguarda Inicial
  ├── PRAGMA wal_checkpoint(TRUNCATE) + Backup consistente buscavag.db.phase101-backup
  └── Captura do baseline determinístico (PKs e Hashes SHA-256 das tabelas financeiras)
      │
      ▼
Etapa 1: Backend & Contratos (Unidade 1)
  ├── Atualização de saasLimits.ts (elimina risco de Infinity/null)
  ├── Ajuste dos handlers /api/candidate/* (saved-jobs, recommended-jobs, analyze-cv)
  ├── Desacoplamento total de autorização em relação a tier (suporte pleno a tier='free')
  ├── Ajuste de registro e repositório (tier default premium para novos usuários)
  ├── Remoção de UPDATE users.tier em webhooks
  └── Descontinuação das rotas /api/saas/* (HTTP 410 / 200 com success: false e no-store)
      │
      ▼
Etapa 2: Frontend & Interface (Unidade 2)
  ├── Remoção de gestao-pagamentos de WORKSPACE_NAV_GROUPS
  ├── Remoção do CTA comercial em src/app/(public)/page.tsx
  ├── Implementação do redirect 307 em src/app/(public)/pricing/page.tsx
  ├── Limpeza dos componentes do candidato (tabs, header, badges)
  └── Desacoplamento não-destrutivo de UpgradeModal e LockedJobCard
      │
      ▼
Etapa 3: Validação & Certificação (Unidade 3)
  ├── Execução da suíte automatizada test-phase101-decommissioning.ts (16 testes)
  ├── Auditoria de integridade SQLite (comparação de PKs, Hashes SHA-256, PRAGMA integrity_check)
  ├── Testes manuais de navegação (Workspace, /candidate e /admin/pagamentos)
  └── Compilação Next.js (npm run build)
```

---

## 6. Estratégia de Rollback por Unidade

1. **Unidade 1 (Backend)**:
   - Se houver falha de regressão em APIs: restauração completa do banco a partir do backup consistente `buscavag.db.phase101-backup` e `git checkout` dos arquivos modificados de backend.
2. **Unidade 2 (Frontend)**:
   - Se houver quebra de layout ou hidratação: `git checkout` dos arquivos de componentes e páginas frontend.
3. **Unidade 3 (QA)**:
   - Nenhuma alteração destrutiva é realizada na unidade 3; se a suíte falhar, os ajustes são aplicados nas unidades correspondentes antes de qualquer aprovação.

---

## 7. Critérios de Aceite Globais da Phase 101

- [ ] **CA-01 (Vagas Salvas Ilimitadas)**: Candidatos (novos e existentes com `tier = 'free'`) salvam mais de 5 vagas sem HTTP 403.
- [ ] **CA-02 (Recomendações Desbloqueadas)**: Candidatos (novos e existentes com `tier = 'free'`) visualizam 100% das vagas com links reais.
- [ ] **CA-03 (Análise de CV Irrestrita)**: Reanálise de currículo permitida para qualquer usuário, respeitando unicamente o cooldown de 5s.
- [ ] **CA-04 (Sessões Legadas)**: Sessões antigas com claim `tier = 'free'` operam sem bloqueios comerciais.
- [ ] **CA-05 (Novos Cadastros)**: Novos usuários recebem `tier = 'premium'` e role `'CANDIDATE'`.
- [ ] **CA-06 (Webhooks Blindados)**: Webhooks gravam auditoria sem alterar `users.tier`, `users.role` ou conceder/revogar benefícios.
- [ ] **CA-07 (Rotas SaaS Descontinuadas)**: `/api/saas/*` retornam `success: false` e `COMMERCIAL_DECOMMISSIONED` com `Cache-Control: no-store`.
- [ ] **CA-08 (Rota /pricing)**: `/pricing` redireciona via HTTP 307 para `/workspace/carreira` (logado) ou `/login` (anônimo).
- [ ] **CA-09 (Interface Limpa)**: Zero menções a planos comerciais, botões de upgrade ou paywalls nas páginas ativas (incluindo Landing Page).
- [ ] **CA-10 (Sidebar Despoluída)**: O item `gestao-pagamentos` não está visível no Workspace Shell.
- [ ] **CA-11 (Módulo Histórico Preservado)**: A rota `/admin/pagamentos` permanece funcional para administradores autenticados.
- [ ] **CA-12 (Integridade por Hashes e PKs)**: 100% das chaves primárias e hashes SHA-256 das tabelas financeiras são idênticos pré e pós-execução, e `PRAGMA integrity_check` retorna `ok`.
- [ ] **CA-13 (Rotas Legadas Preservadas)**: Rotas `/candidate` e `/admin` permanecem operacionais sem redirecionamentos globais.
- [ ] **CA-14 (Isolamento RBAC)**: Candidato com `tier = 'premium'` é estritamente bloqueado em rotas administrativas (HTTP 403/401 sem vazamento de dados).
- [ ] **CA-15 (Suíte de Testes & Build)**: 100% de aprovação nos 16 testes de `test-phase101-decommissioning.ts` e `npm run build` aprovado.

---

> **Aviso de Governança GSD**: Este plano é estritamente documental. Nenhum código de produção em `src/` foi modificado. A execução só será iniciada após autorização formal do Tech Lead.
