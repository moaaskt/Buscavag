# Phase 59: Integração UI, Badges "Facebook Group" & Compatibilidade Candidato

## 1. Objetivo
Adaptar o frontend (`/jobs`, `/candidate` e os componentes associados) para exibir os novos metadados extraídos das vagas informais de forma destacada, incluindo identificação visual específica para a fonte Facebook Groups.

## 2. Requisitos a Serem Atendidos
- **Filtros por Fonte:** Adicionar "Facebook Groups (Tech)" ao seletor de Plataforma na UI Explorador de Vagas (`src/app/jobs/page.tsx`).
- **Badge Visual de Plataforma:** Refatorar a renderização crua de `job.platform` para utilizar um novo componente `<PlatformBadge platform={job.platform} />`, aplicando um estilo e ícone dedicados (ex: Lucide `Users` ou estilo Facebook Blue) quando a origem for `facebook_groups`.
- **Exibição dos Novos Metadados (Phase 58):** Modificar o `<JobModal />` para exibir os campos extraídos `extractedRole`, `contractType`, `applicationChannel` e `salary` como badges informativos logo abaixo das informações principais.
- **Integração Área do Candidato (`/candidate`):** Substituir as spans raw de `{item.job.platform}` pelo `<PlatformBadge />` na listagem de Vagas Recomendadas e Salvas, garantindo consistência no ecossistema e visual claro e escuro (Dark Mode).

## 3. Componentes Modificados
- `src/app/jobs/page.tsx`
- `src/components/JobCard.tsx`
- `src/components/JobModal.tsx`
- `src/app/candidate/page.tsx`
- **NOVO:** `src/components/ui/PlatformBadge.tsx`
