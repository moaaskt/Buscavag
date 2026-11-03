---
Phase 22 Plan: Sincronização de Scrapers em Tempo Real (Navbar)

Requirements: SCR-02, SCR-03

## Alterações

### src/components/SyncToast.tsx [NEW]
- Componente global de toast animado (framer-motion) para feedback de sincronização.
- Escuta o evento customizado `buscavag:sync-done` disparado pela Navbar.
- Exibe contador de vagas capturadas, ícone de sucesso/erro, auto-dismiss após 5s.

### src/components/Navbar.tsx [MODIFY]
- `handleSync`: chama `POST /api/scraper/trigger`, não mais `/api/stats`.
- Enquanto `isSyncing=true`: texto muda para "Executando Scraper...", botão desabilitado.
- Ao finalizar: dispara evento `buscavag:sync-done` com `{ success, newJobsCount }`.
- Dispara também `buscavag:refetch-jobs` para a página `/jobs` recarregar silenciosamente.

### src/app/layout.tsx [MODIFY]
- Montar `<SyncToast />` dentro do layout para garantir exibição global.

### src/app/jobs/page.tsx [MODIFY]
- `useEffect` adicional para escutar `buscavag:refetch-jobs` e chamar `fetchJobs()`.
