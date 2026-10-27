import { db, initDatabase } from './index';

export type CompanyPlanTier = 'free' | 'startup' | 'enterprise';
export type CompanyStatus = 'active' | 'prospect' | 'inactive';

export interface AdminCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  recruiter_phone: string | null;
  plan_tier: CompanyPlanTier;
  status: CompanyStatus;
  featured_job_limit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  active_jobs_count?: number;
}

export interface AdminCompanyStats {
  totalCompanies: number;
  activePartners: number;
  prospectCompanies: number;
  totalMappedJobs: number;
}

export interface AdminCompanyFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  planTier?: string;
  sortBy?: 'name' | 'created_at' | 'active_jobs_count';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminCompanyInput {
  name: string;
  slug?: string;
  logo_url?: string | null;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  recruiter_name?: string | null;
  recruiter_email?: string | null;
  recruiter_phone?: string | null;
  plan_tier?: CompanyPlanTier;
  status?: CompanyStatus;
  featured_job_limit?: number;
  notes?: string | null;
}

export interface CompanyLinkedJob {
  id: string;
  title: string;
  url: string;
  platform: string;
  location: string | null;
  work_model: string | null;
  tech_stack: string | null;
  status: string;
  created_at: string;
}

export class AdminCompanyRepository {
  constructor() {
    initDatabase();
  }

  /**
   * Gera um slug único e limpo para a empresa
   */
  generateSlug(name: string, excludeId?: string): string {
    const baseSlug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'empresa';

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      let query = 'SELECT id FROM companies WHERE slug = ?';
      const params: any[] = [slug];
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      const existing = db.prepare(query).get(...params);
      if (!existing) {
        return slug;
      }
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  /**
   * Cadastra uma nova empresa B2B
   */
  createCompany(input: AdminCompanyInput): AdminCompany {
    const id = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const slug = input.slug?.trim() ? this.generateSlug(input.slug.trim()) : this.generateSlug(input.name);

    const stmt = db.prepare(`
      INSERT INTO companies (
        id, name, slug, logo_url, website, industry, description,
        recruiter_name, recruiter_email, recruiter_phone,
        plan_tier, status, featured_job_limit, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.name.trim(),
      slug,
      input.logo_url?.trim() || null,
      input.website?.trim() || null,
      input.industry?.trim() || 'Tecnologia',
      input.description?.trim() || null,
      input.recruiter_name?.trim() || null,
      input.recruiter_email?.trim() || null,
      input.recruiter_phone?.trim() || null,
      input.plan_tier || 'free',
      input.status || 'active',
      input.featured_job_limit || 0,
      input.notes?.trim() || null,
      now,
      now
    );

    return this.getCompanyById(id)!;
  }

  /**
   * Busca empresa por ID
   */
  getCompanyById(id: string): AdminCompany | null {
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as AdminCompany | undefined;
    if (!company) return null;

    // Busca contagem de vagas ativas
    const jobCount = db.prepare(`
      SELECT COUNT(*) as count FROM jobs
      WHERE LOWER(company) = LOWER(?) AND status = 'active'
    `).get(company.name) as { count: number };

    return {
      ...company,
      active_jobs_count: jobCount?.count || 0,
    };
  }

  /**
   * Retorna lista paginada e filtrada de empresas com total e cálculo de vagas
   */
  getAdminCompanies(params: AdminCompanyFilterParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const sqlParams: any[] = [];

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(`(
        c.name LIKE ? OR 
        c.website LIKE ? OR 
        c.industry LIKE ? OR 
        c.recruiter_name LIKE ? OR 
        c.recruiter_email LIKE ?
      )`);
      sqlParams.push(term, term, term, term, term);
    }

    if (params.status && params.status !== 'all') {
      conditions.push('c.status = ?');
      sqlParams.push(params.status);
    }

    if (params.planTier && params.planTier !== 'all') {
      conditions.push('c.plan_tier = ?');
      sqlParams.push(params.planTier);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Contagem total
    const countSql = `SELECT COUNT(*) as total FROM companies c ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...sqlParams) as { total: number };
    const total = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Ordenação
    let orderColumn = 'c.created_at';
    if (params.sortBy === 'name') orderColumn = 'c.name';
    else if (params.sortBy === 'active_jobs_count') orderColumn = 'active_jobs_count';

    const orderDirection = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const listSql = `
      SELECT 
        c.*,
        (
          SELECT COUNT(*) 
          FROM jobs j 
          WHERE LOWER(j.company) = LOWER(c.name) 
            AND j.status = 'active'
        ) as active_jobs_count
      FROM companies c
      ${whereClause}
      ORDER BY ${orderColumn} ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const companies = db.prepare(listSql).all(...sqlParams, limit, offset) as AdminCompany[];

    return {
      companies,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Consolida métricas gerais do módulo B2B
   */
  getAdminCompanyStats(): AdminCompanyStats {
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
    const totalCompanies = totalRow?.count || 0;

    const partnersRow = db.prepare(`
      SELECT COUNT(*) as count FROM companies 
      WHERE plan_tier IN ('startup', 'enterprise') AND status = 'active'
    `).get() as { count: number };
    const activePartners = partnersRow?.count || 0;

    const prospectsRow = db.prepare(`
      SELECT COUNT(*) as count FROM companies 
      WHERE status = 'prospect'
    `).get() as { count: number };
    const prospectCompanies = prospectsRow?.count || 0;

    const mappedJobsRow = db.prepare(`
      SELECT COUNT(j.id) as count 
      FROM jobs j 
      WHERE j.status = 'active' 
        AND EXISTS (
          SELECT 1 FROM companies c WHERE LOWER(c.name) = LOWER(j.company)
        )
    `).get() as { count: number };
    const totalMappedJobs = mappedJobsRow?.count || 0;

    return {
      totalCompanies,
      activePartners,
      prospectCompanies,
      totalMappedJobs,
    };
  }

  /**
   * Retorna os detalhes de uma empresa e suas vagas indexadas
   */
  getCompanyDetail(id: string) {
    const company = this.getCompanyById(id);
    if (!company) return null;

    const jobs = db.prepare(`
      SELECT id, title, url, platform, location, work_model, tech_stack, status, created_at
      FROM jobs
      WHERE LOWER(company) = LOWER(?)
      ORDER BY created_at DESC
      LIMIT 25
    `).all(company.name) as CompanyLinkedJob[];

    const totalJobsRow = db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE LOWER(company) = LOWER(?)
    `).get(company.name) as { count: number };

    return {
      company,
      jobs,
      totalJobs: totalJobsRow?.count || 0,
    };
  }

