# Requirements: Milestone 24.0

## Overview
Milestone 24.0 focado na personalização de notificações em tempo real no Telegram para o perfil exclusivo do usuário, ingestão periódica de oportunidades no feed/posts do LinkedIn via sessão autenticada, e modernização da navegação com Sidebar retrátil e espaçamentos otimizados.

## Requirements

### Telegram & Matching (TEL)
- [ ] **REQ-TEL-01**: O serviço de mensageria Telegram deve disparar notificações em tempo real filtradas estritamente com base no perfil do usuário `moacirneto59@gmail.com`.
- [ ] **REQ-TEL-02**: Vagas não-tech, fora da stack do perfil ou fora do nível Júnior devem ser bloqueadas no gateway de envio do Telegram, eliminando ruído.
- [ ] **REQ-TEL-03**: Assim que uma vaga elegível for minerada e inserida no banco, o motor de notificação deve avaliar o match e disparar imediatamente.

### LinkedIn Posts Scraper (LNK)
- [ ] **REQ-LNK-01**: O conector de posts do LinkedIn deve suportar autenticação por cookie de sessão (`LINKEDIN_SESSION_COOKIE` / `li_at`).
- [ ] **REQ-LNK-02**: Realizar busca ativa na barra de pesquisa por publicações contendo palavras-chave ("vagas", "oportunidades") em perfis e páginas empresariais.
- [ ] **REQ-LNK-03**: Orquestrar execução autônoma periódica do scraper a cada 3 horas.

### UI & Navegação Lateral (NAV)
- [ ] **REQ-NAV-01**: Converter a navegação superior (Navbar) em Sidebar lateral moderna com opção de recolher/ocultar (toggle colapsável).
- [ ] **REQ-NAV-02**: Preservar a identidade visual e o design system existente (estilo Velzon/Tailwind), ajustando a malha de espaçamento e ergonomia do layout global.
