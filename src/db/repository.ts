import { db, initDatabase } from './index';
import { ProcessedJob, RawJob } from '../types/job';
import { generateJobHash } from '../utils/hash';
import { generateJobFingerprint } from '../utils/fingerprint';
import { parseCanonicalLocation } from '../utils/geoParser';
import { EvaluationResult } from '../services/hermesEvaluator';
import { TITLE_BLACKLIST } from '../config/jobFilters';

export interface JobFilterOptions {
  category?: string;
  platform?: string;
  status?: string;
  minScore?: number;
  search?: string;
  onlyApproved?: boolean;
  period?: string;
  location?: string;
  city?: string;
  state?: string;
  userId?: string;
  adminMode?: boolean;
  jobStatus?: string;
}


export interface DashboardStats {
  totalJobs: number;
  approvedJobs: number;
  avgScore: number;
  statusCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  topCompanies: Array<{ company: string; count: number }>;
}

export class JobRepository {
  constructor() {
    initDatabase();
  }

  public exists(
    url: string,
    company: string,
    title: string,
    platform?: string,
    location?: string | null
  ): boolean {
    const id = generateJobHash(url, company, title, platform);
    const fingerprint = generateJobFingerprint(title, company, location);
    const stmt = db.prepare('SELECT 1 FROM jobs WHERE id = ? OR url = ? OR fingerprint = ?');
    const result = stmt.get(id, url, fingerprint);
    return !!result;
  }

  public insert(
    rawJob: RawJob,
    evalResultOrIsJunior: EvaluationResult | boolean = false,
    scoreIa: number = 0,
    reasoning: string = ''
  ): ProcessedJob {
    const id = generateJobHash(rawJob.url, rawJob.company, rawJob.title, rawJob.platform);
    const createdAt = new Date();

    let isJunior = false;
    let overallScore = scoreIa;
    let stackScore = 0;
    let seniorityScore = 0;
    let locationScore = 0;
    let category = 'Full Stack';
    let gaps: string[] = [];
    let resumeTips = '';
    let aiReasoning = reasoning;
    let extractedRole = '';
    let contractType = '';
    let applicationChannel = '';
    let salary = '';
    let directContact = '';
    let requiredSeniority = '';
    let techStack: string[] = [];
    let workModel = '';
    let isTechSoftware = 1;

    if (typeof evalResultOrIsJunior === 'object' && evalResultOrIsJunior !== null) {
      isJunior = evalResultOrIsJunior.isJuniorFullStack;
      overallScore = evalResultOrIsJunior.overallScore ?? evalResultOrIsJunior.score ?? 0;
      stackScore = evalResultOrIsJunior.stackScore ?? 0;
      seniorityScore = evalResultOrIsJunior.seniorityScore ?? 0;
      locationScore = evalResultOrIsJunior.locationScore ?? 0;
      category = evalResultOrIsJunior.category || 'Full Stack';
      gaps = evalResultOrIsJunior.gaps || [];
      resumeTips = evalResultOrIsJunior.resumeTips || '';
      aiReasoning = evalResultOrIsJunior.reasoning || '';
      extractedRole = evalResultOrIsJunior.extractedRole || '';
      contractType = evalResultOrIsJunior.contractType || '';
      applicationChannel = evalResultOrIsJunior.applicationChannel || '';
      salary = evalResultOrIsJunior.salary || '';
      directContact = evalResultOrIsJunior.directContact || '';
      requiredSeniority = evalResultOrIsJunior.requiredSeniority || '';
      techStack = evalResultOrIsJunior.techStack || [];
      workModel = evalResultOrIsJunior.workModel || '';
      isTechSoftware = evalResultOrIsJunior.isTechSoftware !== false ? 1 : 0;
    } else {
      isJunior = Boolean(evalResultOrIsJunior);
      overallScore = scoreIa;
      aiReasoning = reasoning;
    }

    const applicationStatus = isJunior ? 'pending' : 'rejected';
    const canonicalGeo = parseCanonicalLocation(
      rawJob.location,
      rawJob.platform,
      rawJob.title,
      rawJob.description
    );
    const city = rawJob.city || canonicalGeo.city || null;
    const state = rawJob.state || canonicalGeo.state || null;
    const location = canonicalGeo.canonicalLocation || rawJob.location || null;
    const fingerprint = generateJobFingerprint(rawJob.title, rawJob.company, location);

    const stmt = db.prepare(`
      INSERT INTO jobs (
        id, url, title, company, platform, description, published_at, location,
        is_junior_fullstack, score_ia, overall_score, stack_score, seniority_score,
        location_score, category, gaps, resume_tips, application_status, ai_reasoning, notified, created_at,
        extracted_role, contract_type, application_channel, salary, direct_contact,
        required_seniority, tech_stack, work_model, is_tech_software, fingerprint,
        city, state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);

    stmt.run(
      id,
      rawJob.url,
      rawJob.title,
      rawJob.company,
      rawJob.platform,
      rawJob.description,
      rawJob.publishedAt.toISOString(),
      rawJob.location || null,
      isJunior ? 1 : 0,
      overallScore,
      overallScore,
      stackScore,
      seniorityScore,
      locationScore,
      category,
      JSON.stringify(gaps),
      resumeTips,
      applicationStatus,
      aiReasoning,
      createdAt.toISOString(),
      extractedRole,
      contractType,
      applicationChannel,
      salary,
      directContact,
      requiredSeniority,
      JSON.stringify(techStack),
      workModel,
      isTechSoftware,
      fingerprint,
      city,
      state
    );

    return {
      ...rawJob,
      id,
      fingerprint,
      city: city || undefined,
      state: state || undefined,
      location: location || undefined,
      isJuniorFullStack: isJunior,
      scoreIa: overallScore,
      overallScore,
      stackScore,
      seniorityScore,
      locationScore,
      category,
      gaps,
      resumeTips,
      applicationStatus,
      aiReasoning,
      extractedRole,
      contractType,
      applicationChannel,
      salary,
      directContact: directContact || undefined,
      requiredSeniority: requiredSeniority || undefined,
      techStack,
      workModel: workModel || undefined,
      isTechSoftware: Boolean(isTechSoftware),
      status: 'active',
      notified: false,
      createdAt,
    };
  }

  public getPendingNotifications(): ProcessedJob[] {
    const stmt = db.prepare('SELECT * FROM jobs WHERE is_junior_fullstack = 1 AND is_tech_software = 1 AND notified = 0');
    const rows = stmt.all() as any[];
    return rows.map((row) => this.mapRowToJob(row));
  }

  public markAsNotified(id: string): void {
    const stmt = db.prepare('UPDATE jobs SET notified = 1 WHERE id = ?');
    stmt.run(id);
  }

  public updateApplicationStatus(id: string, status: string): boolean {
    const stmt = db.prepare('UPDATE jobs SET application_status = ? WHERE id = ?');
    const result = stmt.run(status, id);
    return result.changes > 0;
  }

  public getJobById(id: string): ProcessedJob | null {
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapRowToJob(row);
  }

  public findByFingerprint(fingerprint: string): ProcessedJob | null {
    const stmt = db.prepare('SELECT * FROM jobs WHERE fingerprint = ?');
    const row = stmt.get(fingerprint) as any;
    if (!row) return null;
    return this.mapRowToJob(row);
  }

  public deleteJobs(ids: string[]): boolean {
    if (!ids || ids.length === 0) return false;
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM jobs WHERE id IN (${placeholders})`);
    const result = stmt.run(...ids);
    return result.changes > 0;
  }

