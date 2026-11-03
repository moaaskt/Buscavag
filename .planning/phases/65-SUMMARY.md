# Phase 65: Motor de Match Estrito & Trava de Senioridade (Hard Constraints)

**Data de Conclusão:** 21/09/2026  
**Status:** Concluído com 100% de sucesso

## Objetivos Alcançados
- **Hard Constraints de Senioridade**: Implementada matriz granular de distâncias de senioridade entre o perfil do candidato e a vaga anunciada. Candidato Júnior ou Estágio contra vaga Sênior, Tech Lead ou Especialista recebe penalização eliminatória imediata, cravando o teto do score em 35% (`hardBlocked: true`, `isStrongMatch: false`).
- **Normalizador de Salário**: Desenvolvido parser regex (`parseSalary`) capaz de converter faixas textuais (ex: `"R$ 8k - 12k"`, `"8.5k"`, `"R$ 3.500,00 a R$ 5.000,00"`) para valores numéricos para cálculo de compatibilidade de pretensão.
- **Isolamento de Stacks**: Vagas com penalização eliminatória têm a pontuação de stack isolada sem influenciar a decisão de aprovação.
- **Harmonização do HermesEvaluator**: Heurística de ingestão do `HermesEvaluator` sincronizada com o mesmo teto de 35% para posições Sênior ou trabalho presencial fora da região metropolitana de Florianópolis.

## Arquivos Alterados
- `src/services/candidateMatcher.ts`
- `src/services/hermesEvaluator.ts`
- `src/test-phase65.ts`
