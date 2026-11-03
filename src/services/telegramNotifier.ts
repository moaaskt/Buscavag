import { Bot } from 'grammy';
import { ProcessedJob } from '../types/job.js';
import { db } from '../db/index.js';
import { CandidateMatcher, CandidateContext, CandidateMatchResult } from './candidateMatcher.js';
import crypto from 'crypto';

export class TelegramNotifier {
  private bot: Bot | null = null;
  private chatId: string | null = null;
  private candidateMatcher: CandidateMatcher;
  private targetUserEmail: string = 'moacirneto59@gmail.com';
  private targetCandidateContext: CandidateContext | null = null;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID || null;
    this.candidateMatcher = new CandidateMatcher();

    if (token) {
      this.bot = new Bot(token);
    }
  }

  public getStatus() {
    return {
      isConfigured: !!(this.bot && this.chatId),
      chatId: this.chatId ? this.maskChatId(this.chatId) : undefined,
      hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
      mode: (!this.bot || !this.chatId) ? 'mock' : 'live',
      targetEmail: this.targetUserEmail,
    };
  }

  /**
   * Obtém o perfil do candidato alvo no banco de dados (moacirneto59@gmail.com).
   * Mantém em cache na instância ou carrega os dados com fallback seguro.
   */
  public getTargetCandidateContext(): CandidateContext {
    if (this.targetCandidateContext) {
      return this.targetCandidateContext;
    }

    try {
      const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(this.targetUserEmail) as
        | { id: string; email: string; name: string }
        | undefined;

      if (user) {
        const profile = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(user.id) as
          | {
              user_id: string;
              target_role?: string;
              seniority?: string;
              expected_salary?: string;
              preferred_work_models?: string;
              skills?: string;
              bio?: string;
              city?: string;
              state?: string;
            }
          | undefined;

        if (profile) {
          let skills: string[] = ['TypeScript', 'React', 'Node.js', 'Next.js', 'PostgreSQL', 'Docker', 'Laravel', 'PHP', 'NestJS', 'REST APIs'];
          try {
            if (profile.skills) skills = JSON.parse(profile.skills);
          } catch {}

          let preferredWorkModels: string[] = ['híbrido', 'remoto'];
          try {
            if (profile.preferred_work_models) preferredWorkModels = JSON.parse(profile.preferred_work_models);
          } catch {}

          this.targetCandidateContext = {
            userId: user.id,
            targetRole: profile.target_role || 'Desenvolvedor Full Stack',
            seniority: profile.seniority || 'Júnior',
            expectedSalary: profile.expected_salary || '5000',
            preferredWorkModels,
            skills,
            bio: profile.bio || null,
            city: profile.city || null,
            state: profile.state || 'SC',
          };

          return this.targetCandidateContext;
        }
      }
    } catch (err) {
      console.warn('[TelegramNotifier] Não foi possível carregar o perfil do DB, usando fallback padrão:', (err as Error).message);
    }

    // Fallback com as credenciais oficiais da conta moacirneto59@gmail.com
    this.targetCandidateContext = {
      userId: 'usr_b91f6327df90e6a8',
      targetRole: 'Desenvolvedor Full Stack',
      seniority: 'Júnior',
      expectedSalary: '5000',
      preferredWorkModels: ['híbrido', 'remoto'],
      skills: ['TypeScript', 'React', 'Node.js', 'Next.js', 'PostgreSQL', 'Docker', 'Laravel', 'REST APIs', 'PHP', 'NestJS'],
      bio: 'Profissional com competências em desenvolvimento Full Stack moderno e tecnologias web ágeis.',
      city: null,
      state: 'SC',
    };

    return this.targetCandidateContext;
  }

  /**
   * Avalia a vaga para o perfil de moacirneto59@gmail.com.
   * Retorna objeto com aprovação (true/false) e o resultado da correspondência.
   */
  public evaluateJobEligibility(job: ProcessedJob | any): { eligible: boolean; reason: string; matchResult: CandidateMatchResult } {
    const candidate = this.getTargetCandidateContext();
    const match = this.candidateMatcher.calculateMatch(job, candidate);

    // 0. Bloqueio definitivo de plataformas descartadas/pagas (ex: beBee)
    const platformLower = (job.platform || '').toLowerCase();
    const companyLower = (job.company || '').toLowerCase();
    const urlLower = (job.url || '').toLowerCase();
    if (platformLower.includes('bebee') || companyLower.includes('bebee') || urlLower.includes('bebee.com')) {
      return {
        eligible: false,
        reason: 'Fonte desativada/paga (beBee)',
        matchResult: match,
      };
    }

    // 1. Trava estrita de Senioridade
    const titleLower = (job.title || '').toLowerCase();
    const seniorityLower = (job.requiredSeniority || job.required_seniority || '').toLowerCase();

    const isSeniorOrLead =
      titleLower.includes('senior') ||
      titleLower.includes('sênior') ||
      titleLower.includes('sr.') ||
      titleLower.includes('lead') ||
      titleLower.includes('especialista') ||
      titleLower.includes('principal') ||
      /\b(iii|iv|v)\b/i.test(titleLower) ||
      seniorityLower.includes('senior') ||
      seniorityLower.includes('sênior');

    const isPleno =
      titleLower.includes('pleno') ||
      titleLower.includes('mid') ||
      titleLower.includes('pl.') ||
      seniorityLower.includes('pleno');

    if (match.isHardBlocked || isSeniorOrLead || isPleno) {
      return {
        eligible: false,
        reason: match.blockReason || 'Vaga incompatível com nível Júnior (Pleno/Sênior/Lead bloqueado)',
        matchResult: match,
      };
    }

    // 2. Trava estrita de Stack e Tech
    // Exige aderência de stack (>= 60) e score geral mínimo (>= 60)
    if (match.stackScore < 60) {
      return {
        eligible: false,
        reason: `Aderência de stack insuficiente (${match.stackScore}% < 60%) para o perfil`,
        matchResult: match,
      };
    }

    if (match.overallScore < 60) {
      return {
        eligible: false,
        reason: `Score geral insuficiente (${match.overallScore}% < 60%)`,
        matchResult: match,
      };
    }

    return {
      eligible: true,
      reason: 'Aprovada: Match Júnior com boa aderência de stack',
      matchResult: match,
    };
  }

  public formatJobMessage(job: ProcessedJob, match?: CandidateMatchResult): string {
    const categoryBadge = job.category ? `🏷️ <b>Categoria:</b> ${this.escapeHtml(job.category)}\n` : '';
    
    let matchSection = '';
    if (match) {
      matchSection = `🎯 <b>Match Perfil:</b> <b>${match.overallScore}%</b>\n` +
                     `📊 <i>Stack: ${match.stackScore}% | Nível: ${match.seniorityScore}%</i>\n`;

      if (match.matchedSkills && match.matchedSkills.length > 0) {
        matchSection += `🛠️ <b>Stacks Compatíveis:</b> <code>${this.escapeHtml(match.matchedSkills.join(', '))}</code>\n`;
      }
    } else {
      const scoreVal = job.overallScore ?? job.scoreIa;
      if (scoreVal !== undefined) {
        matchSection = `⭐ <b>Score:</b> ${scoreVal}/100\n`;
      }
    }

    const loc = job.location || (job as any).city ? `${(job as any).city || ''} ${(job as any).state || ''}`.trim() : 'Não especificado';
    const pubDate = job.publishedAt instanceof Date ? job.publishedAt.toLocaleDateString('pt-BR') : String(job.publishedAt || '');

    return `🚨 <b>NOVA VAGA ENCONTRADA (MATCH JÚNIOR)!</b>\n\n` +
           `📌 <b>Título:</b> ${this.escapeHtml(job.title)}\n` +
           `🏢 <b>Empresa:</b> ${this.escapeHtml(job.company)}\n` +
           `🌐 <b>Plataforma:</b> ${(job.platform || 'WEB').toUpperCase()}\n` +
           `📍 <b>Local:</b> ${this.escapeHtml(loc || 'Não especificado')}\n` +
           `📅 <b>Publicado em:</b> ${pubDate}\n` +
           `${categoryBadge}` +
           `${matchSection}\n` +
           `🔗 <a href="${job.url}">Clique aqui para ver a vaga</a>`;
  }

  public async sendMessage(chatId: string, text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<{ success: boolean; messageId?: string; mock?: boolean; error?: string }> {
    const targetChat = chatId || this.chatId;
    if (!targetChat) {
      return { success: false, error: 'Chat ID não configurado para envio Telegram.' };
    }

    if (!this.bot || !this.chatId) {
      console.log(`\n[TelegramNotifier MOCK MODE] Mensagem para ${targetChat}:\n${text}\n`);
      const mockId = `mock-tg-${Date.now()}`;
      this.recordDeliveryLog({
        recipient: targetChat,
        status: 'delivered',
        messageId: mockId,
        isMock: true,
        preview: text.slice(0, 150),
      });
      return { success: true, mock: true, messageId: mockId };
    }

    try {
      const res = await this.bot.api.sendMessage(targetChat, text, { parse_mode: parseMode });
      await new Promise((resolve) => setTimeout(resolve, 800));

      this.recordDeliveryLog({
        recipient: targetChat,
        status: 'delivered',
        messageId: String(res.message_id),
        preview: text.slice(0, 150),
      });

      return { success: true, messageId: String(res.message_id) };
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      console.error(`[TelegramNotifier] Erro ao enviar mensagem para ${targetChat}:`, errorMsg);

      this.recordDeliveryLog({
        recipient: targetChat,
        status: 'failed',
        error: errorMsg,
        preview: text.slice(0, 150),
      });

      return { success: false, error: errorMsg };
    }
  }

  public async sendNotification(job: ProcessedJob, bypassEligibility: boolean = false): Promise<boolean> {
    let matchResult: CandidateMatchResult | undefined;

    if (!bypassEligibility) {
      const eligibility = this.evaluateJobEligibility(job);
      if (!eligibility.eligible) {
        console.log(`[TelegramNotifier] Vaga ignorada: "${job.title}" (${job.company}) -> ${eligibility.reason}`);
        return false;
      }
      matchResult = eligibility.matchResult;
    }

    const message = this.formatJobMessage(job, matchResult);

    if (!this.bot || !this.chatId) {
      console.log(`[TelegramNotifier MOCK MODE] Notificação gerada para vaga aprovada "${job.title}":\n${message}\n`);
      this.recordDeliveryLog({
        recipient: 'chat_default',
        status: 'delivered',
        messageId: `mock-job-${Date.now()}`,
        isMock: true,
        preview: `Vaga: ${job.title}`,
      });
      return true;
    }

    try {
      const res = await this.bot.api.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      await new Promise((resolve) => setTimeout(resolve, 800));

      this.recordDeliveryLog({
        recipient: this.chatId,
        status: 'delivered',
        messageId: String(res.message_id),
        preview: `Vaga: ${job.title}`,
      });
      return true;
    } catch (err: any) {
      console.error(`[TelegramNotifier] Erro ao enviar notificação da vaga "${job.title}":`, err);

      this.recordDeliveryLog({
        recipient: this.chatId || 'chat_default',
        status: 'failed',
        error: err.message || String(err),
        preview: `Vaga: ${job.title}`,
      });
      return false;
    }
  }

  public async sendAlert(alertMessage: string): Promise<boolean> {
    const formattedAlert = `⚠️ <b>[ALERTA DE SISTEMA]</b>\n${this.escapeHtml(alertMessage)}`;

    if (!this.bot || !this.chatId) {
      console.warn(`[TelegramNotifier MOCK MODE] Alerta gerado:\n${formattedAlert}\n`);
      this.recordDeliveryLog({
        recipient: 'chat_default',
        status: 'delivered',
        messageId: `mock-alert-${Date.now()}`,
        isMock: true,
        preview: alertMessage.slice(0, 150),
      });
      return true;
    }

    try {
      const res = await this.bot.api.sendMessage(this.chatId, formattedAlert, { parse_mode: 'HTML' });
      await new Promise((resolve) => setTimeout(resolve, 800));

      this.recordDeliveryLog({
        recipient: this.chatId,
        status: 'delivered',
        messageId: String(res.message_id),
        preview: alertMessage.slice(0, 150),
      });
      return true;
    } catch (err: any) {
      console.error(`[TelegramNotifier] Erro ao enviar alerta no Telegram:`, err);

      this.recordDeliveryLog({
        recipient: this.chatId || 'chat_default',
        status: 'failed',
        error: err.message || String(err),
        preview: alertMessage.slice(0, 150),
      });
      return false;
    }
  }

  public async sendBatchNotifications(jobs: ProcessedJob[]): Promise<number> {
    let sentCount = 0;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const job of jobs) {
      const success = await this.sendNotification(job);
      if (success) {
        sentCount++;
        await delay(800);
      }
    }
    return sentCount;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private maskChatId(id: string): string {
    if (id.length <= 4) return '***';
    return id.slice(0, 3) + '****' + id.slice(-2);
  }

  private recordDeliveryLog(data: {
    recipient: string;
    status: 'delivered' | 'failed';
    messageId?: string;
    error?: string;
    isMock?: boolean;
    preview?: string;
  }) {
    try {
      const logId = crypto.randomUUID();
      const now = new Date().toISOString();

      const metadata = JSON.stringify({
        source: 'telegram_notifier',
        targetProfile: this.targetUserEmail,
        isMock: !!data.isMock,
        error: data.error,
        preview: data.preview,
      });

      const stmt = db.prepare(`
        INSERT INTO logs (
          id, nivel, tipo, mensagem, metadata, ip, user_agent, created_at
        ) VALUES (?, ?, 'telegram', ?, ?, NULL, 'TelegramNotifier/1.0', ?)
      `);

      const nivel = data.status === 'delivered' ? 'info' : 'error';
      const mensagem = `[Telegram] ${data.status === 'delivered' ? 'Notificação enviada' : 'Falha no envio'} para ${data.recipient}`;

      stmt.run(logId, nivel, mensagem, metadata, now);
    } catch (err) {
      // Ignora silenciosamente caso logs não esteja inicializada em contexto de teste unitário
    }
  }
}
