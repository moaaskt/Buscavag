# Phase 4 Research: AI Evaluation & Prompting

## Hermes Agent / LLM Integration
- Utilizar cliente OpenAI / fetch para se conectar à API do Hermes Agent ou compatíveis (ex: DeepSeek, OpenAI, Groq, Ollama).
- Configuração via `OPENAI_API_KEY`, `OPENAI_BASE_URL` ou `HERMES_API_URL`.

## Evaluation Prompt Guidelines
- Rejeitar estritamente vagas que mencionem "Pleno", "Senior", "Sr", "Lead", "Architect" ou exigências de +3-5 anos de experiência.
- Aprovar vagas que buscam "Junior", "Jr", "Estágio de transição", "Entry-level", ou que não especifiquem nível mas peçam requisitos básicos de Full Stack (HTML, CSS, JS/TS, React/Vue, Node/Python).
