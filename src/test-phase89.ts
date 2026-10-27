import fs from 'fs';
import path from 'path';
import {
  filterLogs,
  formatLogsAsTxt,
  formatLogsAsJson,
  addLogToBuffer,
  TerminalLogItem,
} from './components/admin/scrapers/ScraperLiveTerminal';
import { ScraperLogger, ScraperEvent } from './services/scraperLogger';

async function runPhase89Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 89 (TERMINAL DE LOGS SSE & FERRAMENTAS DE AUDITORIA) ---');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (!condition) {
      console.error(`❌ [TEST ${total}] FALHOU: ${testName}`);
      process.exit(1);
    }
    passed++;
    console.log(`✅ [TEST ${total}] PASSOU: ${testName}`);
  }

  const rootDir = process.cwd();

  // Test 1: Existência física do componente ScraperLiveTerminal
  const terminalComponentPath = path.join(rootDir, 'src/components/admin/scrapers/ScraperLiveTerminal.tsx');
  assert(fs.existsSync(terminalComponentPath), 'src/components/admin/scrapers/ScraperLiveTerminal.tsx deve existir');

  // Test 2: Existência e conformidade do endpoint SSE stream
  const streamRoutePath = path.join(rootDir, 'src/app/api/admin/scraper/stream/route.ts');
  assert(fs.existsSync(streamRoutePath), 'src/app/api/admin/scraper/stream/route.ts deve existir');
  const streamRouteContent = fs.readFileSync(streamRoutePath, 'utf-8');
  assert(
    streamRouteContent.includes('text/event-stream') &&
    streamRouteContent.includes('ScraperLogger.subscribe') &&
    streamRouteContent.includes('heartbeat'),
    'Endpoint /api/admin/scraper/stream deve configurar headers SSE, inscrição no ScraperLogger e mecanismo de heartbeat'
  );

  // Test 3: Integração do ScraperLiveTerminal na página de Scrapers
  const scrapersPagePath = path.join(rootDir, 'src/app/admin/scrapers/page.tsx');
  assert(fs.existsSync(scrapersPagePath), 'src/app/admin/scrapers/page.tsx deve existir');
  const scrapersPageContent = fs.readFileSync(scrapersPagePath, 'utf-8');
  assert(
    scrapersPageContent.includes('ScraperLiveTerminal') &&
    scrapersPageContent.includes('<ScraperLiveTerminal'),
    'src/app/admin/scrapers/page.tsx deve importar e renderizar o componente ScraperLiveTerminal'
  );

  // Mock data para validação determinística de regras
  const mockLogs: TerminalLogItem[] = [
    {
      id: 'log-1',
      runId: 'run-alpha',
      scraperName: 'Gupy',
      level: 'INFO',
      message: 'Iniciando scraping da plataforma Gupy...',
      timestamp: '2026-10-01T12:00:00.000Z',
      step: 'START',
    },
    {
      id: 'log-2',
      runId: 'run-alpha',
      scraperName: 'Gupy',
      level: 'WARN',
      message: 'Rate limit próximo ou lentidão na resposta HTTP.',
      details: 'HTTP 429 retried in 2000ms',
      timestamp: '2026-10-01T12:00:05.000Z',
      step: 'PROGRESS',
    },
    {
      id: 'log-3',
      runId: 'run-beta',
      scraperName: 'LinkedIn',
      level: 'ERROR',
      message: 'Falha de autenticação ao carregar feed stealth.',
      details: 'Error: Session cookie expired',
      timestamp: '2026-10-01T12:01:00.000Z',
      step: 'ERROR',
    },
    {
      id: 'log-4',
      runId: 'run-alpha',
      scraperName: 'Gupy',
      level: 'INFO',
      message: 'Scraping finalizado com sucesso. 42 vagas encontradas.',
      timestamp: '2026-10-01T12:01:30.000Z',
      step: 'FINISH',
    },
  ];

  // Test 4: Filtragem de logs por nível ALL
  const allFiltered = filterLogs(mockLogs, { level: 'ALL', searchTerm: '' });
  assert(allFiltered.length === 4, 'filterLogs com nível ALL deve retornar todos os 4 logs');

  // Test 5: Filtragem de logs por nível específico (INFO, WARN, ERROR)
  const infoLogs = filterLogs(mockLogs, { level: 'INFO', searchTerm: '' });
  const warnLogs = filterLogs(mockLogs, { level: 'WARN', searchTerm: '' });
  const errorLogs = filterLogs(mockLogs, { level: 'ERROR', searchTerm: '' });
  assert(infoLogs.length === 2, 'filterLogs com nível INFO deve retornar exatamente 2 itens');
  assert(warnLogs.length === 1 && warnLogs[0].id === 'log-2', 'filterLogs com nível WARN deve retornar log-2');
  assert(errorLogs.length === 1 && errorLogs[0].id === 'log-3', 'filterLogs com nível ERROR deve retornar log-3');

  // Test 6: Busca textual por mensagem
  const searchVagas = filterLogs(mockLogs, { level: 'ALL', searchTerm: 'vagas' });
  assert(searchVagas.length === 1 && searchVagas[0].id === 'log-4', 'Busca por "vagas" deve filtrar apenas o log de finalização');

  // Test 7: Busca textual por conector/scraperName
  const searchLinkedIn = filterLogs(mockLogs, { level: 'ALL', searchTerm: 'linkedin' });
  assert(searchLinkedIn.length === 1 && searchLinkedIn[0].scraperName === 'LinkedIn', 'Busca por "linkedin" (case-insensitive) deve retornar conector correspondente');

  // Test 8: Busca textual por detalhes (details)
  const searchCookie = filterLogs(mockLogs, { level: 'ALL', searchTerm: 'cookie expired' });
  assert(searchCookie.length === 1 && searchCookie[0].id === 'log-3', 'Busca textual deve inspecionar campo details');

  // Test 9: Busca combinada (nível + termo)
  const combinedFilter = filterLogs(mockLogs, { level: 'INFO', searchTerm: 'gupy' });
  assert(combinedFilter.length === 2, 'Filtro combinado (INFO + "gupy") deve retornar os 2 logs esperados');

  const combinedNoMatch = filterLogs(mockLogs, { level: 'ERROR', searchTerm: 'gupy' });
  assert(combinedNoMatch.length === 0, 'Filtro combinado sem correspondência deve retornar array vazio');

  // Test 10: Limite de buffer rotativo anti-leak (addLogToBuffer)
  let buffer: TerminalLogItem[] = [];
  const MAX_LIMIT = 5;
  for (let i = 1; i <= 8; i++) {
    const logItem: TerminalLogItem = {
      id: `rot-${i}`,
      runId: 'rot-run',
      scraperName: 'RotTest',
      level: 'INFO',
      message: `Mensagem ${i}`,
      timestamp: new Date().toISOString(),
    };
    buffer = addLogToBuffer(buffer, logItem, MAX_LIMIT);
  }
  assert(buffer.length === MAX_LIMIT, `addLogToBuffer deve limitar estritamente o tamanho a ${MAX_LIMIT} itens`);
  assert(buffer[0].id === 'rot-4', 'addLogToBuffer deve descartar os itens mais antigos (FIFO, primeiro item deve ser rot-4)');
  assert(buffer[buffer.length - 1].id === 'rot-8', 'O último item do buffer deve ser o mais recente (rot-8)');

  // Test 11: Exportação em formato TXT (formatLogsAsTxt)
  const txtOutput = formatLogsAsTxt(mockLogs);
  assert(
    txtOutput.includes('2026-10-01T12:00:00.000Z') &&
    txtOutput.includes('[Gupy]') &&
    txtOutput.includes('INFO') &&
    txtOutput.includes('Details: HTTP 429 retried in 2000ms'),
    'formatLogsAsTxt deve produzir texto legível formatado com data ISO, conector, nível e details'
  );

  // Test 12: Exportação em formato JSON (formatLogsAsJson)
  const jsonOutput = formatLogsAsJson(mockLogs);
  let parsedJson: any = null;
  try {
    parsedJson = JSON.parse(jsonOutput);
  } catch (e) {
    parsedJson = null;
  }
  assert(Array.isArray(parsedJson) && parsedJson.length === 4, 'formatLogsAsJson deve gerar um JSON válido com os 4 logs');

  // Test 13: Emissão e escuta em tempo real via ScraperLogger.subscribe
  let capturedEvent: ScraperEvent | null = null;
  const unsubscribe = ScraperLogger.subscribe((event) => {
    if (event.scraperName === 'Phase89RealtimeTest') {
      capturedEvent = event;
    }
  });

  const testLogger = new ScraperLogger('Phase89RealtimeTest', 'test-run-89');
  testLogger.info('Evento ao vivo disparado para o stream SSE.');

  assert(capturedEvent !== null, 'ScraperLogger.subscribe deve receber eventos em tempo real do ScraperLogger');
  assert(
    (capturedEvent as any)?.message === 'Evento ao vivo disparado para o stream SSE.',
    'Mensagem do evento capturado via listener deve ser idêntica ao emitido'
  );
  unsubscribe();

  // Test 14: Verificação de elementos da UI no código do ScraperLiveTerminal
  const terminalCode = fs.readFileSync(terminalComponentPath, 'utf-8');
  assert(
    terminalCode.includes('data-testid="scraper-live-terminal"') &&
    terminalCode.includes('Auto-Scroll') &&
    terminalCode.includes('handleExportTxt') &&
    terminalCode.includes('handleExportJson') &&
    terminalCode.includes('handleClear'),
    'Componente ScraperLiveTerminal deve conter controles de auto-scroll, exportação TXT/JSON e limpeza'
  );

  console.log('\n======================================================');
  console.log('  RESULTADO DA SUÍTE DA PHASE 89:');
  console.log(`  Total de testes executados: ${total}`);
  console.log(`  Testes aprovados: ${passed}`);
  console.log(`  Testes reprovados: ${total - passed}`);
  console.log('  Status: 100% CONCLUÍDO E APROVADO ✓');
  console.log('======================================================\n');
}

runPhase89Tests().catch((err) => {
  console.error('Erro fatal na execução da suíte da Phase 89:', err);
  process.exit(1);
});
