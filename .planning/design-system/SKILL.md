---
name: buscavag-design-system
description: "Design System oficial, tokens de estilo, componentes shadcn/ui e regras de interface para o Buscavag Personal Workspace"
---

# Buscavag Design System & Regras de Interface (Personal Workspace)

<objective>
Este documento é a especificação normativa e guia permanente de UI/UX para todos os agentes GSD no projeto Buscavag.
Qualquer implementação visual, criação ou refatoração de componentes, telas ou fluxos de usuário DEVE seguir rigorosamente as regras aqui estabelecidas.
</objective>

---

## 1. Diretriz de Consulta a Componentes (MCP vs Fallback Local)

1. **Referência Primária — MCP shadcn Oficial**:
   - Sempre que disponível no ambiente de execução, o agente deve consultar as ferramentas do MCP oficial de shadcn para validar contratos, props e variações de componentes.
2. **Declaração Obrigatória e Fallback Local Auditado**:
   - Caso o MCP oficial do shadcn não esteja registrado como servidor ativo no ambiente (o que é o caso atual, onde constam apenas `StitchMCP` e `trello`), o agente **DEVE DECLARAR FORMALMENTE** esta condição no relatório da tarefa:
     > *"O MCP oficial do shadcn não está ativo no runtime deste ambiente. Utilizando como referência canônica a base local auditada em `admincn-v1.0.0/src/components/ui/`."*
   - É **estritamente proibido** alegar consultas ao MCP que não foram executadas.
   - Os componentes de `admincn-v1.0.0/src/components/ui/` foram inspecionados e utilizam a arquitetura moderna `@base-ui/react` (já instalada no Buscavag como `@base-ui/react@1.8.0`), sendo 100% compatíveis com nosso runtime.

---

## 2. Princípios Estéticos & Identidade Visual

- **Profissional, Sóbrio e de Alta Densidade (Linear/Vercel/shadcn)**:
  - O Buscavag é um *Personal Workspace*, não uma landing page de marketing nem um playground experimental de IA.
  - A interface deve transmitir precisão, produtividade e elegância técnica.
- **Proibição de Estética Genérica de IA**:
  - Proibido o uso de gradientes neon excessivos (roxo/magenta berrantes).
  - Proibido sombras coloridas difusas desmedidas (*colored glows*) ou animações distrativas desnecessárias.
  - Destaques visuais devem usar acentos funcionais sutis (bordas precisas `border-border/60`, fundos com opacidade controlada `bg-muted/50`).
