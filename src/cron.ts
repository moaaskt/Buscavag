import dotenv from 'dotenv';
import cron from 'node-cron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { runPipeline } from './index.js';
import { TelegramNotifier } from './services/telegramNotifier.js';
import { PythonBridgeClient } from './services/pythonBridge.js';

dotenv.config();

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 */3 * * *'; // A cada 3 horas por padrão
const notifier = new TelegramNotifier();
const pythonBridge = new PythonBridgeClient();

let pythonProcess: ChildProcess | null = null;

/**
 * Garante que o microserviço Python Scrapling Engine esteja rodando em background.
 * Se já estiver online (porta 8001), reutiliza; se não, inicializa automaticamente.
 */
async function ensurePythonBridge(): Promise<void> {
  const isUp = await pythonBridge.isAvailable();
  if (isUp) {
    console.log('🐍 [Python Bridge] Microserviço Scrapling Engine já está ativo na porta 8001.');
    return;
  }

  console.log('🐍 [Python Bridge] Iniciando microserviço Scrapling Engine automaticamente...');
  const venvPythonWin = path.resolve(process.cwd(), '.venv', 'Scripts', 'python.exe');
  const pythonBin = fs.existsSync(venvPythonWin) ? venvPythonWin : 'python';

  try {
    pythonProcess = spawn(
      pythonBin,
      ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'src/services/scrapling-engine', '--port', '8001', '--host', '127.0.0.1'],
      {
        cwd: process.cwd(),
        stdio: 'ignore', detached: false,
      }
    );

    // Aguarda até 8 segundos para o microserviço responder no health check
    for (let i = 0; i < 8; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (await pythonBridge.isAvailable()) {
        console.log('🐍 [Python Bridge] Conectado e saudável na porta 8001!');
        return;
      }
    }
    console.warn('⚠️ [Python Bridge] O processo iniciou, mas não respondeu ao health check a tempo. Os scrapers TS rodarão normalmente.');
  } catch (err) {
    console.warn('⚠️ [Python Bridge] Não foi possível iniciar o bridge Python automaticamente:', (err as Error).message);
  }
}

console.log(`\n======================================================`);
console.log(`  BUSCAVAG AUTONOMOUS SCHEDULER & REALTIME DISPATCH`);
console.log(`  Agenda: "${CRON_SCHEDULE}" (A cada 3 horas)`);
console.log(`  Telegram: Ativo para @moa_hermes_agent_bot`);
console.log(`======================================================\n`);

async function executeCycle() {
  const startTime = Date.now();
  console.log(`\n🔄 [CRON] Iniciando ciclo completo em ${new Date().toLocaleString('pt-BR')}...`);

  try {
    // 1. Assegura que o motor Python está de pé
    await ensurePythonBridge();

    // 2. Roda a pipeline completa de 34 fontes, filtro de 48h e envio ao Telegram
    await runPipeline();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ [CRON] Ciclo concluído com sucesso em ${elapsed}s!`);
    console.log(`🕐 Aguardando próximo agendamento...\n`);
  } catch (err) {
    const errorMsg = (err as Error).message || String(err);
    console.error(`❌ [CRON] Erro crítico no ciclo:`, errorMsg);
    await notifier.sendAlert(`🚨 [ERRO CRÍTICO NO CRON] O pipeline falhou: ${errorMsg}`);
    console.log(`⚠️ [CRON] O scheduler continuará rodando. Próximo ciclo no horário agendado.\n`);
  }
}

// Disparar 1ª rodada imediatamente
executeCycle();

// Registrar cron para execuções futuras a cada 3h
cron.schedule(CRON_SCHEDULE, () => {
  executeCycle();
});

// Tratamento para fechar processos limpos
function gracefulShutdown(signal: string) {
  console.log(`\n🛑 [CRON] Recebido ${signal}. Finalizando scheduler e sub-processos...`);
  if (pythonProcess && !pythonProcess.killed) {
    try {
      pythonProcess.kill();
    } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
