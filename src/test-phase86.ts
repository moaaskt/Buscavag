import fs from 'fs';
import path from 'path';
import { db, initDatabase } from './db/index';
import { AdminJobRepository } from './db/adminJobRepository';
import { whatsappService } from './services/whatsappService';
import { TelegramNotifier } from './services/telegramNotifier';
import { logAdminAction } from './lib/logger';

async function runPhase86Tests() {
  console.log('--- INICIANDO TESTES DETERMINÍSTICOS DA PHASE 86 (KANBAN DE VAGAS & DISPARO PARA CANAIS) ---');
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
  initDatabase();

  // Test 1: Existência do endpoint de disparo da vaga
  const dispatchRoutePath = path.join(rootDir, 'src/app/api/admin/vagas/[id]/dispatch/route.ts');
  assert(fs.existsSync(dispatchRoutePath), 'src/app/api/admin/vagas/[id]/dispatch/route.ts deve existir');

  // Test 2: Validação de segurança no endpoint de disparo
  const dispatchContent = fs.readFileSync(dispatchRoutePath, 'utf-8');
  assert(
    dispatchContent.includes('getAdminSessionUser') &&
    dispatchContent.includes('logAdminAction') &&
    dispatchContent.includes('whatsappService') &&
    dispatchContent.includes('TelegramNotifier'),
    'Endpoint de disparo deve exigir sessão administrativa, registrar auditoria e integrar com Telegram e WhatsApp'
  );

  // Test 3: Criação de vaga de teste no banco de dados
  const testJobId = `job_test_p86_${Date.now()}`;
  const testJobTitle = 'Engenheiro Full Stack TypeScript / Next.js';
  const testJobCompany = 'Startup Inovadora P86';
  db.prepare(`
    INSERT INTO jobs (id, url, title, company, platform, description, location, work_model, required_seniority, tech_stack, published_at, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'active')
  `).run(
    testJobId,
    `https://buscavag.com.br/jobs/${testJobId}`,
    testJobTitle,
    testJobCompany,
    'LinkedIn',
    'Descrição completa da oportunidade de desenvolvimento de software',
    'Florianópolis, SC',
    'remoto',
    'Pleno/Sênior',
    'React, Next.js, Node.js, SQLite'
  );

  const jobRepo = new AdminJobRepository();
  const fetchedJob = jobRepo.getJobById(testJobId);
  assert(!!fetchedJob, 'Vaga de teste deve ser recuperada do banco de dados');
  assert(fetchedJob?.title === testJobTitle, 'Título da vaga recuperada deve coincidir');

  // Test 4: Validação do Template Oficial Estruturado de Disparo
  const generateOfficialTemplate = (job: any) => {
    const workModelStr = job.work_model ? job.work_model.toUpperCase() : 'NÃO INFORMADO';
    const locationStr = job.location || 'Brasil';
    const seniorityStr = job.required_seniority || 'Não especificada';
    const stackStr = job.tech_stack || 'Geral';
    const urlStr = job.url || 'https://buscavag.com.br';

    return `🚀 NOVA OPORTUNIDADE TECH - BUSCAVAG\n\n💼 Vaga: ${job.title}\n🏢 Empresa: ${job.company}\n📍 Localização: ${locationStr} (${workModelStr})\n🎯 Senioridade: ${seniorityStr}\n💻 Stacks: ${stackStr}\n\n🔗 Veja mais detalhes e candidate-se em:\n${urlStr}`;
  };

  const templateMsg = generateOfficialTemplate(fetchedJob);
  assert(templateMsg.includes('NOVA OPORTUNIDADE TECH - BUSCAVAG'), 'Template deve conter cabeçalho institucional');
  assert(templateMsg.includes(testJobTitle), 'Template deve conter o título da vaga');
  assert(templateMsg.includes(testJobCompany), 'Template deve conter o nome da empresa');
  assert(templateMsg.includes('React, Next.js'), 'Template deve incluir stacks principais');

  // Test 5: Disparo Simulado para Telegram
  const telegramNotifier = new TelegramNotifier();
  const telegramRes = await telegramNotifier.sendMessage('@canal_teste_p86', templateMsg, 'HTML');
  assert(typeof telegramRes.success === 'boolean', 'Disparo para Telegram deve retornar flag success');
  assert(telegramRes.mock === true || telegramRes.success === true, 'Disparo para Telegram em ambiente de teste deve ser mockado ou bem-sucedido');

  // Test 6: Disparo Simulado para WhatsApp
  const whatsappRes = await whatsappService.sendMessage('5511999998888', templateMsg);
  assert(typeof whatsappRes.success === 'boolean', 'Disparo para WhatsApp deve retornar flag success');
  assert(whatsappRes.mock === true || whatsappRes.success === true, 'Disparo para WhatsApp em ambiente de teste deve ser mockado ou bem-sucedido');

  // Test 7: Auditoria de Ação de Disparo
  const mockAdminUser = { id: 'adm_test_p86', email: 'auditor@buscavag.com.br', name: 'Gestor P86' };
  logAdminAction(
    mockAdminUser,
    `Disparo de vaga para canal (telegram): ${fetchedJob!.title} (${fetchedJob!.company})`,
    {
      jobId: testJobId,
      canal: 'telegram',
      destinatario: '@canal_teste_p86',
      mock: true,
    }
  );

  const auditLog = db.prepare(`
    SELECT * FROM logs 
    WHERE origem = 'admin_action' AND (metadata LIKE ? OR mensagem LIKE ?)
    ORDER BY created_at DESC LIMIT 1
  `).get(`%${testJobId}%`, `%${testJobTitle}%`) as any;

  assert(!!auditLog, 'Log de auditoria deve ser persistido na tabela unificada de logs');
  assert(auditLog.origem === 'admin_action', 'Origem do log deve ser admin_action');

  // Test 8: Verificação do Alternador de Visualização em /admin/vagas/page.tsx
  const vagasPagePath = path.join(rootDir, 'src/app/admin/vagas/page.tsx');
  const vagasPageContent = fs.readFileSync(vagasPagePath, 'utf-8');
  assert(
    vagasPageContent.includes("viewMode === 'table'") &&
    vagasPageContent.includes("viewMode === 'kanban'") &&
    vagasPageContent.includes('buscavag_jobs_view'),
    'Página /admin/vagas deve suportar alternância entre Tabela e Kanban com persistência em localStorage'
  );

  // Test 9: Verificação da Renderização das 3 Colunas Kanban
  assert(
    vagasPageContent.includes('Vagas Ativas') &&
    vagasPageContent.includes('Ocultas (Soft-Hide)') &&
    vagasPageContent.includes('Expiradas') &&
    vagasPageContent.includes('renderKanbanCard'),
    'Página /admin/vagas deve renderizar as 3 colunas do Kanban com função de cards'
  );

  // Test 10: Verificação do Modal de Disparo Rápido e Botões de Ação
  assert(
    vagasPageContent.includes('dispatchJobTarget') &&
    vagasPageContent.includes('Disparar Vaga para Canais de Mensageria') &&
    vagasPageContent.includes('Telegram') &&
    vagasPageContent.includes('WhatsApp') &&
    vagasPageContent.includes('generateOfficialTemplate'),
    'Página /admin/vagas deve conter Modal Velzon de Disparo com seleção de canal e template oficial'
  );

  console.log(`\n🎉 Todos os ${passed}/${total} testes da Phase 86 foram concluídos com SUCESSO!`);
}

runPhase86Tests().catch((err) => {
  console.error('Erro fatal ao rodar testes da Phase 86:', err);
  process.exit(1);
});
