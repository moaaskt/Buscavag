# Phase 83 Context: Padronização Visual Velzon, Correção de Formulários & Suporte a Tema Claro

## 1. Visão Geral e Contexto
A **Phase 83** é dedicada a consolidar o acabamento de UI/UX do console administrativo do BuscaVag (`/admin/**`), eliminando os pontos críticos de contraste e legibilidade em formulários e modais, estabelecendo uma biblioteca de componentes de formulário nativos Velzon e garantindo suporte impecável à alternância de temas (Dark / Light Mode) sem regressões de contraste.

---

## 2. Decisões Arquiteturais e de Design (Alinhadas com o Usuário)

### Decisão 1: Componentização Dedicada dos Campos de Formulário
- **Abordagem Escolhida**: Criar componentes utilitários dedicados em `src/components/admin/ui/`:
  - `VelzonInput.tsx`: Campo de texto padronizado com suporte a ícones prefix/suffix, erro, variantes e tokens nativos Velzon.
  - `VelzonTextarea.tsx`: Campo multilinhas padronizado com contador opcional e ajuste automático de contraste.
  - `VelzonSelect.tsx`: Dropdown padronizado com estilização de opções consistente em temas claro e escuro.
  - `VelzonLabel.tsx`: Rótulo de formulário com estilo tipográfico institucional Velzon (texto semi-bold, font-sans/mono, tratamento de asterisco para obrigatório).
- **Design Tokens Padronizados**:
  - **Fundo**: `bg-white dark:bg-[#141824]` (inputs)
  - **Bordas**: `border-[#e9ebec] dark:border-slate-700`
  - **Texto**: `text-slate-800 dark:text-slate-100`
  - **Placeholder**: `placeholder-slate-400 dark:placeholder-slate-500`
  - **Focus Ring**: `focus:outline-none focus:border-[#405189] focus:ring-1 focus:ring-[#405189]`
  - **Estado Inválido/Erro**: `border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 focus:ring-rose-500`

### Decisão 2: Estilo da Sidebar Velzon no Tema Claro
- **Abordagem Escolhida**: **Sidebar Dark Navy Clássica Permanente** (`#1f2430` / `#1a1e29`), que é o padrão consagrado corporativo do tema Velzon (Themesbrand).
- A Sidebar mantém seu fundo escuro elegante, contraste AA para textos (`text-slate-300` / `hover:text-white`), ícones e badges institucionais em qualquer tema.
- O restante da interface (Header, Área de Conteúdo, Widgets, Cards, Tabelas, Modais) alterna dinamicamente com fidelidade entre Light Mode (`bg-[#f3f3f9]`, cards brancos com borda `#e9ebec`, textos `text-slate-800`) e Dark Mode (`bg-[#141824]`, cards `#1f2430` com borda `slate-800`, textos `text-slate-100`).

### Decisão 3: Alternância de Tema no AdminHeader
- **Abordagem Escolhida**: Adicionar o botão de alternância manual Sol/Lua (Sun / Moon) diretamente no `AdminHeader.tsx`.
- **Sincronização de Estado**:
  - Ler e persistir o valor em `localStorage.getItem('buscavag_theme')` (`'dark'` ou `'light'`).
  - Adicionar/remover dinamicamente a classe `dark` do elemento `document.documentElement` (`<html>`).
  - Garantir ausência de flickering no carregamento inicial através do script já existente no `RootLayout`.

---

## 3. Escopo de Refatoração e Modais Alvo

As seguintes páginas e modais devem adotar os novos componentes de formulário Velzon ou as classes padronizadas:

1. **Gestão de Vagas (`/admin/vagas`)**:
   - Modal de Edição/Criação de Vaga (`editForm`): inputs de título, empresa, localização, modelo de trabalho, faixa salarial, canal de candidatura e stack.
   - Modal de Preview de Expurgo Seguro.

2. **Hub de Mensageria (`/admin/mensageria`)**:
   - Simulador de Pitch (`pitchForm`): título, empresa, contato direto, candidato, stack técnica real.
   - Modal de Disparo Manual de Teste: seletor de canal (Telegram / WhatsApp), destinatário, textarea da mensagem.

3. **Gestão Financeira & MRR (`/admin/pagamentos`)**:
   - Modal de Concessão de Cortesia Pro (`courtesyUserId`, `courtesyDays`, `courtesyReason`).
   - Modal de Confirmação de Estorno.

4. **Gestão de Usuários & Suporte (`/admin/usuarios`)**:
   - Modal de Reset de Senha pelo Suporte.
   - Modal de Alteração de Plano (Free ↔ Pro).
   - Modal de Suspensão / Reativação de Conta.

5. **Logs & Auditoria (`/admin/logs`)**:
   - Barra de filtros rápidos: input de busca textual, select de nível, select de tipo, select de período.

---

## 4. Critérios de Sucesso e Validação

1. **Zero Textos Invisíveis**: Nenhum formulário ou modal apresentará texto escuro em fundo escuro ou texto claro em fundo branco, tanto em Dark Mode quanto em Light Mode.
2. **Componentização Centralizada**: Os componentes `VelzonInput`, `VelzonTextarea`, `VelzonSelect` e `VelzonLabel` estarão criados em `src/components/admin/ui/` e exportados via `index.ts` ou diretamente.
3. **Alternância de Tema Funcional**: Clicar no botão Sol/Lua no `AdminHeader` alterna o tema instantaneamente e persiste a escolha no `localStorage`.
4. **Sidebar Preservada**: A sidebar continua em tom Dark Navy com contraste impecável.
5. **Garantia de Não-Regressão**:
   - `npm test` aprovando todas as 9 suítes.
   - Todas as suítes das fases 76 a 82 aprovadas.
   - Nova suíte `src/test-phase83.ts` aprovando 100% dos testes.
   - `npx tsc --noEmit` com 0 erros.
   - `npm run build:next` compilando todas as 35 rotas com sucesso.
