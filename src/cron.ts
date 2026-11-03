import dotenv from 'dotenv';
import cron from 'node-cron';
import { runPipeline } from './index.js';
import { TelegramNotifier } from './services/telegramNotifier.js';

dotenv.config();

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 */3 * * *'; // A cada 3 horas por padrão
const notifier = new TelegramNotifier();

console.log(`\n🕐 [CRON] Buscavag Scheduler iniciado.`);
console.log(`🕐 [CRON] Agenda configurada: "${CRON_SCHEDULE}"`);
console.log(`🕐 [CRON] Próxima execução será disparada automaticamente.\n`);

// Executa imediatamente na inicialização
async function executeCycle() {
  const startTime = Date.now();
  console.log(`\n🔄 [CRON] Iniciando ciclo em ${new Date().toLocaleString('pt-BR')}...`);

  try {
    await runPipeline();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ [CRON] Ciclo concluído em ${elapsed}s. Aguardando próximo agendamento...\n`);
  } catch (err) {
    const errorMsg = (err as Error).message || String(err);
    console.error(`❌ [CRON] Erro crítico no ciclo:`, errorMsg);
    await notifier.sendAlert(`🚨 [ERRO CRÍTICO NO CRON] O pipeline falhou: ${errorMsg}`);
    console.log(`⚠️ [CRON] O scheduler continuará rodando. Próximo ciclo no horário agendado.\n`);
  }
}

// Disparar 1ª rodada imediatamente
executeCycle();

// Registrar cron para execuções futuras
cron.schedule(CRON_SCHEDULE, () => {
  executeCycle();
});

// Manter o processo vivo e tratar sinais de shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [CRON] Recebido SIGINT. Encerrando scheduler...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 [CRON] Recebido SIGTERM. Encerrando scheduler...');
  process.exit(0);
});
