# Plan — Phase 56: Refatoração da Aba "Vagas Salvas", Grid Responsivo & Validação Visual Global

## Context & Objectives
A **Fase 56** encerra o **Milestone 14.0** garantindo a consistência visual, legibilidade e polimento responsivo em toda a experiência do candidato (`/candidate`).

Embora as abas "Vagas Recomendadas", "Perfil Profissional" e "Meu Currículo & IA" tenham sido integralmente adaptadas nas Fases 53, 54 e 55, a aba **Vagas Salvas** (`activeTab === 'saved'`) ainda possui resquícios de classes escuras fixas e oportunidades de melhoria de grid e acabamento:
1. **Cards de Vagas Salvas**:
   - Subtítulo da aba em `text-zinc-400`.
   - Estado vazio de vagas salvas com bordas e ícones sem o contraste ideal no tema claro.
   - Badge da plataforma (`item.job.platform`) em fundo cinza opaco escuro (`bg-zinc-100 dark:bg-zinc-900`).
   - Botão de exclusão (`Trash2`) e link de acesso à vaga ("Ver Vaga") com estilização alinhada aos cards refinados das recomendações.
   - Divisor do rodapé com borda adaptativa suave (`border-zinc-200 dark:border-zinc-800/80`).
2. **Revisão Estrutural Global e Responsividade**:
   - Validação de contrastes da casca estrutural (requisitos REQ-1401, REQ-1402 e REQ-1403).
   - Comportamento responsivo em dispositivos móveis (telas pequenas de 320px–768px): quebra de linha da barra de abas, grids de 1 a 2 colunas e alinhamento dos botões nos headers.
   - Validação da alternância entre Light Mode e Dark Mode sem artefatos ou blocos cinzas estáticos.

---

## Inputs & Dependencies
- `src/app/candidate/page.tsx` (linhas ~1584 a ~1690 e estrutura geral da página)
- `.planning/REQUIREMENTS.md` (Requisitos REQ-1401, REQ-1402, REQ-1403, REQ-1411 e REQ-1412)

---

## Tasks

### Task 1: Refatoração da Aba "Vagas Salvas" (`activeTab === 'saved'`)
1. **Cabeçalho & Subtítulo**:
   - Ajustar subtítulo explicativo para `text-zinc-500 dark:text-zinc-400`.
   - Botão "Ver Vagas Recomendadas" com padrão visual refinado e sombra esmeralda suave.
2. **Estado Vazio (Empty State)**:
   - Container: `border border-zinc-200 dark:border-zinc-800/80 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 p-8`.
   - Ícone `Bookmark`: `text-zinc-400 dark:text-zinc-600`.
   - Título: `text-zinc-800 dark:text-zinc-200 font-semibold`.
   - Texto de apoio: `text-zinc-500 dark:text-zinc-400`.
   - Botão de ação "Ir para Vagas Recomendadas": `bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold px-4 py-2 text-xs shadow-xs`.
3. **Cards de Vagas Salvas no Grid**:
   - Container do card: `rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-5 backdrop-blur-xl hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group`.
   - Badge de plataforma: `border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-[10px] font-mono uppercase`.
   - Botão de exclusão (`Trash2`): `text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30`.
   - Título da vaga: `text-zinc-900 dark:text-zinc-100 font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors`.
   - Empresa e metadados (localização, data): `text-zinc-500 dark:text-zinc-400`.
   - Rodapé do card:
     - Divisor: `border-t border-zinc-200 dark:border-zinc-800/80`.
     - Score IA badge / tag: `text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold`.
     - Botão "Ver Vaga": `bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold px-3.5 py-1.5 text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors`.

### Task 2: Auditoria e Polimento Global de Responsividade & Temas em `/candidate`
1. **Barra de Abas (`Navigation Tabs`)**:
   - Assegurar rolagem horizontal suave no mobile (`scrollbar-none`, `overflow-x-auto`) sem clipping nos cantos arredondados.
2. **Cards de Métricas e Grids**:
   - Conferir comportamento responsivo `grid-cols-1 md:grid-cols-2` nas abas e colapso gracioso em viewports menores que 640px.
3. **Header do Usuário**:
   - Espaçamento responsivo no avatar, nome, plano e botões de logout e upgrade.

### Task 3: Validação Completa, Testes de Build & Finalização do Milestone
1. Executar verificação de tipos com `npm run build` (`tsc`).
2. Executar compilação com `npm run build:next` em todas as 24 rotas.
3. Atualizar documentação do roadmap e requisitos com 100% de conclusão do Milestone 14.

---

## Verification Criteria
- [ ] Grid de vagas salvas apresenta visual moderno e 100% compatível com tema claro e escuro.
- [ ] Card de vaga salva possui tipografia, badges e botões com excelente contraste e interatividade.
- [ ] Estado de "Nenhuma vaga salva" tem visual limpo com CTA direto para as recomendações.
- [ ] Navegação mobile e desktop funciona sem quebra de layout em todas as 4 abas.
- [ ] `tsc` e `npm run build:next` executam sem nenhum erro.
- [ ] Requisitos REQ-1401 a REQ-1412 do Milestone 14 integralmente atendidos.