  public purgeNonTech(): { deletedCount: number } {
    if (!TITLE_BLACKLIST || TITLE_BLACKLIST.length === 0) {
      return { deletedCount: 0 };
    }

    const conditions = TITLE_BLACKLIST.map(() => 'LOWER(title) LIKE ?').join(' OR ');
    const params = TITLE_BLACKLIST.map((term) => `%${term.toLowerCase()}%`);

    const stmt = db.prepare(`DELETE FROM jobs WHERE ${conditions}`);
    const result = stmt.run(...params);

    return { deletedCount: result.changes };
  }

  public getAllJobs(filters?: JobFilterOptions): ProcessedJob[] {
    let sql = 'SELECT jobs.*';
    const params: any[] = [];

    if (filters?.userId) {
      sql += ', s.status as user_status FROM jobs LEFT JOIN user_saved_jobs s ON jobs.id = s.job_id AND s.user_id = ?';
      params.push(filters.userId);
    } else {
      sql += ' FROM jobs';
    }

    sql += ' WHERE 1=1';

    // Blindagem de visibilidade pública / candidato: apenas vagas ativas
    if (!filters?.adminMode) {
      if (filters?.jobStatus && filters.jobStatus !== 'all') {
        sql += ' AND jobs.status = ?';
        params.push(filters.jobStatus);
      } else {
        sql += " AND (jobs.status IS NULL OR jobs.status = 'active')";
      }
    } else if (filters?.jobStatus && filters.jobStatus !== 'all') {
      sql += ' AND jobs.status = ?';
      params.push(filters.jobStatus);
    }

    if (filters?.onlyApproved) {
      sql += ' AND is_junior_fullstack = 1';
    }

    if (filters?.category && filters.category !== 'all') {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters?.platform && filters.platform !== 'all') {
      sql += ' AND platform = ?';
      params.push(filters.platform);
    }

    if (filters?.status && filters.status !== 'all') {
      if (filters.userId) {
        if (filters.status === 'pending') {
          sql += ' AND (s.status IS NULL OR s.status = ?)';
        } else {
          sql += ' AND s.status = ?';
        }
      } else {
        sql += ' AND jobs.application_status = ?';
      }
      params.push(filters.status);
    }

    if (filters?.minScore && filters.minScore > 0) {
      sql += ' AND (overall_score >= ? OR score_ia >= ?)';
      params.push(filters.minScore, filters.minScore);
    }

    if (filters?.search && filters.search.trim()) {
      sql += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)';
      const query = `%${filters.search.trim()}%`;
      params.push(query, query, query);
    }

