import { db, initDatabase } from './index';

export type JobStatus = 'active' | 'expired' | 'hidden';

export interface AdminJobEntry {
  id: string;
  url: string;
  title: string;
  company: string;
  platform: string;
  description: string;
  published_at: string;
  location: string | null;
  work_model: string | null;
  required_seniority: string | null;
  tech_stack: string | null;
  salary: string | null;
  direct_contact: string | null;
  status: JobStatus;
  application_status: string;
  category: string | null;
  is_junior_fullstack: number;
  overall_score: number;
  is_tech_software: number;
  created_at: string;
}

export interface AdminJobFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  platform?: string;
  status?: JobStatus | 'all';
  workModel?: 'all' | 'remoto' | 'hibrido' | 'presencial';
  category?: string;
}

export interface AdminJobStats {
  totalJobs: number;
  activeJobs: number;
  hiddenJobs: number;
  expiredJobs: number;
  eligibleForPurge: number;
  retentionDays: number;
  platformsCount: Record<string, number>;
}

export interface PaginatedAdminJobsResult {
  jobs: AdminJobEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: AdminJobStats;
}

export class AdminJobRepository {
  constructor() {
    initDatabase();
  }

  public getRetentionDays(): number {
    try {
      const row = db
        .prepare("SELECT value FROM admin_settings WHERE key = 'job_retention_days'")
        .get() as { value: string } | undefined;
      return row ? parseInt(row.value, 10) || 21 : 21;
    } catch {
      return 21;
    }
  }

