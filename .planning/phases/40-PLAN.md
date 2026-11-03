# Phase 40 Plan: Isolamento de Estado e Limpeza UI Cliente

## Metadata
- **Phase**: 40
- **Milestone**: 11 (Painel Admin, RBAC e Refatoração de UI)
- **Scope**: Implementar o isolamento de sessão para usuários deslogados (`GUEST`), remover hardcoded personalizations ("Moacir Neto") quando a sessão for nula, introduzir CTAs convidativos para `/login` e `/register`, e limpar a interface de cliente/Navbar removendo botões e controles de infraestrutura (Scrapers, Purgar, Logs).
- **Dependencies**: Fases 36-39 (Autenticação, Análise de CV com IA, Match Perfeito e Paywall SaaS)

---

## Objective
Garantir que a experiência de candidatos e visitantes (`GUEST`) seja polida, profissional e estritamente B2C:
1. **Isolamento de Sessão & Estado Zero (GUEST)**:
   - Se o usuário não estiver autenticado, a interface não deve exibir dados pessoais fictícios ou pré-carregados (como "Moacir Neto").
   - A Home/Dashboard para GUEST deve apresentar uma visão de boas-vindas com métricas globais públicas e CTAs claros para Criar Conta / Entrar.
   - Em rotas de perfil/candidato (`/candidate`), exibir tela amigável convidando para login ou redirecionamento suave com feedback.
2. **Limpeza da Navbar e Menus**:
   - Remover controles operacionais da Navbar padrão de candidatos:
     - Botão *Purgar Não-Tech*
     - Botão *Sincronizar* / Executar Scrapers
     - Link de *Logs & Auditoria*
     - Contador bruto de infraestrutura de scrapers
   - Manter itens orientados ao candidato:
     - `Dashboard` (Visão geral de vagas e mercado)
     - `Explorador de Vagas` (`/jobs`)
     - `Vagas Recomendadas / Match IA` (`/candidate` ou `/candidate?tab=recommended`)
     - `Meu Perfil & CV` (`/candidate?tab=profile`)
     - `Planos & Preços` (`/pricing`)
3. **Hero & Call to Actions para Conversão**:
   - Adicionar banners de boas-vindas e incentivo ao cadastro na página inicial para visitantes.
   - Atualizar rodapé (`layout.tsx`) para uma assinatura institucional da plataforma Buscavag.

---

## Detailed Task Breakdown

### Task 1: Limpeza da Navbar e Navegação do Cliente
- **Arquivo**: `src/components/Navbar.tsx`
  - Reestruturar os links de navegação (`navItems` e `mobileDockItems`):
    - Manter: `Dashboard` (`/`), `Explorador de Vagas` (`/jobs`), `Vagas Recomendadas` (`/candidate`), `Planos & Preços` (`/pricing`).
    - Remover da visualização padrão de candidatos: `Logs & Auditoria`, `Purgar Não-Tech`, `Sincronizar` e badge de infraestrutura de scrapers.
  - Atualizar o menu de usuário / autenticação no topo direito:
    - Se autenticado: exibir nome do usuário logado, badge do plano (`Free` / `Premium`) e avatar com dropdown/link para `/candidate`.
    - Se deslogado (`GUEST`): exibir botões claros de "Entrar" (`/login`) e "Cadastre-se" (`/register`).

### Task 2: Refatoração da Home / Dashboard (`src/app/page.tsx`)
- **Arquivo**: `src/app/page.tsx`
  - Integrar checagem de sessão (`/api/auth/me`).
  - **Estado Autenticado**:
    - Exibir saudação dinâmica com o nome real do usuário: `Olá, {user.name}`.
    - Exibir subtítulo contextualizado com base no cargo alvo cadastrado no perfil ou perfil tech padrão.
  - **Estado Visitante (`GUEST`)**:
    - Exibir Hero de Boas-Vindas ("Encontre as melhores vagas de tecnologia com Inteligência Artificial").
    - Adicionar botões CTA em destaque: "Explorar Vagas" e "Criar Minha Conta Grátis".
    - Exibir métricas agregadas do mercado (Total de vagas ativas, vagas tech aprovadas, fontes agregadas) sem vincular a perfil pessoal.

### Task 3: Atualização do Rodapé Institucional
- **Arquivo**: `src/app/layout.tsx`
  - Substituir texto fixo `Desenvolvido para Moacir Neto • Full Stack Jr & IoT` por branding institucional limpo: `Buscavag • Plataforma Inteligente de Vagas Tech & IA`.

### Task 4: Telas de Redirecionamento e CTAs no Painel do Candidato
- **Arquivo**: `src/app/candidate/page.tsx`
  - Caso o visitante acesse `/candidate` sem autenticação, em vez de apenas redirecionar bruscamente, exibir estado visual informativo convidando o usuário a autenticar-se para desbloquear a Análise de CV com IA e Match Personalizado.

### Task 5: Testes Automatizados de Isolamento de Sessão e UI
- **Arquivo**: `src/test-session-isolation.ts`
  - Validar resposta do endpoint `/api/auth/me` para usuário não autenticado (deve retornar `{ authenticated: false }`).
  - Validar que a API `/api/candidate/profile` rejeita requisições não autenticadas com 401.
  - Validar consistência de carregamento da página de preços e explorador sem erros para usuários anônimos.

---

## Verification Plan

1. **Testes Automatizados**:
   - Executar `npx tsx src/test-session-isolation.ts` para garantir integridade do isolamento de sessão.
   - Executar `npx tsc --noEmit` para validação de tipagem TypeScript em todo o projeto.
2. **Validação Visual & Experiência**:
   - Acessar `/` em modo anônimo (deslogado) e conferir ausência do texto "Olá, Moacir Neto" e presença de CTAs de login/registro.
   - Acessar `/` logado e conferir exibição correta do nome da sessão.
   - Conferir Navbar limpa (sem botões de Purgar, Sincronizar ou Logs).
   - Verificar navegação para `/pricing`, `/jobs` e `/candidate`.