    if (filters?.period && filters.period !== 'all') {
      if (filters.period === '24h') {
        sql += " AND datetime(published_at) >= datetime('now', '-24 hours')";
      } else if (filters.period === '48h') {
        sql += " AND datetime(published_at) >= datetime('now', '-48 hours')";
      } else if (filters.period === '7d') {
        sql += " AND datetime(published_at) >= datetime('now', '-7 days')";
      } else if (filters.period === '30d') {
        sql += " AND datetime(published_at) >= datetime('now', '-30 days')";
      }
    }

    if (filters?.city && filters.city !== 'all') {
      sql += ' AND city = ?';
      params.push(filters.city);
    }

    if (filters?.state && filters.state !== 'all') {
      sql += " AND (state = ? OR (state IS NULL AND LOWER(location) LIKE '%remoto%'))";
      params.push(filters.state.toUpperCase());
    }

    if (filters?.location && filters.location !== 'all') {
      const loc = filters.location.trim().toLowerCase();
      if (loc === 'remoto') {
        sql += " AND (LOWER(location) LIKE '%remoto%' OR LOWER(location) LIKE '%remote%' OR LOWER(location) LIKE '%home office%' OR LOWER(location) LIKE '%teletrabalho%' OR LOWER(location) LIKE '%brasil%' OR location IS NULL OR location = '')";
      } else if (loc === 'sc' || loc === 'santa catarina') {
        sql += " AND (state = 'SC' OR (state IS NULL AND LOWER(location) LIKE '%remoto%'))";
      } else if (loc === 'sp' || loc === 'sao paulo' || loc === 'são paulo') {
        sql += " AND (state = 'SP' OR (state IS NULL AND LOWER(location) LIKE '%remoto%'))";
      } else if (loc === 'pr' || loc === 'parana' || loc === 'paraná') {
        sql += " AND (state = 'PR' OR (state IS NULL AND LOWER(location) LIKE '%remoto%'))";
      } else if (loc === 'rj' || loc === 'rio de janeiro') {
        sql += " AND (state = 'RJ' OR (state IS NULL AND LOWER(location) LIKE '%remoto%'))";
      } else if (loc === 'mg' || loc === 'minas gerais') {
        sql += " AND (state = 'MG' OR (state IS NULL AND LOWER(location) LIKE '%remoto%'))";
      } else if (loc === 'rs' || loc === 'rio grande do sul') {
        sql += " AND (state = 'RS' OR (state IS NULL AND LOWER(location) LIKE '%remoto%'))";
      } else if (loc === 'df' || loc === 'brasilia' || loc === 'brasília') {
        sql += " AND (city = 'Brasília' OR state = 'DF')";
      } else if (loc === 'florianopolis' || loc === 'floripa') {
        sql += " AND (city = 'Florianópolis' OR LOWER(location) LIKE '%florianópolis%' OR LOWER(location) LIKE '%florianopolis%' OR LOWER(location) LIKE '%floripa%')";
      } else if (loc === 'palhoca') {
        sql += " AND (city = 'Palhoça' OR LOWER(location) LIKE '%palhoça%' OR LOWER(location) LIKE '%palhoca%')";
      } else if (loc === 'sao_jose' || loc === 'sao jose') {
        sql += " AND (city = 'São José' OR (LOWER(location) LIKE '%são josé%' AND LOWER(location) NOT LIKE '%campos%'))";
      } else if (loc === 'joinville') {
        sql += " AND (city = 'Joinville' OR LOWER(location) LIKE '%joinville%')";
      } else if (loc === 'blumenau') {
        sql += " AND (city = 'Blumenau' OR LOWER(location) LIKE '%blumenau%')";
      } else if (loc === 'balneario_camboriu' || loc === 'itajaí' || loc === 'itajai') {
        sql += " AND (city IN ('Balneário Camboriú', 'Itajaí') OR LOWER(location) LIKE '%balneário camboriú%' OR LOWER(location) LIKE '%itajaí%' OR LOWER(location) LIKE '%itajai%')";
      } else if (loc === 'curitiba') {
        sql += " AND (city = 'Curitiba' OR LOWER(location) LIKE '%curitiba%')";
      } else if (loc === 'porto_alegre') {
        sql += " AND (city = 'Porto Alegre' OR LOWER(location) LIKE '%porto alegre%')";
      } else if (loc === 'belo_horizonte') {
        sql += " AND (city = 'Belo Horizonte' OR LOWER(location) LIKE '%belo horizonte%')";
      } else {
        sql += ' AND (city = ? OR state = ? OR LOWER(location) LIKE ?)';
        params.push(loc, loc.toUpperCase(), `%${loc}%`);
      }
    }