  public setRetentionDays(days: number): void {
    db.prepare(`
      INSERT INTO admin_settings (key, value, updated_at)
      VALUES ('job_retention_days', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(String(days));
  }

  public getAdminJobs(params: AdminJobFilterParams = {}): PaginatedAdminJobsResult {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['1=1'];
    const queryParams: any[] = [];

    // Busca textual ampla
    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(title) LIKE ? OR LOWER(company) LIKE ? OR LOWER(tech_stack) LIKE ? OR LOWER(location) LIKE ?)');
      queryParams.push(term, term, term, term);
    }

    // Filtro por plataforma
    if (params.platform && params.platform !== 'all') {
      whereClauses.push('platform = ?');
      queryParams.push(params.platform);
    }

    // Filtro por status
    if (params.status && params.status !== 'all') {
      whereClauses.push('status = ?');
      queryParams.push(params.status);
    }

    // Filtro por modelo de trabalho
    if (params.workModel && params.workModel !== 'all') {
      whereClauses.push('LOWER(work_model) LIKE ?');
      queryParams.push(`%${params.workModel.toLowerCase()}%`);
    }

    // Filtro por categoria
    if (params.category && params.category !== 'all') {
      whereClauses.push('category = ?');
      queryParams.push(params.category);
    }

    const whereSql = whereClauses.join(' AND ');

    // Contagem total
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM jobs WHERE ${whereSql}`);
    const { total } = countStmt.get(...queryParams) as { total: number };

    // Registros ordenados por data de criação decrescente
    const dataStmt = db.prepare(`
      SELECT 
        id, url, title, company, platform, description, published_at, location,
        work_model, required_seniority, tech_stack, salary, direct_contact,
        status, application_status, category, is_junior_fullstack, overall_score,
        is_tech_software, created_at
      FROM jobs
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const jobs = dataStmt.all(...queryParams, limit, offset) as AdminJobEntry[];
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      jobs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  public getAdminJobStats(customRetentionDays?: number): AdminJobStats {
    const retentionDays = customRetentionDays !== undefined ? customRetentionDays : this.getRetentionDays();

    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' OR status IS NULL THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) as hidden_count,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_count
      FROM jobs
    `).get() as { total: number; active_count: number; hidden_count: number; expired_count: number };

    // Vagas elegíveis para expurgo seguro:
    // Mais velhas que a retenção, marcadas como 'expired' e NÃO presentes em user_saved_jobs
    const eligibleStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE created_at < datetime('now', '-' || ? || ' days')
        AND status = 'expired'
        AND id NOT IN (SELECT job_id FROM user_saved_jobs)
    `);
    const { count: eligibleForPurge } = eligibleStmt.get(retentionDays) as { count: number };

    // Plataformas ativas
    const platformRows = db.prepare(`
      SELECT platform, COUNT(*) as count 
      FROM jobs 
      GROUP BY platform 
      ORDER BY count DESC
    `).all() as Array<{ platform: string; count: number }>;

    const platformsCount: Record<string, number> = {};
    for (const r of platformRows) {
      platformsCount[r.platform] = r.count;
    }

    return {
      totalJobs: counts.total || 0,
      activeJobs: counts.active_count || 0,
      hiddenJobs: counts.hidden_count || 0,
      expiredJobs: counts.expired_count || 0,
      eligibleForPurge: eligibleForPurge || 0,
      retentionDays,
      platformsCount,
    };
  }

  public updateJob(id: string, patch: Partial<AdminJobEntry>): boolean {
    const allowedFields = [
      'title',
      'company',
      'location',
      'work_model',
      'required_seniority',
      'tech_stack',
      'salary',
      'status',
      'category',
      'direct_contact',
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(patch)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        if (key === 'tech_stack' && Array.isArray(val)) {
          values.push(JSON.stringify(val));
        } else {
          values.push(val);
        }
      }
    }

    if (updates.length === 0) return false;

    values.push(id);
    const stmt = db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  public getJobById(id: string): AdminJobEntry | null {
    const job = db
      .prepare(`
        SELECT 
          id, url, title, company, platform, description, published_at, location,
          work_model, required_seniority, tech_stack, salary, direct_contact,
          status, application_status, category, is_junior_fullstack, overall_score,
          is_tech_software, created_at
        FROM jobs
        WHERE id = ?
      `)
      .get(id) as AdminJobEntry | undefined;

    return job || null;
  }

  public toggleJobHide(id: string): { id: string; previousStatus: JobStatus; newStatus: JobStatus } | null {
    const job = db.prepare('SELECT status FROM jobs WHERE id = ?').get(id) as { status: JobStatus } | undefined;
    if (!job) return null;

    const previousStatus = job.status || 'active';
    const newStatus: JobStatus = previousStatus === 'hidden' ? 'active' : 'hidden';

    db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(newStatus, id);

    return {
      id,
      previousStatus,
      newStatus,
    };
  }

  public deleteJobPermanent(id: string): boolean {
    // Remove relacionamentos para manter integridade
    db.prepare('DELETE FROM user_saved_jobs WHERE job_id = ?').run(id);
    db.prepare('DELETE FROM user_hidden_jobs WHERE job_id = ?').run(id);

    const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public previewPurge(retentionDays?: number): { eligibleCount: number; retentionDays: number } {
    const days = retentionDays !== undefined ? retentionDays : this.getRetentionDays();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE created_at < datetime('now', '-' || ? || ' days')
        AND status = 'expired'
        AND id NOT IN (SELECT job_id FROM user_saved_jobs)
    `);
    const { count } = stmt.get(days) as { count: number };
    return {
      eligibleCount: count,
      retentionDays: days,
    };
  }

  public executeBatchPurge(
    retentionDays?: number,
    batchSize: number = 500
  ): { totalDeleted: number; batches: number; retentionDays: number; reclaimedDisk: boolean } {
    const days = retentionDays !== undefined ? retentionDays : this.getRetentionDays();
    let totalDeleted = 0;
    let batches = 0;

    // Subquery segura compatível com qualquer versão do SQLite (sem LIMIT no DELETE direto)
    const deleteStmt = db.prepare(`
      DELETE FROM jobs 
      WHERE id IN (
        SELECT id FROM jobs 
        WHERE created_at < datetime('now', '-' || ? || ' days')
          AND status = 'expired'
          AND id NOT IN (SELECT job_id FROM user_saved_jobs)
        LIMIT ?
      )
    `);

    // Executa em lotes controlados para evitar contenção de memória e lock prolongado
    while (true) {
      const result = deleteStmt.run(days, batchSize);
      if (result.changes === 0) break;

      totalDeleted += result.changes;
      batches++;

      if (result.changes < batchSize) break;
    }

    // Liberação gradual e suave de páginas para o SO (sem VACUUM pleno)
    let reclaimedDisk = false;
    try {
      db.pragma('incremental_vacuum(1000)');
      reclaimedDisk = true;
    } catch (err) {
      console.warn('[AdminJobRepository] Erro ao executar incremental_vacuum:', (err as Error).message);
    }

    return {
      totalDeleted,
      batches,
      retentionDays: days,
      reclaimedDisk,
    };
  }
}
