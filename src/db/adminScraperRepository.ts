import { db, initDatabase } from './index';

export type ScraperMethod = 'playwright' | 'ssr' | 'cookie' | 'api';
export type ScraperOperationalStatus = 'running' | 'success' | 'failed' | 'idle' | 'disabled';

export interface ScraperConfigEntry {
  name: string;
  is_enabled: number; // 1 = enabled, 0 = disabled
  method: ScraperMethod;
  target_url: string | null;
  timeout_ms: number;
  updated_at: string;
}

export interface ScraperMonitoringItem {
  name: string;
  is_enabled: number;
  method: ScraperMethod;
  target_url: string | null;
  timeout_ms: number;
  status: ScraperOperationalStatus;
  last_run_at: string | null;
  last_latency_ms: number | null;
  last_jobs_found: number;
  total_jobs_stored: number;
  last_error: string | null;
  last_run_id: string | null;
  last_message: string | null;
}

export interface ScraperMonitoringSummary {
  total: number;
  active: number;
  running: number;
  success: number;
  failed: number;
  disabled: number;
  avgLatencyMs: number;
  totalJobsStored: number;
}

export const DEFAULT_SCRAPERS: Array<{
  name: string;
  method: ScraperMethod;
  target_url?: string;
  timeout_ms?: number;
}> = [
  { name: 'Gupy', method: 'ssr', target_url: 'https://portal.gupy.io' },
  { name: 'LinkedIn', method: 'playwright', target_url: 'https://www.linkedin.com/jobs' },
  { name: 'Indeed', method: 'ssr', target_url: 'https://br.indeed.com' },
  { name: 'Google Jobs', method: 'api', target_url: 'https://serpapi.com' },
  { name: 'Telegram Channels', method: 'api', target_url: 'https://t.me' },
  { name: 'Programathor', method: 'ssr', target_url: 'https://programathor.com.br' },
  { name: 'Remotar', method: 'ssr', target_url: 'https://remotar.com.br' },
  { name: 'Catho', method: 'ssr', target_url: 'https://www.catho.com.br' },
  { name: 'Glassdoor', method: 'playwright', target_url: 'https://www.glassdoor.com.br' },
  { name: 'São José Mais Empregos', method: 'ssr', target_url: 'https://saojose.maisemprego.sc.gov.br' },
  { name: 'Vagas SC', method: 'ssr', target_url: 'https://vagassc.com.br' },
  { name: 'Vagas Floripa', method: 'ssr', target_url: 'https://vagasfloripa.com.br' },
  { name: 'Emprega Palhoça', method: 'ssr', target_url: 'https://empregapalhoca.com.br' },
  { name: 'Nerdin', method: 'ssr', target_url: 'https://nerdin.com.br' },
  { name: 'InfoJobs', method: 'ssr', target_url: 'https://www.infojobs.com.br' },
  { name: 'Chawork', method: 'ssr', target_url: 'https://chawork.com.br' },
  { name: 'Trabalha Brasil', method: 'ssr', target_url: 'https://www.trabalhabrasil.com.br' },
  { name: 'BNE', method: 'ssr', target_url: 'https://www.bne.com.br' },
  { name: 'beBee', method: 'ssr', target_url: 'https://br.bebee.com' },
  { name: 'Empregos.com.br', method: 'ssr', target_url: 'https://www.empregos.com.br' },
  { name: 'Recruta Simples', method: 'ssr', target_url: 'https://www.recrutasimples.com.br' },
  { name: 'Recrutei Empregos', method: 'api', target_url: 'https://recrutei.com.br' },
  { name: 'Quickin ATS', method: 'api', target_url: 'https://quickin.io' },
  { name: 'Recrutei Jobs (PeoplePlan)', method: 'api', target_url: 'https://peopleplan.recrutei.com.br' },
  { name: 'PandaPé ATS (GTO RH)', method: 'ssr', target_url: 'https://pandape.infojobs.com.br' },
  { name: 'GeekHunter', method: 'ssr', target_url: 'https://www.geekhunter.com.br' },
  { name: 'Revelo', method: 'playwright', target_url: 'https://www.revelo.com.br' },
  { name: '99jobs', method: 'playwright', target_url: 'https://www.99jobs.com' },
  { name: 'Sólides', method: 'api', target_url: 'https://vagas.solides.com.br' },
  { name: 'RunTalent', method: 'playwright', target_url: 'https://runtalent.com.br' },
  { name: 'Empregare', method: 'playwright', target_url: 'https://empregare.com' },
  { name: 'Trampos.co', method: 'ssr', target_url: 'https://trampos.co' },
  { name: '99Freelas', method: 'ssr', target_url: 'https://www.99freelas.com.br' },
  { name: 'Workana', method: 'playwright', target_url: 'https://www.workana.com' },
  { name: 'Facebook Groups', method: 'cookie', target_url: 'https://facebook.com' },
  { name: 'LinkedIn Posts', method: 'playwright', target_url: 'https://www.linkedin.com/feed' },
];

