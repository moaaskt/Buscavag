# Phase 13 Plan: Evolução do Modelo de IA para IoT & Automação Residencial

## Objective
Atualizar os prompts de avaliação com LLM do Hermes Agent (`src/services/hermesEvaluator.ts`), a heurística de fallback e o schema de dados (`src/types/job.ts`) para incluir explicitamente o reconhecimento, scoring e categorização de competências em **Internet das Coisas (IoT)**, **microcontroladores ESP32 / Arduino / Raspberry Pi** e **Automação Residencial (MQTT, Home Assistant, Zigbee, ESPHome, C/C++)**, sem descaracterizar a stack principal Full Stack Web.

## Context & Requirements
- **IA-01:** O sistema de IA deve ser treinado/parametrizado para reconhecer e avaliar habilidades e requisitos em Internet das Coisas (IoT).
- **IA-02:** O sistema de IA deve avaliar competências em microcontroladores, com destaque explícito para ESP32 e arquiteturas similares.
- **IA-03:** O perfil de matching deve ser estendido para Automação Residencial (projetos, protocolos MQTT, integrações com Home Assistant, sensores/atuadores).

## Implementation Steps

### 1. Atualização do Perfil e Prompts no `HermesEvaluator` (`src/services/hermesEvaluator.ts`)
- **Extensão do Perfil de Moacir:**
  - Adicionar no prompt: *Especialização complementar em IoT, Sistemas Embarcados e Automação Residencial (ESP32, ESP8266, Arduino, Raspberry Pi, MQTT, Home Assistant, ESPHome, C/C++ básico para microcontroladores, integração Web-Hardware/Sockets/REST APIs).*
- **Novas Categorias de Classificação:**
  - Expandir categorias para permitir: `"Frontend" | "Backend" | "Full Stack" | "DevOps" | "Data" | "Mobile" | "IoT & Automação" | "Other"`.
- **Evolução da Heurística (`evaluateHeuristic`):**
  - Incorporar keywords de IoT e Hardware no `targetStack`: `['esp32', 'esp8266', 'arduino', 'raspberry', 'iot', 'mqtt', 'home assistant', 'esphome', 'automacao', 'automação', 'embarcados', 'firmware', 'c++', 'c/c++']`.
  - Adicionar regra de detecção automática para categoria `"IoT & Automação"`.
  - Ajustar ponderação para que vagas híbridas Full Stack + IoT tenham bônus de stackScore.

### 2. Atualização dos Schemas e Repositório
- `src/types/job.ts`: Adicionar suporte a `"IoT & Automação"` nas categorias do `ProcessedJobSchema` (se houver enum ou tipagem estrita).
- Atualizar a formatação de alertas no `TelegramNotifier` caso uma vaga seja categorizada como `"IoT & Automação"`.

### 3. Criação de Testes de IA / Heurística (`src/test-phase13.ts`)
- Criar casos de teste com descrições reais/sintéticas de vagas de IoT/ESP32/Automação Residencial.
- Validar se o score, categorias e justificativas (reasoning) refletem a nova especialidade.

## Verification
- Executar `npx tsx src/test-phase13.ts` comprovando que vagas com termos de IoT/ESP32/Home Assistant recebem categoria `"IoT & Automação"` e alta pontuação de stack.
- Executar `npm run build` para garantir conformidade de tipos TypeScript.