- **Suporte Total a Temas (Claro e Escuro)**:
  - Todo componente deve funcionar com perfeição tanto no tema claro quanto no escuro, garantindo contraste mínimo WCAG AA (mínimo 4.5:1 para texto normal, 3:1 para elementos de interface).
  - Nunca utilize cores absolutas como `bg-white` ou `text-black` diretamente em componentes compartilhados; utilize sempre as classes semânticas (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`).

---

## 3. Tokens Centralizados de Design

Os tokens estão definidos no padrão HSL em `src/app/globals.css`, estendidos pelo `tailwind.config.ts`:

### Variáveis Globais de Cores
- `--background` / `--foreground`: Fundo geral da página e texto principal.
- `--card` / `--card-foreground`: Superfícies de cartões e painéis.
- `--popover` / `--popover-foreground`: Menus suspensos, dropdowns, popovers e toasts.
- `--primary` / `--primary-foreground`: Ações principais de destaque.
- `--secondary` / `--secondary-foreground`: Botões secundários e filtros.
- `--muted` / `--muted-foreground`: Textos secundários, legendas e fundos desabilitados.
- `--accent` / `--accent-foreground`: Estados de hover e foco em listas e menus.
- `--destructive` / `--destructive-foreground`: Ações de perigo, exclusão e erros.
- `--border` / `--input` / `--ring`: Delimitadores de componentes, inputs e anéis de foco acessível.

### Variáveis Específicas da Sidebar (Personal Workspace)
- `--sidebar-background`: Fundo dedicado da barra lateral.
- `--sidebar-foreground`: Texto e ícones da barra lateral.
- `--sidebar-border`: Borda divisória entre sidebar e conteúdo principal.
- `--sidebar-accent` / `--sidebar-accent-foreground`: Item ativo ou hover na navegação.
- `--sidebar-ring`: Foco acessível nos botões de navegação.

### Cores Preservadas de Categorias de Vagas
- `--category-fullstack`: blue-500
- `--category-mobile`: violet-500
- `--category-backend`: amber-400
- `--category-frontend`: emerald-500
- `--category-data`: purple-500
- `--category-devops`: zinc-400 (neutro de infraestrutura)
- `--category-iot`: pink-500

---

## 4. Tipografia, Espaçamentos e Raios de Borda

- **Tipografia**:
  - Padrão do sistema com classes sans-serif: `font-sans` (Geist Sans / Inter / UI Sans).
  - Código, métricas técnicas e timestamps: `font-mono` (Geist Mono / UI Monospace).
- **Escala de Espaçamento**:
  - Utilize preferencialmente múltiplos de 4 (ex: `gap-1.5`, `gap-2`, `gap-3`, `gap-4`, `gap-6`, `p-4`, `p-6`).
  - Evite paddings gigantescos que forcem rolagem desnecessária no desktop.
- **Raios de Borda (Border Radius)**:
  - Cartões e painéis: `rounded-lg` (`var(--radius)` = 0.5rem / 8px).
  - Botões e inputs: `rounded-md` (6px).
  - Badges e pílulas: `rounded-full` ou `rounded-md`.

---

## 5. Diretrizes de Responsividade Global

Toda tela ou componente novo/migrado DEVE ser testado e validado nos seguintes viewports:
1. **Desktop Largo (>= 1440px)**:
   - Sidebar expandida fixa (largura 16rem / 256px). Conteúdo centralizado ou em grid multi-coluna fluido.
2. **Notebook / Desktop Médio (1280px - 1439px)**:
   - Sidebar colapsável via atalho `Ctrl+B` ou clique no trigger. Tabelas mantêm visualização completa sem scroll quebrado.
3. **Tablet (768px - 1023px)**:
   - Sidebar em modo recolhido (ícones) ou acessível por gaveta. Grids colapsam de 3 colunas para 2 colunas.
4. **Mobile (< 768px, padrão 390px)**:
   - Sidebar desktop oculta; navegação via gaveta deslizante (`Sheet`).
   - Tabelas transformadas em cards empilhados ou com container de scroll horizontal isolado (`overflow-x-auto`).
   - Modais exibidos em tela cheia ou como bottom-sheet.
   - Zero overflow horizontal acidental no `<body>`.

---

## 6. Acessibilidade (A11y)

- **Foco Visível**: Todo elemento interativo deve possuir `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`.
- **Rotulagem Semântica**: Botões contendo apenas ícones devem obrigatoriamente ter atributo `title` e `aria-label` ou `<span className="sr-only">`.
- **Estados ARIA**: Menus e gavetas devem manter `aria-expanded` sincronizado.
- **Leitores de Tela**: Breadcrumbs devem usar `<nav aria-label="breadcrumb">` e lista `<ol>`.

---

## 7. Checklist Obrigatório de Validação de Interface (GSD Review)

Antes de considerar qualquer tarefa ou fase de interface concluída, o agente executor deve preencher e validar os seguintes itens:
- [ ] **MCP / Fonte de Componentes**: MCP consultado OU declarada explicitamente a indisponibilidade e uso da base local `admincn-v1.0.0`.
- [ ] **Tema Escuro**: Contraste perfeito de texto e superfícies no modo dark.
- [ ] **Tema Claro**: Superfícies legíveis, bordas visíveis e ausência de textos apagados no modo light.
- [ ] **Estados de Carregamento**: Presença de Skeleton loaders elegantes em chamadas assíncronas.
- [ ] **Estados Vazios (Empty States)**: Telas sem dados exibem mensagem instrutiva, ícone sutil e ação clara.
- [ ] **Responsividade em 3 Viewports**: Validado em Desktop (1440px), Tablet (768px) e Mobile (390px).
- [ ] **Zero Regressão**: As páginas legadas continuam funcionando com integridade visual e funcional.
- [ ] **Checagem TypeScript**: `npm run build` ou `tsc` executando sem erros.