    if (filters?.userId) {
      sql += ' AND jobs.id NOT IN (SELECT job_id FROM user_hidden_jobs WHERE user_id = ?)';
      params.push(filters.userId);
    }

    sql += ' ORDER BY overall_score DESC, published_at DESC';


    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((row) => this.mapRowToJob(row));
  }

  public getStats(): DashboardStats {
    const totalRow = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN is_junior_fullstack = 1 THEN 1 ELSE 0 END) as approved, AVG(overall_score) as avgScore FROM jobs').get() as any;
    
    const statusRows = db.prepare('SELECT application_status, COUNT(*) as count FROM jobs GROUP BY application_status').all() as any[];
    const statusCounts: Record<string, number> = {
      pending: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };
    for (const r of statusRows) {
      if (r.application_status) {
        statusCounts[r.application_status] = r.count;
      }
    }

    const platformRows = db.prepare('SELECT platform, COUNT(*) as count FROM jobs GROUP BY platform ORDER BY count DESC').all() as any[];
    const platformCounts: Record<string, number> = {};
    for (const r of platformRows) {
      platformCounts[r.platform] = r.count;
    }

    const categoryRows = db.prepare('SELECT category, COUNT(*) as count FROM jobs WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC').all() as any[];
    const categoryCounts: Record<string, number> = {};
    for (const r of categoryRows) {
      categoryCounts[r.category] = r.count;
    }

    const topCompanyRows = db.prepare('SELECT company, COUNT(*) as count FROM jobs GROUP BY company ORDER BY count DESC LIMIT 6').all() as any[];
    const topCompanies = topCompanyRows.map((r) => ({ company: r.company, count: r.count }));

    return {
      totalJobs: totalRow?.total || 0,
      approvedJobs: totalRow?.approved || 0,
      avgScore: Math.round(totalRow?.avgScore || 0),
      statusCounts,
      platformCounts,
      categoryCounts,
      topCompanies,
    };
  }

  private mapRowToJob(row: any): ProcessedJob {
    let gaps: string[] = [];
    try {
      if (row.gaps) {
        gaps = typeof row.gaps === 'string' ? JSON.parse(row.gaps) : row.gaps;
      }
    } catch {
      gaps = [];
    }

    return {
      id: row.id,
      url: row.url,
      title: row.title,
      company: row.company,
      platform: row.platform,
      description: row.description,
      publishedAt: new Date(row.published_at),
      location: row.location || undefined,
      city: row.city || undefined,
      state: row.state || undefined,
      isJuniorFullStack: Boolean(row.is_junior_fullstack),
      scoreIa: row.overall_score || row.score_ia || 0,
      overallScore: row.overall_score || row.score_ia || 0,
      stackScore: row.stack_score || 0,
      seniorityScore: row.seniority_score || 0,
      locationScore: row.location_score || 0,
      category: row.category || undefined,
      gaps,
      resumeTips: row.resume_tips || undefined,
      applicationStatus: row.user_status || ('user_status' in row ? 'pending' : (row.application_status || 'pending')),
      aiReasoning: row.ai_reasoning,
      extractedRole: row.extracted_role || undefined,
      contractType: row.contract_type || undefined,
      applicationChannel: row.application_channel || undefined,
      salary: row.salary || undefined,
      directContact: row.direct_contact || undefined,
      requiredSeniority: row.required_seniority || undefined,
      techStack: (() => {
        try {
          return row.tech_stack ? (typeof row.tech_stack === 'string' ? JSON.parse(row.tech_stack) : row.tech_stack) : [];
        } catch {
          return [];
        }
      })(),
      workModel: row.work_model || undefined,
      isTechSoftware: Boolean(row.is_tech_software ?? 1),
      fingerprint: row.fingerprint || undefined,
      status: row.status || 'active',
      notified: Boolean(row.notified),
      createdAt: new Date(row.created_at),
    };
  }
}
