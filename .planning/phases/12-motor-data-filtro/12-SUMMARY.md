# Phase 12 Summary: Motor Unificado de Extração de Data e Filtro Rígido

## 🎯 Resumo da Entrega
Implementamos o motor universal de normalização e extração de datas em `src/utils/date.ts`, garantindo que todas as 20 fontes de vagas passem pelo mesmo crivo rígido de 5 dias corridos (Requisitos FLT-01 e FLT-02).

## 📦 Itens Entregues
1. **Motor de Parsing Avançado (`src/utils/date.ts`):**
   - Normalização de acentos e diacríticos.
   - Suporte a termos relativos em PT e EN (*"hoje"*, *"ontem"*, *"anteontem"*, *"há X dias"*, *"Xd atrás"*, *"X weeks ago"*, *"há X meses"*).
   - Suporte a datas de calendário brasileiras e ISO (*"DD/MM/YYYY"*, *"DD de Mês de YYYY"*, *"ISO 8601"*).
   - Função `isOlderThanDays(date, 5)` com precisão de milissegundos e tolerância a pequenos desvios de fuso horário.

2. **Bateria de Testes (`src/test-phase12.ts`):**
   - 16 cenários unitários cobrindo todos os dialetos de data e validação de limiar.
   - 100% dos testes aprovados.

3. **Validação do Sistema:**
   - Compilação TypeScript validada com 0 erros.
