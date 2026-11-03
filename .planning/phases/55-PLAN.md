# Plan — Phase 55: Refatoração das Abas "Perfil Profissional" & "Meu Currículo & IA"

## Context & Objectives
As abas **Perfil Profissional** (`activeTab === 'profile'`) e **Meu Currículo & IA** (`activeTab === 'resume'`) na área do candidato (`/candidate`) concentram formulários de configuração de carreira, upload de currículo (PDF/DOCX) e o diagnóstico completo gerado por Inteligência Artificial (senioridade detectada, hard skills, resumo executivo, pontos fortes e dicas para ATS).

Embora a casca estrutural tenha recebido os tokens de base na Fase 53, diversos componentes internos dessas abas ainda apresentam problemas de contraste, badges opacas e textos com pouca legibilidade no **Light Mode**:
1. **Aba Perfil Profissional**:
   - Subtítulo `text-zinc-400` pouco contrastado no tema claro.
   - Botões de modelo de trabalho ativo/inativo (`Remoto`, `Híbrido`, `Presencial`) com contraste aprimorado (`text-emerald-700 dark:text-emerald-300`, `bg-emerald-50 dark:bg-emerald-500/10`).
   - Botão "Adicionar" habilidade (`bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200`).
   - Chips de habilidades adicionadas (`skills`): badges com fundo suave e texto legível (`bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30`), com botão de remoção `×` em hover avermelhado.
   - Feedbacks de sucesso/erro com tons semânticos harmoniosos no tema claro e escuro.

2. **Aba Meu Currículo & IA**:
   - Card de incentivo pré-análise: título `text-emerald-700 dark:text-emerald-300`, descrição `text-zinc-600 dark:text-zinc-400`, fundo `bg-emerald-50/70 dark:bg-emerald-500/5`.
   - Card de dropzone e upload: ícones, textos e bordas limpas (`text-zinc-700 dark:text-zinc-200`, `text-zinc-500 dark:text-zinc-400`).
   - Painel de Resultados de IA:
     - Badge do Diagnóstico e Senioridade Detectada com alto contraste (`text-emerald-700 dark:text-emerald-300`).
     - Resumo Executivo: fundo `bg-zinc-50 dark:bg-zinc-950/60`, texto em `text-zinc-700 dark:text-zinc-200`.
     - Hard Skills Identificadas: botão "Sincronizar com Meu Perfil" e chips de tecnologias legíveis em ambos os modos.
     - Cards de Pontos Fortes e Recomendações ATS: títulos semânticos (`text-emerald-800 dark:text-emerald-300` e `text-amber-800 dark:text-amber-300`), listas com marcadores e textos limpos.

O objetivo da **Fase 55** é garantir consistência estética, contraste impecável e usabilidade refinada nessas duas abas centrais da experiência do candidato.

---

## Inputs & Dependencies
- `src/app/candidate/page.tsx` (linhas ~1090 a ~1582)
- `.planning/REQUIREMENTS.md` (Requisitos REQ-1407, REQ-1408, REQ-1409 e REQ-1410)

---

## Tasks

### Task 1: Refatoração da Aba "Perfil Profissional" (`activeTab === 'profile'`)
1. **Tipografia e Cabeçalho**:
   - Ajustar subtítulo do card para `text-zinc-500 dark:text-zinc-400`.
2. **Campos do Formulário**:
   - Labels de campos (`Cargo Alvo`, `Senioridade`, `Pretensão Salarial`, `Modelos de Trabalho`, `Habilidades`, `Resumo Profissional`): assegurar `text-zinc-700 dark:text-zinc-300 font-mono text-xs`.
   - Botões de seleção de Modelos de Trabalho (`Remoto`, `Híbrido`, `Presencial`):
     - Selecionado: `border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs`.
     - Inativo: `border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200`.
3. **Gerenciador de Habilidades & Tecnologias**:
   - Botão "Adicionar": `bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700`.
   - Container de chips: `border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40`.
   - Chips adicionados: `border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-medium`.
   - Botão de remoção `×`: hover sutil `hover:text-rose-600 dark:hover:text-rose-400`.
4. **Feedbacks Semânticos**:
   - Mensagem de sucesso: `border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300`.
   - Mensagem de erro: `border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300`.

### Task 2: Refatoração da Seção de Arquivo e Upload de Currículo (`activeTab === 'resume'`)
1. **Cabeçalho da Aba**:
   - Subtítulo em `text-zinc-500 dark:text-zinc-400`.
2. **Card do Arquivo Enviado**:
   - Ícone de arquivo em `border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`.
   - Botão "Substituir Arquivo": `border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200`.
   - Botão "Excluir": `border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300`.
3. **Banner Pré-Análise de IA**:
   - Container: `border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/5`.
   - Título: `text-emerald-800 dark:text-emerald-300 font-semibold`.
   - Descrição: `text-zinc-600 dark:text-zinc-400`.
4. **Dropzone de Upload de Currículo**:
   - Estilo hover e ativo: bordas em `border-zinc-300 dark:border-zinc-800 hover:border-emerald-500/50`, fundo `bg-zinc-50 dark:bg-zinc-950/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5`.
   - Textos de instrução legíveis nos dois temas (`text-zinc-700 dark:text-zinc-200` e `text-zinc-500 dark:text-zinc-400`).

### Task 3: Refatoração do Painel de Diagnóstico e Insights da IA
1. **Header do Diagnóstico**:
   - Badge "Diagnóstico de IA do Currículo": `border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono`.
   - Badge de Senioridade Detectada: `border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold`.
   - Rótulos em `text-zinc-500 dark:text-zinc-400`.
2. **Resumo Executivo**:
   - Container: `border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60`.
   - Título e texto: `text-zinc-500 dark:text-zinc-400 font-mono` e `text-zinc-700 dark:text-zinc-200`.
3. **Hard Skills & Tecnologias Identificadas**:
   - Botão "Sincronizar com Meu Perfil": `border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300`.
   - Chips de Hard Skills: `border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-medium`.
4. **Pontos Fortes & Recomendações ATS**:
   - Box Pontos Fortes: `border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-zinc-950/60`, título em `text-emerald-800 dark:text-emerald-300`, itens em `text-zinc-700 dark:text-zinc-300`.
   - Box Recomendações ATS: `border-amber-200/70 dark:border-amber-900/40 bg-amber-50/70 dark:bg-zinc-950/60`, título em `text-amber-800 dark:text-amber-300`, marcadores em `text-amber-600 dark:text-amber-400`, itens em `text-zinc-700 dark:text-zinc-300`.

### Task 4: Validação, Build & Testes de Regressão
1. Executar verificação estática de tipos com `npm run build` (`tsc`).
2. Executar compilação com `npm run build:next` (24 rotas).
3. Garantir ausência total de blocos cinzas ou texto ilegível no tema claro nessas abas.

---

## Verification Criteria
- [ ] Formulário de Perfil Profissional exibe inputs, selects, botões de modelo de trabalho e chips de tecnologias legíveis e harmônicos em Light Mode.
- [ ] Botão de adicionar e remover tecnologia responde aos contrastes corretos.
- [ ] Card de currículo e dropzone de PDF/Word têm feedback visual limpo e sem blocos opacos escuros em Light Mode.
- [ ] Painel de resultados da IA (senioridade, resumo executivo, hard skills, pontos fortes e dicas ATS) renderiza perfeitamente nos modos claro e escuro.
- [ ] `tsc` e `npm run build:next` executam com 0 erros.
