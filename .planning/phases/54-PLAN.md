# Plan — Phase 54: Refatoração da Aba "Vagas Recomendadas" & Bloco "Parecer de Match com IA"

## Context & Objectives
A aba **Vagas Recomendadas** (`activeTab === 'recommended'`) na área do candidato (`/candidate`) exibe as oportunidades analisadas pelo algoritmo de inteligência artificial com scores de aderência, habilidades atendidas e pareceres explicativos.

Na Fase 53, a casca e os elementos principais foram adaptados, porém a aba ainda possui elementos visuais que necessitam de refinamento completo no tema claro e escuro:
1. **Cards Bloqueados do Plano Free (`isLocked === true`)**: Fundo escuro rígido (`bg-zinc-900/40`, `border-zinc-800`), títulos sem contraste em modo claro (`text-zinc-200`) e banner interno escuro.
2. **Banner Informativo Pro (Free Tier)**: Tipografia e contraste adaptativo para leitura confortável em Light Mode (`text-amber-900 dark:text-amber-200`, `text-zinc-600 dark:text-zinc-400`).
3. **Filtros e Controles de Match**: Botões ativos de filtro de pontuação com contraste harmônico no tema claro (`text-emerald-700 dark:text-emerald-300`, `bg-emerald-50 dark:bg-emerald-500/10`).
4. **Chips de Habilidades & Parecer IA**: Badges de *Habilidades Atendidas* (`matchedSkills`) e *Requisitos Adicionais* (`missingSkills`) com tipografia nítida e legível em ambos os temas.

O objetivo da **Fase 54** é atingir 100% de consistência estética, contraste e responsividade em todos os estados da aba **Vagas Recomendadas**.

---

## Inputs & Dependencies
- `src/app/candidate/page.tsx` (Componente da rota `/candidate`, linhas ~712–1085)
- `.planning/REQUIREMENTS.md` (Requisitos REQ-1404, REQ-1405 e REQ-1406)

---

## Tasks

### Task 1: Refatoração do Banner Informativo do Plano Free (`src/app/candidate/page.tsx`)
1. Atualizar o container do banner Pro com fundo e borda balanceados:
   - Fundo com gradiente suave adaptativo: `bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-emerald-500/10 border-amber-500/30`.
   - Ícone de coroa com badge: `bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400`.
2. Ajustar os textos informativos:
   - Título: `text-zinc-900 dark:text-amber-200 font-bold`.
   - Descrição: `text-zinc-600 dark:text-zinc-400`.
3. Ajustar o botão de ação "Fazer Upgrade Pro" com destaque e sombra refinada.

### Task 2: Refatoração da Barra de Filtros & Busca de Recomendações
1. Ajustar os botões de filtro de score mínimo (`minScoreFilter`):
   - Estado ativo: `border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs`.
   - Estado inativo: `border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200`.
2. Refinar inputs de busca (`searchRec`), select de modalidade (`workModelRec`) e botão de refresh de recomendações com bordas e placeholders adaptativos.

### Task 3: Refatoração dos Cards de Oportunidades Bloqueadas (`isLocked === true`)
1. Substituir o fundo fixo escuro por card translúcido adaptativo:
   - Container: `border border-amber-500/30 bg-white/90 dark:bg-zinc-900/50 backdrop-blur-xl shadow-sm dark:shadow-lg`.
2. Header do card bloqueado:
   - Badge de plataforma: `border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400`.
   - Badge "Exclusivo Pro": `border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300`.
3. Corpo do card bloqueado:
   - Título da vaga: `text-zinc-900 dark:text-zinc-100`.
   - Empresa com blur: `text-zinc-500 dark:text-zinc-400`.
   - Box de incentivo Pro: `border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 p-4 rounded-xl`.
   - Título do box: `text-amber-800 dark:text-amber-200 font-bold`.
   - Texto descritivo: `text-zinc-600 dark:text-zinc-400`.
4. Rodapé do card bloqueado:
   - Divisor: `border-t border-zinc-200 dark:border-zinc-800/80`.
   - Código identificador: `text-zinc-500 dark:text-zinc-500 font-mono`.
   - Botão "Desbloquear Vaga (Pro)": visual premium com gradiente âmbar.

### Task 4: Refinamento dos Cards de Vagas Recomendadas Ativas & Badges de Skills
1. Badges de *Habilidades Atendidas* (`matchedSkills`):
   - Label: `text-zinc-600 dark:text-zinc-400` com ícone `Check` em `text-emerald-600 dark:text-emerald-400`.
   - Chips: `border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium`.
2. Badges de *Requisitos Adicionais* (`missingSkills`):
   - Label: `text-zinc-500 dark:text-zinc-400`.
   - Chips: `border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400`.
3. Parecer de Match IA:
   - Assegurar contraste agradável em ambos os modos (`bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-zinc-700 dark:text-zinc-300`).
4. Botões de ação (Salvar vaga / Acessar vaga):
   - Hover states suaves e feedback de clique com escala ativa.

### Task 5: Validação, Build & Testes de Regressão Visual
1. Executar `npm run build` (`tsc`) para validação estática de tipos.
2. Executar `npm run build:next` para validar todas as rotas do Next.js.
3. Verificar a renderização em ambos os temas para cards normais, bloqueados, filtros e empty states.

---

## Verification Criteria
- [ ] Banner Free Tier exibe contrastes nítidos de texto e ícones tanto em tema claro quanto escuro.
- [ ] Botões de filtro rápido de match (Todos, ≥ 50%, ≥ 70%, ≥ 85%) têm estado ativo com alta legibilidade em Light Mode.
- [ ] Cards de vagas bloqueadas (`isLocked`) não possuem mais fundos escuros pesados (`bg-zinc-900/40`, `text-zinc-200`) no Light Mode.
- [ ] Chips de "Habilidades Atendidas" e "Requisitos Adicionais" possuem contrastes acessíveis nos dois temas.
- [ ] `tsc` e `npm run build:next` compilam com 0 erros.
