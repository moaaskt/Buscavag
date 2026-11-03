# Phase 69 (Revisado): Dinamização do Pitch de Abordagem & Experiência do Candidato

**Milestone:** v18.0  
**Status:** Revisado & Pronto para Execução  
**Data:** 21/09/2026  

---

## 1. Objetivo da Fase
Dinamizar a geração de pitch de abordagem do BuscaVag para que candidatos de qualquer nível e especialidade possam copiar uma mensagem de apresentação 100% alinhada com seu perfil profissional real (`target_role`, `primary_stack` ou `skills`), com saudações contextuais adaptadas à origem da vaga (LinkedIn Posts, Facebook Groups, contato direto via e-mail ou plataformas de ATS) e fallback elegante caso o candidato ainda não tenha preenchido suas tecnologias, sem alucinar competências.

---

## 2. Requisitos Cobertos
- `REQ-04`: Dinamizar a geração de pitch no `JobModal.tsx` utilizando as stacks primárias (`primary_stack`) e cargo pretendido (`target_role`) do perfil do candidato logado.
- `REQ-05`: Manter suporte a abordagens específicas para vagas originadas de posts informais (LinkedIn Posts / Facebook Groups) e contato direto (`directContact`).
- `REQ-06`: Garantir fallback elegante caso o perfil do candidato ainda não possua stacks primárias cadastradas (sem inventar tecnologias).

---

## 3. Escopo Cirúrgico de Arquivos

| Arquivo | Ação | Justificativa Técnica |
|---|---|---|
| `src/lib/pitchGenerator.ts` | **NOVO** | Função pura desacoplada de React/DOM, garantindo testes unitários determinísticos para todas as permutações de dados e canais. |
| `src/components/JobModal.tsx` | **MODIFICAÇÃO** | Modal central de detalhes. Substitui o texto estático pela chamada a `generatePitch`, aceita `candidateProfile` via prop com fallback assíncrono para `/api/candidate/profile`. |
| `src/app/candidate/page.tsx` | **MODIFICAÇÃO** | Permite que o candidato abra o `JobModal` a partir dos cards de "Vagas Recomendadas" e "Vagas Salvas", passando o perfil em memória. |
| `src/test-phase69.ts` | **NOVO** | Suíte de testes automatizados cobrindo 8 cenários de canais, dados parciais e fallbacks. |

> **Nota de Saneamento:** `src/services/whatsappService.ts` foi removido do escopo da Phase 69 por ser um serviço desacoplado de envio em background via webhook/cron, evitando alterações desnecessárias e riscos de regressão no `test-whatsapp.ts`.

---

## 4. Matriz de Precedência & Ausência de Alucinação

1. **Cargo / Especialidade (`roleTitle`):**
   - 1ª Prioridade: `profile.target_role?.trim()`.
   - 2ª Prioridade (Fallback): Título da vaga contextualizado: `"atuar na posição de ${job.title}"`.
   - 3ª Prioridade: Termo genérico neutro: `"desenvolvimento de software"`.

2. **Tecnologias / Stacks (`technologiesText`):**
   - 1ª Prioridade: `profile.primary_stack` (até 4 stacks reais).
   - 2ª Prioridade (Fallback): `profile.skills` (até 4 skills reais).
   - 3ª Prioridade (Fallback Elegante - REQ-06): **NÃO INVENTAR TECNOLOGIAS**. Texto profissional neutro sobre qualidade técnica e entregas de valor.

3. **Canais & Aberturas:**
   - Contato Direto (`job.directContact`): Cita oportunidade na empresa, contato direto e inclusão de dados de envio de currículo.
   - LinkedIn Posts (`job.platform === 'linkedin_posts'`): Referência explícita à publicação no LinkedIn.
   - Facebook Groups (`job.platform === 'facebook_groups'`): Referência explícita à postagem na comunidade.
   - ATS / Portais Padrão: Saudação formal ao time de recrutamento da empresa.

---

## 5. Critérios de Aceitação & Testes
1. O pitch gerado NUNCA contém stacks fictícias quando o usuário não as cadastrou.
2. Vagas de posts do LinkedIn ou Facebook geram saudações específicas de feed.
3. Vagas com e-mail direto incluem instrução de envio de currículo e citação ao e-mail.
4. O `JobModal` funciona tanto para candidatos logados com perfil preenchido quanto para visitantes anônimos.
5. Todos os 8 cenários do `test-phase69.ts` passam com sucesso.
6. `npm run build` compila com 0 erros de tipagem.