  /**
   * Atualiza dados de uma empresa existente
   */
  updateCompany(id: string, input: Partial<AdminCompanyInput>): AdminCompany | null {
    const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as AdminCompany | undefined;
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const slug = input.slug !== undefined && input.slug.trim() 
      ? this.generateSlug(input.slug.trim(), id) 
      : (input.name !== undefined && input.name.trim() !== existing.name ? this.generateSlug(name, id) : existing.slug);

    const logo_url = input.logo_url !== undefined ? (input.logo_url?.trim() || null) : existing.logo_url;
    const website = input.website !== undefined ? (input.website?.trim() || null) : existing.website;
    const industry = input.industry !== undefined ? (input.industry?.trim() || 'Tecnologia') : existing.industry;
    const description = input.description !== undefined ? (input.description?.trim() || null) : existing.description;
    const recruiter_name = input.recruiter_name !== undefined ? (input.recruiter_name?.trim() || null) : existing.recruiter_name;
    const recruiter_email = input.recruiter_email !== undefined ? (input.recruiter_email?.trim() || null) : existing.recruiter_email;
    const recruiter_phone = input.recruiter_phone !== undefined ? (input.recruiter_phone?.trim() || null) : existing.recruiter_phone;
    const plan_tier = input.plan_tier !== undefined ? input.plan_tier : existing.plan_tier;
    const status = input.status !== undefined ? input.status : existing.status;
    const featured_job_limit = input.featured_job_limit !== undefined ? input.featured_job_limit : existing.featured_job_limit;
    const notes = input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes;

    db.prepare(`
      UPDATE companies SET
        name = ?,
        slug = ?,
        logo_url = ?,
        website = ?,
        industry = ?,
        description = ?,
        recruiter_name = ?,
        recruiter_email = ?,
        recruiter_phone = ?,
        plan_tier = ?,
        status = ?,
        featured_job_limit = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      name,
      slug,
      logo_url,
      website,
      industry,
      description,
      recruiter_name,
      recruiter_email,
      recruiter_phone,
      plan_tier,
      status,
      featured_job_limit,
      notes,
      now,
      id
    );

    return this.getCompanyById(id);
  }

  /**
   * Exclui uma empresa do catálogo B2B
   */
  deleteCompany(id: string): boolean {
    const res = db.prepare('DELETE FROM companies WHERE id = ?').run(id);
    return res.changes > 0;
  }

  /**
   * Sincroniza e insere de forma idempotente empresas encontradas na tabela de vagas (jobs)
   */
  syncCompaniesFromJobs(): { syncedCount: number; totalJobsScanned: number } {
    const distinctCompanies = db.prepare(`
      SELECT DISTINCT TRIM(company) as company_name 
      FROM jobs 
      WHERE company IS NOT NULL 
        AND TRIM(company) != ''
        AND LENGTH(TRIM(company)) > 1
    `).all() as Array<{ company_name: string }>;

    let syncedCount = 0;
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO companies (
        id, name, slug, logo_url, website, industry, description,
        recruiter_name, recruiter_email, recruiter_phone,
        plan_tier, status, featured_job_limit, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of distinctCompanies) {
      const name = item.company_name;
      // Verifica se já existe (case-insensitive)
      const existing = db.prepare('SELECT id FROM companies WHERE LOWER(name) = LOWER(?)').get(name);
      if (!existing) {
        const id = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const slug = this.generateSlug(name);
        insertStmt.run(
          id,
          name,
          slug,
          null, // logo_url
          null, // website
          'Tecnologia', // industry default
          'Empresa indexada automaticamente a partir das vagas do ecossistema BuscaVag.',
          null,
          null,
          null,
          'free',
          'active',
          0,
          'Sincronizada via pipeline de jobs.',
          now,
          now
        );
        syncedCount++;
      }
    }

    return {
      syncedCount,
      totalJobsScanned: distinctCompanies.length,
    };
  }
}
