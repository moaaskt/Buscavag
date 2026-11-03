# Phase 39 Plan: Paywall e Regras SaaS (Free vs Premium)

## Metadata
- **Phase**: 39
- **Milestone**: 10 (Painel do Candidato, Análise de CV com IA e Fundação SaaS)
- **Scope**: Implementar a camada completa de monetização e regras SaaS (Planos Free vs Premium), incluindo limites de uso por plano, tela de planos e preços (`/pricing`), modal de upgrade contextual (`UpgradeModal`), guards de backend e fluxo de simulação/ativação de assinatura.
- **Dependencies**: Fases 36, 37 e 38 (Autenticação, Análise de CV com IA e Motor de Match Perfeito)

---

## Objective
Estabelecer a fundação comercial do Buscavag como um SaaS B2C/B2B voltado para candidatos de tecnologia.
Implementar:
1. **Regras de Limite por Plano**:
   - **Plano Free**: Acesso à busca geral, limite de 5 vagas salvas, top 5 vagas recomendadas desbloqueadas (as demais com visual blur/lock), 1 diagnóstico de currículo.
   - **Plano Premium**: Vagas recomendadas ilimitadas com cálculo de match em tempo real, vagas salvas ilimitadas, reanálise de currículo com IA ilimitada, dicas ATS personalizadas e badge de destaque.
2. **Página de Planos & Preços (`/pricing`)**: Comparativo visual rico, alternador mensal/anual (com desconto), selo de garantia e FAQ interativo.
3. **Modal de Upgrade Contextual (`UpgradeModal`)**: Disparado automaticamente ao tentar salvar mais de 5 vagas ou desbloquear vagas de alto match.
4. **APIs de Gestão de Assinatura**: Endpoints `/api/saas/plans`, `/api/saas/upgrade` e `/api/saas/cancel` com atualização instantânea de sessão e banco.

---

## Detailed Task Breakdown

### Task 1: Definição de Limites & Módulo SaaS
- **Arquivo**: `src/lib/saasLimits.ts`
  - Definir constantes de limites para planos `free` e `premium`:
    - `MAX_SAVED_JOBS`: Free = 5, Premium = ilimitado (`Infinity`)
    - `MAX_RECOMMENDED_JOBS_UNLOCKED`: Free = 5, Premium = ilimitado
    - `UNLIMITED_AI_ANALYSIS`: Free = false, Premium = true
  - Funções utilitárias:
    - `getTierLimits(tier: 'free' | 'premium')`
    - `canUserSaveMoreJobs(userId: string, currentSavedCount: number, tier: string): boolean`

### Task 2: Atualização de APIs do Backend com Regras de Paywall
- **Arquivo**: `src/app/api/saas/plans/route.ts` (GET):
  - Retorna catálogo de planos, valores (Mensal R$ 29,90 / Anual R$ 199,90) e tabela de recursos.
- **Arquivo**: `src/app/api/saas/upgrade/route.ts` (POST):
  - Endpoint autenticado para executar upgrade do usuário para `premium`, atualizando SQLite e cookie de sessão.
- **Arquivo**: `src/app/api/saas/cancel/route.ts` (POST):
  - Endpoint para reverter o plano para `free`.
- **Arquivo**: `src/app/api/candidate/saved-jobs/route.ts`:
  - Aplicar trava de limite para contas Free (ao tentar salvar mais de 5 vagas, retorna status 403 com `{ limitReached: true, maxAllowed: 5 }`).
- **Arquivo**: `src/app/api/candidate/recommended-jobs/route.ts`:
  - Para contas Free, marcar `isLocked: true` nos itens além do limite (top 5 abertos, subsequentes bloqueados).

### Task 3: Componente de Modal de Upgrade Contextual
- **Arquivo**: `src/components/UpgradeModal.tsx`
  - Modal estilizado em dark mode com glassmorphism, listagem de benefícios Pro, botão de ativação com 1 clique (simulação instantânea de checkout/ativação) e gatilho de feedback em tempo real (`buscavag:auth-changed`).

### Task 4: Página de Preços & Planos (`/pricing`)
- **Arquivo**: `src/app/pricing/page.tsx`
  - Header com proposta de valor clara ("Acelere sua contratação com Inteligência Artificial").
  - Switch Mensal vs Anual (Economize 45%).
  - 2 Cards de Preços (Free R$ 0 vs Premium Pro R$ 29,90/mês).
  - Tabela comparativa detalhada de funcionalidades.
  - Seção de Perguntas Frequentes (FAQ).

### Task 5: Integração no Painel do Candidato e Navbar
- **Arquivo**: `src/app/candidate/page.tsx`:
  - Integrar `UpgradeModal` ao clicar em vagas recomendadas bloqueadas ou ao atingir o limite de vagas salvas.
  - Adicionar banner contextual na aba de vagas recomendadas para usuários Free ("Desbloqueie todas as 50+ recomendações com o Premium").
  - Botão de Upgrade no Header do perfil para contas Free.
- **Arquivo**: `src/components/Navbar.tsx`:
  - Adicionar link de navegação "Planos & Preços" (`/pricing`) para fácil descoberta.

### Task 6: Testes Automatizados e Validação
- **Arquivo**: `src/test-saas-paywall.ts`:
  - Teste de limites de vagas salvas para contas Free vs Premium.
  - Teste do fluxo de upgrade e downgrade.
  - Validação do payload de vagas recomendadas com trava de bloqueio (`isLocked`).
- Executar `npx tsc --noEmit` para conformidade estrita de tipagem.

---

## Verification Plan

1. **Testes do Paywall**: Executar `npx tsx src/test-saas-paywall.ts` verificando a aplicação dos limites para contas Free e liberação total para contas Premium.
2. **Tipagem e Build**: `npx tsc --noEmit` sem erros.
3. **Validação de UI & Experiência**:
   - Acessar `/pricing`, testar alternador mensal/anual e botão de contratação.
   - No Painel do Candidato (`/candidate`), verificar o comportamento de cards bloqueados e acionamento do `UpgradeModal`.
