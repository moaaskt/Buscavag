# Phase 75 Plan: Resiliência de Payload e Sanitização na API de Perfil

## Vision & Goal
Aumentar a tolerância a falhas e a resiliência da API de perfil do candidato (`/api/candidate/profile`), permitindo que formulários e clientes REST enviem strings vazias em campos opcionais (em particular `state: ""`, resolvendo o apontamento `I-06`) sem receber erro HTTP 400. Além disso, introduzir sanitização automática de espaços (`.trim()`) em todos os campos de texto do perfil para evitar persistência de dados sujos ou espaços redundantes no banco de dados.

---

## Requirements Addressed
- **`REQ-04`**: Atualizar `profileSchema` em `src/app/api/candidate/profile/route.ts` para que `state` aceite tanto as 27 UFs válidas quanto `null`, `undefined` e `""` (string vazia), convertendo strings vazias e com apenas espaços para `null` (resolução do apontamento `I-06`).
- **`REQ-05`**: Aplicar sanitização padronizada de espaços (`.trim()`) e conversão para `null` nos demais campos textuais opcionais (`target_role`, `seniority`, `expected_salary`, `bio`, `city`) para consistência total da base de dados.
- **`REQ-06`**: Criar suíte de testes automatizados `src/test-phase75.ts` validando payloads HTTP com `state: ""`, strings com espaços e persistência no banco.

---

## Proposed Changes

### Component 1: Validação de Perfil na API (`src/app/api/candidate/profile/route.ts`)

#### [MODIFY] [route.ts](file:///home/moa-dev/projetos/buscavag/src/app/api/candidate/profile/route.ts)
- Refatorar `profileSchema` com `z.preprocess()` / `.transform()`:
  ```typescript
  export const profileSchema = z.object({
    target_role: z.string().max(100).optional().nullable()
      .transform((v) => v?.trim() || null),
    seniority: z.string().max(50).optional().nullable()
      .transform((v) => v?.trim() || null),
    expected_salary: z.string().max(50).optional().nullable()
      .transform((v) => v?.trim() || null),
    preferred_work_models: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    bio: z.string().max(2000).optional().nullable()
      .transform((v) => v?.trim() || null),
    city: z.string().max(100).optional().nullable()
      .transform((v) => v?.trim() || null),
    state: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
      z.enum(VALID_UFS).optional().nullable()
    ),
  });
  ```
- Exportar `profileSchema` e `VALID_UFS` para permitir testes unitários diretos do schema e das rotas.

---

### Component 2: Suíte de Testes Automatizada (`src/test-phase75.ts`)

#### [NEW] [test-phase75.ts](file:///home/moa-dev/projetos/buscavag/src/test-phase75.ts)
- Suíte automatizada com cenários:
  1. **T01**: Payload com `state: ""` (string vazia) normaliza para `null` com sucesso (sem erro 400).
  2. **T02**: Payload com `state: "   "` (apenas espaços) normaliza para `null`.
  3. **T03**: Payload com `state: "SC"` aceita UF válida das 27 UFs brasileiras.
  4. **T04**: Payload com `state: "ZZ"` (UF inexistente) falha com erro de validação.
  5. **T05**: Payload com `city: "  Florianópolis  "` sanitiza para `"Florianópolis"`.
  6. **T06**: Payload com `target_role: "   "` sanitiza para `null`.
  7. **T07**: Payload com `expected_salary: " 5000 "` sanitiza para `"5000"`.
  8. **T08**: Payload com `bio: "  desenvolvedor fullstack  "` sanitiza para `"desenvolvedor fullstack"`.
  9. **T09**: Teste integrado de persistência no repositório (`upsertProfile`) com dados sanitizados.
  10. **T10**: Simulação de requisição PUT `/api/candidate/profile` com body contendo strings vazias.

---

## Verification Plan

### Automated Tests
1. Executar a nova suíte dedicada da Phase 75:
   ```bash
   npx tsx src/test-phase75.ts
   ```
2. Executar suítes anteriores para assegurar zero regressão:
   ```bash
   npx tsx src/test-phase74.ts
   npx tsx src/test-phase73.ts
   npx tsx src/test-phase72.ts
   npx tsx src/test-phase71.ts
   ```
3. Executar o test runner unificado do BuscaVag:
   ```bash
   npm test
   ```
4. Validar compilação e tipagem estrita TypeScript:
   ```bash
   npm run build:next
   ```

### Manual Verification
- Testar envio de perfil via interface `/candidate` limpando o select de estado para certificar que o estado é limpo sem erros.
