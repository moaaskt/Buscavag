# Phase 15: Setup do Design System e Dependências (Tailwind + Framer Motion + Shadcn UI Foundation)

## 1. Objetivo
Estruturar os fundamentos de UI para a plataforma Buscavag v4.0. Adicionar suporte a animações (Framer Motion), utilitários (Tailwind CSS) e inicializar a biblioteca de componentes headless Shadcn UI configurada com a paleta de cores "Devs & IoT".

## 2. Escopo de Trabalho
- Criação de `src/lib/utils.ts` para auxiliar classes (cn, tailwind-merge, clsx).
- Inicialização do Shadcn UI CLI (`components.json`).
- Adição dos componentes Core (`Button`, `Badge`, `Card`, `Dialog`, `Tabs`, `DropdownMenu`, `Tooltip`).
- Sobrescrita da configuração do `tailwind.config.ts` compatível com os componentes e Next.js.
- Adaptação do `src/app/globals.css` para impor um Tema Dark com cores focadas em:
  - Fundo Deep Zinc (`#0A0A0A` / zinc-950)
  - Cores Primárias Cyan/Emerald (Identidade IoT/Hardware)
  - Cores Secundárias Violet/Sky (Identidade IA/Fullstack)
- Inserção do `<TooltipProvider>` no `RootLayout`.

## 3. Resultados / Verificação
- O build de produção (`npm run build:next`) foi executado e passou sem erros de Tailwind ou CSS Modules.
- O sistema está pronto para a Fase 16 (Redesign do Dashboard Principal).