export class AdminScraperRepository {
  constructor() {
    initDatabase();
    this.seedDefaultConfigs();
  }

  seedDefaultConfigs(): void {
    const existing = db.prepare('SELECT name FROM scraper_configs').all() as Array<{ name: string }>;
    const existingSet = new Set(existing.map((e) => e.name));

    const insertStmt = db.prepare(`
      INSERT INTO scraper_configs (name, is_enabled, method, target_url, timeout_ms, updated_at)
      VALUES (?, 1, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const insertMany = db.transaction(() => {
      for (const scraper of DEFAULT_SCRAPERS) {
        if (!existingSet.has(scraper.name)) {
          insertStmt.run(
            scraper.name,
            scraper.method,
            scraper.target_url || null,
            scraper.timeout_ms || 45000,
            now
          );
        }
      }
    });

    insertMany();
  }

  getAllConfigs(): ScraperConfigEntry[] {
    const stmt = db.prepare('SELECT * FROM scraper_configs ORDER BY name ASC');
    return stmt.all() as ScraperConfigEntry[];
  }

  getConfig(name: string): ScraperConfigEntry | null {
    const stmt = db.prepare('SELECT * FROM scraper_configs WHERE name = ?');
    return (stmt.get(name) as ScraperConfigEntry) || null;
  }

  toggleScraper(name: string, enabled: boolean): ScraperConfigEntry | null {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE scraper_configs
      SET is_enabled = ?, updated_at = ?
      WHERE name = ?
    `);
    const info = stmt.run(enabled ? 1 : 0, now, name);
    if (info.changes === 0) return null;
    return this.getConfig(name);
  }

  updateConfig(
    name: string,
    data: { is_enabled?: boolean; method?: ScraperMethod; target_url?: string; timeout_ms?: number }
  ): ScraperConfigEntry | null {
    const current = this.getConfig(name);
    if (!current) return null;

    const is_enabled = data.is_enabled !== undefined ? (data.is_enabled ? 1 : 0) : current.is_enabled;
    const method = data.method || current.method;
    const target_url = data.target_url !== undefined ? data.target_url : current.target_url;
    const timeout_ms = data.timeout_ms !== undefined ? data.timeout_ms : current.timeout_ms;
    const updated_at = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE scraper_configs
      SET is_enabled = ?, method = ?, target_url = ?, timeout_ms = ?, updated_at = ?
      WHERE name = ?
    `);
    stmt.run(is_enabled, method, target_url, timeout_ms, updated_at, name);
    return this.getConfig(name);
  }

  getConnectorLogs(
    scraperName: string,
    limit: number = 25
  ): Array<{
    id: string;
    runId: string;
    scraperName: string;
    level: string;
    message: string;
    details: string | null;
    createdAt: string;
  }> {
    const stmt = db.prepare(`
      SELECT id, run_id as runId, scraper_name as scraperName, level, message, details, created_at as createdAt
      FROM scraper_logs
      WHERE scraper_name = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(scraperName, limit) as any[];
  }

