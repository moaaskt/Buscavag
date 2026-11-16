---
task: 20261116-deduplicate-jobs-fingerprint-hardening
description: Blindagem rigorosa de deduplicação de vagas (eliminação de duplicatas por fingerprint/fonte, normalização geográfica e sanitização do banco)
date: 2026-11-16
status: complete
---

# Quick Task: Blindagem Rigorosa de Deduplicação de Vagas

## Diagnóstico do Problema
1. **Divergência de Fingerprint entre `exists()` e `insert()`**:
   - `JobRepository.exists()` gerava o fingerprint a partir do `rawJob.location` (ex: `"Copiar linkBrasilia, DF"`).
   - `JobRepository.insert()` transformava o location usando `parseCanonicalLocation()` (ex: `"Distrito Federal"`) antes de gerar o fingerprint que era salvo no banco.
   - Como os hashes gerados eram diferentes, `exists()` retornava `false` para vagas repetidas da mesma fonte que tivessem URLs ligeiramente distintas (ex: IDs internos da vaga no portal Empregos: `11911063`, `11911033`, etc.).
2. **Falta de Validação In-Memory e In-Cycle no Pipeline de Coleta**:
   - Em `src/index.ts`, o lote de vagas coletadas (`rawJobs`) não passava por um `Set` de fingerprints em memória. Vagas repetidas vindas na mesma requisição concorrente eram todas enviadas para avaliação.
3. **Ausência de Trava em `JobRepository.insert()`**:
   - O comando SQL de inserção usava apenas `ON CONFLICT(id) DO NOTHING`. Não havia barreira impedindo a gravação de múltiplos registros com o mesmo `fingerprint`.
4. **Ruído de Extração de Localização (Scraper Empregos)**:
   - Botões como `<button>Copiar link</button>` eram aglutinados no texto da localização pelo Cheerio (`"Copiar linkBrasilia, DF"`).
5. **Acúmulo no Banco de Dados (`buscavag.db`)**:
   - Existem atualmente 72 registros duplicados (23 grupos de mesmo fingerprint, incluindo 5 ocorrências de Desenvolvedor Júnior na Digisystem e 16 ocorrências de Desenvolvedor Sênior).

## Plano de Execução
1. **Sanitização do Scraper Empregos ([`src/scrapers/empregos.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/scrapers/empregos.ts))**:
   - Remover elementos indesejados (`button`, `script`, tags com classe de ação) antes da extração de texto e limpar ruídos como `"Copiar link"` no parsing de localização.
2. **Harmonização do Fingerprint em [`src/utils/fingerprint.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/utils/fingerprint.ts)**:
   - Adicionar limpeza de ruídos conhecidos em `slugifyLocation` (`copiar link`, `compartilhar`, `ver vaga`).
3. **Blindagem em [`src/db/repository.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/db/repository.ts)**:
   - No método `exists()`, calcular o fingerprint com `parseCanonicalLocation` E verificar por ambos (canônico e raw), além de verificar por URL e ID.
   - No método `insert()`, verificar explicitamente antes da inserção se já existe vaga com o mesmo `fingerprint` ou `url`. Se existir, abortar inserção e retornar o registro existente.
4. **Deduplicação In-Memory em [`src/index.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/index.ts)**:
   - Adicionar `seenFingerprints` e `seenUrls` no início do ciclo para descartar imediatamente duplicatas do lote antes de chamar o avaliador e o banco.
5. **Higienização e Remoção de Duplicatas no Banco Ativo (`buscavag.db`)**:
   - Criar e rodar script de limpeza que percorre os grupos de duplicatas por fingerprint/título/empresa, preserva o registro mais completo ou interagido pelo usuário (status de candidatura), e remove as duplicatas excedentes.
6. **Verificação & Testes**:
   - Executar `npm test` garantindo 10/10 suítes verdes.
   - Validar que o número de duplicatas no banco cai para 0.
