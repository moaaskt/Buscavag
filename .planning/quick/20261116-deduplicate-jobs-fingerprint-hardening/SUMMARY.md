---
status: complete
date: 2026-11-16
---
# Quick Task Summary: Blindagem Rigorosa de Deduplicação de Vagas

**Data:** 16 de Novembro de 2026  
**Status:** complete ✓  

## 1. Problemas Diagnosticados & Causas Raízes
1. **Divergência de Fingerprint entre Verificação e Inserção**:
   - `JobRepository.exists()` gerava o hash usando a localização bruta (`rawJob.location`, ex: `"Copiar linkBrasilia, DF"`).
   - `JobRepository.insert()` convertia a localização para o padrão canônico (`canonicalGeo.canonicalLocation`, ex: `"Distrito Federal"`) antes de gerar e persistir o fingerprint.
   - Como os hashes não batiam, vagas repetidas com URLs ligeiramente distintas (ex: diferentes IDs de vaga no portal Empregos.com.br: `11911063`, `11911033`, etc.) passavam pelo filtro e eram inseridas repetidamente.
2. **Ausência de Deduplicação em Memória no Ciclo de Coleta**:
   - O lote de vagas coletadas (`rawJobs`) não mantinha um `Set` de URLs e fingerprints vistos no ciclo corrente, permitindo que vagas repetidas dentro do mesmo lote avançassem concorrentemente para a IA e o banco de dados.
3. **Falta de Guarda contra Fingerprint Duplicado no Repositório**:
   - A instrução SQL de inserção tratava apenas conflitos de `id`. Vagas com `id` ou `url` diferentes mas fingerprint idêntico eram inseridas sem impedimento.
4. **Poluição Textual em Scrapers (Empregos.com.br)**:
   - Botões e tags de ação (`<button>Copiar link</button>`) estavam sendo capturados no texto da localização.
5. **Acúmulo de Vagas Duplicadas no Banco (`buscavag.db`)**:
   - Havia 72 registros em 23 grupos duplicados por fingerprint no banco de dados ativo (incluindo as 5 ocorrências de "Desenvolvedor de Software Júnior" na Digisystem mostradas na imagem do usuário).

---

## 2. Soluções Implementadas

1. **Sanitização de Localização em [`src/scrapers/empregos.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/scrapers/empregos.ts)**:
   - Removidos elementos de botão (`button`, `script`, `style`, `.btn`, `[class*="copy"]`, `[class*="share"]`) do card antes da extração de texto, expurgando o texto `"Copiar link"`.
2. **Resiliência Anti-Ruído em [`src/utils/fingerprint.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/utils/fingerprint.ts)**:
   - Adicionada limpeza preventiva de termos como `copiar link`, `compartilhar`, `ver vaga`, `detalhes` na função `slugifyLocation()`.
3. **Harmonização de Fingerprint em [`src/db/repository.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/db/repository.ts)**:
   - O método `JobRepository.exists()` agora calcula a localização canônica usando `parseCanonicalLocation()` exatamente igual ao `insert()`, e valida a existência tanto pelo fingerprint canônico quanto pelo bruto.
   - O método `JobRepository.insert()` verifica se já existe outro registro com o mesmo `fingerprint` (`AND id != ?`). Se existir, cancela a inserção e retorna a vaga já cadastrada.
4. **Deduplicação In-Memory em [`src/index.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/src/index.ts)**:
   - Implementados os conjuntos `cycleFingerprints` e `cycleUrls` para descartar instantaneamente qualquer duplicata que surja dentro do mesmo lote antes mesmo de gastar tempo/tokens de avaliação de IA.
5. **Higienização e Remoção no Banco Ativo (`buscavag.db`)**:
   - Executado o script [`scripts/deduplicate-database.ts`](file:///c:/Users/Windows%20Lite%20BR/Documents/GitHub/Buscavag/scripts/deduplicate-database.ts).
   - Removidas **49 vagas duplicadas**, zerando completamente as duplicatas por fingerprint no SQLite.
   - A vaga da Digisystem exibida na captura de tela agora tem **exatamente 1 único registro** mantido.

---

## 3. Validações Realizadas
1. **Verificação no Banco Ativo**:
   - Grupos duplicados por fingerprint: **0**.
   - Ocorrências de Desenvolvedor Júnior Digisystem: **1** (com localização limpa para "Brasília, DF").
2. **Suíte Unificada de Testes (`npm test`)**:
   - 10 de 10 suítes executadas com sucesso total (16.75s).
