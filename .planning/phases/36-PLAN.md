# Phase 36 Plan: Autenticação e Painel do Candidato

## Metadata
- **Phase**: 36
- **Milestone**: 10 (Painel do Candidato, Análise de CV com IA e Fundação SaaS)
- **Scope**: Implementar sistema de autenticação segura de candidatos, persistência de perfis e currículos no SQLite, APIs de upload e preferências, e painel interativo do candidato com design system premium.
- **Dependencies**: Milestone 9 (Base de vagas e motor Scrapling ativo)

---

## Objective
Transformar a experiência do Buscavag em um portal centrado no candidato. O usuário poderá criar sua conta, definir preferências de carreira (cargo alvo, senioridade, pretensão salarial, modalidades de trabalho), fazer upload do seu currículo em PDF/DOCX e acompanhar vagas salvas/candidaturas através de um painel moderno e intuitivo.

---

## Detailed Task Breakdown

### Task 1: Modelagem de Dados & Repositório do Candidato
- **Arquivo**: `src/db/index.ts`
  - Criar tabelas SQLite:
    - `users` (`id`, `email`, `password_hash`, `name`, `tier DEFAULT 'free'`, `created_at`, `updated_at`)
    - `candidate_profiles` (`user_id`, `target_role`, `seniority`, `expected_salary`, `preferred_work_models`, `skills`, `bio`, `updated_at`)
    - `candidate_resumes` (`id`, `user_id`, `filename`, `file_path`, `file_size`, `file_type`, `uploaded_at`)
    - `user_saved_jobs` (`user_id`, `job_id`, `status DEFAULT 'saved'`, `created_at`)
- **Arquivo**: `src/db/candidateRepository.ts`
  - Implementar classe `CandidateRepository` com métodos para manipulação de usuários, perfis, upload de currículos e vagas salvas.

### Task 2: Autenticação Segura e Serviços de Sessão
- **Arquivo**: `src/lib/auth.ts`
  - Métodos utilitários de hash e validação de senhas com `crypto.scryptSync`.
  - Assinatura e decodificação de tokens de sessão (JWT/HMAC seguro) com cookies `httpOnly`.
- **Rotas API**:
  - `src/app/api/auth/register/route.ts`: Registro de novo usuário com validação Zod.
  - `src/app/api/auth/login/route.ts`: Autenticação e emissão de cookie seguro.
  - `src/app/api/auth/logout/route.ts`: Invalidação e limpeza de cookie de sessão.
  - `src/app/api/auth/me/route.ts`: Retorno dos dados do usuário logado + perfil.

### Task 3: APIs de Gestão de Perfil, Currículo e Vagas Salvas
- **Rotas API**:
  - `src/app/api/candidate/profile/route.ts`: Atualização das preferências profissionais do candidato.
  - `src/app/api/candidate/resume/route.ts`: Upload multipart de arquivos `.pdf` e `.docx`, salvando em `uploads/resumes/` e registrando no banco de dados.
  - `src/app/api/candidate/saved-jobs/route.ts`: Consulta e alternância de vagas salvas/aplicadas pelo usuário.

### Task 4: Telas de Login, Registro e Painel do Candidato
- **Telas**:
  - `src/app/login/page.tsx`: Tela de login moderna com dark mode, micro-animações Framer Motion e tratamento de erros.
  - `src/app/register/page.tsx`: Tela de cadastro ágil com confirmação de senha e redirecionamento automático.
  - `src/app/candidate/page.tsx`: Painel central do candidato estruturado em abas:
    1. **Perfil Profissional**: Formulário para cargo alvo, pretensão salarial, senioridade e modalidades (Remoto/Híbrido/Presencial).
    2. **Meu Currículo**: Upload drag-and-drop de arquivo PDF/DOCX, indicador de tamanho, data de envio e opções de substituição/download.
    3. **Vagas Salvas & Candidaturas**: Listagem das oportunidades favoritadas com atalhos de status.
- **Componentes**:
  - Atualização do [`src/components/Navbar.tsx`](file:///home/moa-dev/projetos/buscavag/src/components/Navbar.tsx) para exibir estado autenticado (Avatar, nome do usuário, badge do plano `Free`, atalho para `/candidate` e botão de logout).

### Task 5: Testes e Validação
- **Arquivo**: `src/test-candidate-auth.ts`
  - Script para testar fluxo completo de cadastro, login, atualização de perfil e salvamento de vagas.
- Executar `npx tsc --noEmit` para garantir conformidade estrita de tipagem.

---

## Verification Plan

1. **Tipagem e Build**: `npx tsc --noEmit` sem nenhum erro.
2. **Teste de Fluxo Backend**: Executar `npx tsx src/test-candidate-auth.ts` validando registro, autenticação de senha, persistência de perfil e manipulação de currículo.
3. **Validação Visual e de UI**: Navegar pelas rotas `/login`, `/register`, `/candidate` e verificar a responsividade e o funcionamento dos formulários.
