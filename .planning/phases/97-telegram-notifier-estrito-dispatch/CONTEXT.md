# Phase 97: Telegram Notifier Estrito & Dispatch em Tempo Real (`moacirneto59@gmail.com`)

## Contexto & Visão Geral
Atualmente, o pipeline de ingestão e o despachante do Telegram enviam notificações para vagas usando apenas um filtro básico de TI (`isTechJob`). Isso tem provocado ruído no Telegram do usuário, com vagas que não têm relação com desenvolvimento web ou que exigem senioridades incompatíveis.
O objetivo desta fase é restringir o canal oficial do Telegram para avaliar exclusivamente o perfil do usuário `moacirneto59@gmail.com`:
- Stacks do perfil: TypeScript, React, Node.js, Next.js, PostgreSQL, Docker, Laravel, PHP, NestJS, REST APIs.
- Nível de senioridade estrito: Júnior (ou Estágio/Assistente afim; bloqueando Pleno, Sênior, Especialista, Tech Lead).
- Disparo em tempo real: Avaliar imediatamente ao minerar novas vagas ou na fila de pendentes, formatando a mensagem com score de compatibilidade, stacks combinadas e link direto.

## Requisitos Cobertos
- **REQ-TEL-01**: O serviço de mensageria Telegram deve disparar notificações em tempo real filtradas estritamente com base no perfil do usuário `moacirneto59@gmail.com`.
- **REQ-TEL-02**: Vagas não-tech, fora da stack do perfil ou fora do nível Júnior devem ser bloqueadas no gateway de envio do Telegram, eliminando ruído.
- **REQ-TEL-03**: Assim que uma vaga elegível for minerada e inserida no banco, o motor de notificação deve avaliar o match e disparar imediatamente.

## Critérios de Sucesso
1. Trava estrita de notificação:
   - Toda vaga antes do envio no Telegram passa pelo `CandidateMatcher.calculateMatch` comparado contra o perfil carregado de `moacirneto59@gmail.com`.
   - Vagas com incompatibilidade de senioridade (`isHardBlockedSeniority` ou nível Sênior/Pleno) ou score de stack insuficiente (< 60) são automaticamente marcadas como ignoradas/notificadas para não reprocessar, mas NÃO são enviadas ao chat.
2. Formatação da Notificação:
   - Título da vaga, Empresa, Local/Modalidade, Score de Match do perfil, Stacks compatíveis e Link de candidatura.
3. Teste pontual com vaga real/mock comprovando o bloqueio de vagas não compatíveis e o envio de vaga Júnior Full Stack compatível.