  getMonitoringMetrics(): { items: ScraperMonitoringItem[]; summary: ScraperMonitoringSummary } {
    const configs = this.getAllConfigs();

    // 1. Contagem de vagas por plataforma
    const jobRows = db.prepare('SELECT LOWER(platform) as platform, COUNT(*) as count FROM jobs GROUP BY LOWER(platform)').all() as Array<{ platform: string; count: number }>;
    const jobsByPlatform = new Map<string, number>();
    for (const r of jobRows) {
      if (r.platform) {
        jobsByPlatform.set(r.platform.toLowerCase(), r.count);
      }
    }

    // 2. Mapeamento de scraperName -> chaves de plataforma
    const platformAliases: Record<string, string[]> = {
      'gupy': ['gupy'],
      'linkedin': ['linkedin'],
      'indeed': ['indeed'],
      'google jobs': ['google_jobs', 'google jobs', 'google'],
      'telegram channels': ['telegram', 'telegram_channels'],
      'programathor': ['programathor'],
      'remotar': ['remotar'],
      'catho': ['catho'],
      'glassdoor': ['glassdoor'],
      'são josé mais empregos': ['sao_jose', 'saojose', 'são josé mais empregos'],
      'vagas sc': ['vagas_sc', 'vagassc', 'vagas sc'],
      'vagas floripa': ['vagas_floripa', 'vagasfloripa', 'vagas floripa'],
      'emprega palhoça': ['emprega_palhoca', 'empregapalhoca', 'emprega palhoça'],
      'nerdin': ['nerdin'],
      'infojobs': ['infojobs'],
      'chawork': ['chawork'],
      'trabalha brasil': ['trabalha_brasil', 'trabalhabrasil', 'trabalha brasil'],
      'bne': ['bne'],
      'bebee': ['bebee'],
      'empregos.com.br': ['empregos', 'empregos.com.br'],
      'recruta simples': ['recruta_simples', 'recrutasimples', 'recruta simples'],
      'recrutei empregos': ['recrutei_empregos', 'recruteiempregos', 'recrutei empregos'],
      'quickin ats': ['quickin', 'quickin_ats', 'quickin ats'],
      'recrutei jobs (peopleplan)': ['recrutei_jobs', 'peopleplan', 'recrutei jobs (peopleplan)'],
      'pandapé ats (gto rh)': ['pandape', 'pandape_ats', 'pandapé ats (gto rh)'],
      'geekhunter': ['geekhunter'],
      'revelo': ['revelo'],
      '99jobs': ['99jobs'],
      'sólides': ['solides', 'sólides'],
      'runtalent': ['runtalent'],
      'empregare': ['empregare'],
      'trampos.co': ['trampos', 'trampos.co'],
      '99freelas': ['99freelas'],
      'workana': ['workana'],
      'facebook groups': ['facebook_groups', 'facebook', 'facebook groups'],
      'linkedin posts': ['linkedin_posts', 'linkedin posts'],
    };

    // 3. Buscar logs recentes dos conectores
    const recentLogs = db.prepare(`
      SELECT scraper_name, level, message, details, created_at, run_id
      FROM scraper_logs
      WHERE scraper_name != 'Pipeline' AND scraper_name != 'Orchestrator'
      ORDER BY created_at DESC
    `).all() as Array<{
      scraper_name: string;
      level: string;
      message: string;
      details: string | null;
      created_at: string;
      run_id: string;
    }>;

    const logsByScraper = new Map<string, Array<typeof recentLogs[0]>>();
    for (const log of recentLogs) {
      const list = logsByScraper.get(log.scraper_name) || [];
      if (list.length < 5) {
        list.push(log);
        logsByScraper.set(log.scraper_name, list);
      }
    }

    const now = Date.now();
    const items: ScraperMonitoringItem[] = [];

    let totalLatencies = 0;
    let latencyCount = 0;
    let totalJobsStored = 0;

    for (const config of configs) {
      const logs = logsByScraper.get(config.name) || [];
      const latestLog = logs[0] || null;

      // Calcular vagas no banco
      const lowerName = config.name.toLowerCase();
      const aliases = platformAliases[lowerName] || [lowerName];
      let storedCount = 0;
      for (const alias of aliases) {
        storedCount += jobsByPlatform.get(alias) || 0;
      }
      totalJobsStored += storedCount;

      let status: ScraperOperationalStatus = 'idle';
      let lastLatencyMs: number | null = null;
      let lastJobsFound = 0;
      let lastError: string | null = null;
      let lastRunAt: string | null = latestLog ? latestLog.created_at : null;
      let lastRunId: string | null = latestLog ? latestLog.run_id : null;
      let lastMessage: string | null = latestLog ? latestLog.message : null;

      if (config.is_enabled === 0) {
        status = 'disabled';
      } else if (latestLog) {
        const logAgeMs = now - new Date(latestLog.created_at).getTime();

        // Checar se está rodando (iniciou nos últimos 3 minutos e não concluiu)
        if (latestLog.message.includes('Buscando vagas em') && logAgeMs < 180000) {
          status = 'running';
        } else if (latestLog.level === 'ERROR' || latestLog.message.includes('Falha no scraper')) {
          status = 'failed';
          lastError = latestLog.message;
          const latencyMatch = latestLog.message.match(/após ([\d.]+)s/);
          if (latencyMatch) {
            lastLatencyMs = Math.round(parseFloat(latencyMatch[1]) * 1000);
          }
        } else {
          // Procurar log de término
          const finishLog = logs.find((l) => l.message.includes('Finalizado em') || l.level === 'INFO');
          if (finishLog) {
            status = 'success';
            const finishMatch = finishLog.message.match(/Finalizado em ([\d.]+)s com (\d+) vagas/);
            if (finishMatch) {
              lastLatencyMs = Math.round(parseFloat(finishMatch[1]) * 1000);
              lastJobsFound = parseInt(finishMatch[2], 10);
            }
          } else {
            status = 'idle';
          }
        }
      }

      if (lastLatencyMs !== null && lastLatencyMs > 0) {
        totalLatencies += lastLatencyMs;
        latencyCount++;
      }

      items.push({
        name: config.name,
        is_enabled: config.is_enabled,
        method: config.method,
        target_url: config.target_url,
        timeout_ms: config.timeout_ms,
        status,
        last_run_at: lastRunAt,
        last_latency_ms: lastLatencyMs,
        last_jobs_found: lastJobsFound,
        total_jobs_stored: storedCount,
        last_error: lastError,
        last_run_id: lastRunId,
        last_message: lastMessage,
      });
    }

    const summary: ScraperMonitoringSummary = {
      total: configs.length,
      active: configs.filter((c) => c.is_enabled === 1).length,
      running: items.filter((i) => i.status === 'running').length,
      success: items.filter((i) => i.status === 'success').length,
      failed: items.filter((i) => i.status === 'failed').length,
      disabled: items.filter((i) => i.status === 'disabled').length,
      avgLatencyMs: latencyCount > 0 ? Math.round(totalLatencies / latencyCount) : 0,
      totalJobsStored,
    };

    return { items, summary };
  }
}
