# Phase 8 Plan: Web Dashboard & Interactive Job Board

## Goal
Implementar um Web Dashboard Fullstack usando Next.js, hospedado no próprio repositório existente. O Dashboard permitirá a visualização rica das vagas avaliadas pela IA, filtragem inteligente e gestão do status da candidatura via Kanban.

---

## Tasks

### Task 1: Initialize Next.js & Frontend Tooling
- Adicionar as dependências no `package.json` (`next`, `react`, `react-dom`).
- Configurar o TypeScript para suportar React (`jsx: "preserve"`, `plugins` do Next).
- Adicionar os scripts do Next (`dev`, `build:next`, `start:next`) no `package.json`.
- Inicializar a pasta `src/app` com layout.tsx e page.tsx básicos.
- Configurar Tailwind CSS e inicializar o `shadcn-ui`.
- Adicionar componentes base via Shadcn (Button, Card, Table, Badge, Dialog, Select).

### Task 2: Database Schema Update (Kanban Status)
- Editar `src/db/index.ts` e adicionar `application_status TEXT DEFAULT 'pending'` à migração da Fase 7.
- Atualizar a interface `ProcessedJob` e `ProcessedJobSchema` (em `src/types/job.ts`) para suportar a prop `applicationStatus: 'pending' | 'applied' | 'interview' | 'offer' | 'rejected'`.
- Adicionar funções utilitárias no `JobRepository` para atualizar o status (`updateStatus(id, newStatus)`).

### Task 3: API Routes (Data Layer)
- Criar Rota `GET /api/jobs`: Ler as vagas aprovadas do SQLite (com paginação e filtros opcionais).
- Criar Rota `PATCH /api/jobs/:id/status`: Rota que recebe um novo status para atualizar no banco (usado pelo Kanban).
- Criar Rota `GET /api/stats`: Fornecer agregações (agrupamento por categoria, status, total vagas avaliadas, scores médios).

### Task 4: Dashboard & Metrics Page (`/`)
- Criar Dashboard principal em `src/app/page.tsx` usando Server Components.
- Fazer a requisição para `buscavag.db` e exibir:
  - Cards (Estatísticas como Vagas Encontradas vs Aprovadas).
  - Listagem compacta das vagas recentes com score > 80.
- Aplicar estilos dark mode e design moderno.

### Task 5: Interactive Job Board & Filters (`/jobs`)
- Criar página `src/app/jobs/page.tsx` com Data Table interativa.
- Filtros por `categoria`, `plataforma`, ordenação por `overallScore`.
- Ao clicar em uma linha, exibir o componente `JobModal` que mostra todos os detalhes da avaliação IA, os Gaps e Resume Tips gerados.

### Task 6: Kanban View (`/board`)
- Criar página `src/app/board/page.tsx`.
- Instalar e configurar uma biblioteca de Drag & Drop (ex: `@hello-pangea/dnd` ou `dnd-kit`).
- Mapear as vagas agrupadas pelo `application_status`.
- Implementar evento `onDragEnd` para invocar o endpoint `PATCH /api/jobs/:id/status` e atualizar a UI optimisticamente.

### Task 7: Testing & Verification
- Rodar `npm run build:next` para garantir que as páginas compilam com SSR.
- Testar navegação, modal, atualização de status Kanban localmente com `npm run dev`.
- Verificar logs do servidor Next garantindo ausência de erros SQLite (e.g. locks do banco rodando em paralelo com o scraper).

---

## Verification & Acceptance Criteria
1. **Frontend Boot**: O comando `npm run dev` sobe a interface Next na porta 3000 sem falhas.
2. **Database Integrity**: O scraper original continua rodando normalmente e o app Next consegue ler do `buscavag.db`.
3. **Data Display**: Dashboard exibe os Gaps e ResumeTips, que antes ficavam invisíveis no Telegram.
4. **Kanban Status Update**: Mover um card altera a coluna visualmente e persiste o status no banco de dados.
