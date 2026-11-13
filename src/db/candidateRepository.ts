import { db, initDatabase } from './index';
import { CandidateMatcher, type CandidateContext } from '../services/candidateMatcher';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  tier: 'free' | 'premium';
  role: 'GUEST' | 'CANDIDATE' | 'ADMIN';
  onboarding_completed: number;
  status?: 'active' | 'suspended';
  force_password_change?: number;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfile {
  user_id: string;
  target_role: string | null;
  seniority: string | null;
  expected_salary: string | null;
  preferred_work_models: string[];
  skills: string[];
  primary_stack: string[];
  secondary_stack: string[];
  bio: string | null;
  city: string | null;
  state: string | null;
  updated_at: string;
}

export interface CVAnalysisResult {
  detected_role: string;
  detected_seniority: string;
  hard_skills: string[];
  soft_skills: string[];
  primary_stack: string[];
  secondary_stack: string[];
  work_model: string | null;
  expected_salary: string | null;
  summary: string;
  strengths: string[];
  improvement_tips: string[];
  source?: string;
}

export interface CandidateResume {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  ai_analysis?: CVAnalysisResult | null;
  analyzed_at?: string | null;
  uploaded_at: string;
}

export interface SavedJobRecord {
  user_id: string;
  job_id: string;
  status: string;
  saved_at: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    url: string;
    platform: string;
    published_at: string;
    score_ia: number;
    overall_score: number;
  };
}

export class CandidateRepository {
  constructor() {
    initDatabase();
  }

  // --- Usuários ---

  createUser(user: { id: string; email: string; password_hash: string; name: string; tier?: 'free' | 'premium'; role?: 'GUEST' | 'CANDIDATE' | 'ADMIN' }): User {
    const now = new Date().toISOString();
    const tier = user.tier || 'premium';
    const role = user.role || 'CANDIDATE';

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, tier, role, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(user.id, user.email.toLowerCase().trim(), user.password_hash, user.name.trim(), tier, role, 0, now, now);

    // Inicializa perfil vazio (W-03: inclui city/state explicitamente para consistência)
    const profileStmt = db.prepare(`
      INSERT OR IGNORE INTO candidate_profiles (user_id, target_role, seniority, expected_salary, preferred_work_models, skills, primary_stack, secondary_stack, bio, city, state, updated_at)
      VALUES (?, '', 'Júnior', '', '[]', '[]', '[]', '[]', '', NULL, NULL, ?)
    `);
    profileStmt.run(user.id, now);

    return {
      id: user.id,
      email: user.email.toLowerCase().trim(),
      password_hash: user.password_hash,
      name: user.name.trim(),
      tier,
      role,
      onboarding_completed: 0,
      status: 'active',
      force_password_change: 0,
      created_at: now,
      updated_at: now,
    };
  }

  getUserByEmail(email: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email.toLowerCase().trim()) as User | undefined;
    return row || null;
  }

  getUserById(id: string): User | null {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as User | undefined;
    return row || null;
  }

  updateUserTier(id: string, tier: 'free' | 'premium'): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE users SET tier = ?, updated_at = ? WHERE id = ?');
    const info = stmt.run(tier, now, id);
    return info.changes > 0;
  }

  updateOnboardingStatus(id: string, status: boolean): boolean {
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE users SET onboarding_completed = ?, updated_at = ? WHERE id = ?');
    const info = stmt.run(status ? 1 : 0, now, id);
    return info.changes > 0;
  }

  /**
   * Avalia e unifica a verificação de onboarding do candidato (REQ-04).
   * Retorna true se já marcado no banco ou se o perfil contém os dados essenciais
   * (target_role, seniority e pelo menos 1 competência técnica).
   * Se os dados essenciais estiverem completos, sincroniza users.onboarding_completed = 1 automaticamente.
   */
  isOnboardingComplete(userId: string): boolean {
    const user = this.getUserById(userId);
    if (!user) return false;

    if (user.onboarding_completed === 1) {
      return true;
    }

    const profile = this.getProfile(userId);
    if (!profile) return false;

    const hasRole = Boolean(profile.target_role && profile.target_role.trim().length > 0);
    const hasSeniority = Boolean(profile.seniority && profile.seniority.trim().length > 0);
    const totalSkills = (profile.skills?.length || 0) + (profile.primary_stack?.length || 0) + (profile.secondary_stack?.length || 0);
    const hasSkills = totalSkills > 0;

    if (hasRole && hasSeniority && hasSkills) {
      this.updateOnboardingStatus(userId, true);
      return true;
    }

    return false;
  }

  // --- Perfil do Candidato ---

  getProfile(userId: string): CandidateProfile | null {
    const stmt = db.prepare('SELECT * FROM candidate_profiles WHERE user_id = ?');
    const row = stmt.get(userId) as any;
    if (!row) return null;

    let workModels: string[] = [];
    let skills: string[] = [];
    let primaryStack: string[] = [];
    let secondaryStack: string[] = [];
    try {
      workModels = JSON.parse(row.preferred_work_models || '[]');
    } catch {
      workModels = [];
    }
    try {
      skills = JSON.parse(row.skills || '[]');
    } catch {
      skills = [];
    }
    try {
      primaryStack = JSON.parse(row.primary_stack || '[]');
    } catch {
      primaryStack = [];
    }
    try {
      secondaryStack = JSON.parse(row.secondary_stack || '[]');
    } catch {
      secondaryStack = [];
    }

    return {
      user_id: row.user_id,
      target_role: row.target_role || null,
      seniority: row.seniority || 'Júnior',
      expected_salary: row.expected_salary || null,
      preferred_work_models: workModels,
      skills,
      primary_stack: primaryStack,
      secondary_stack: secondaryStack,
      bio: row.bio || null,
      city: row.city || null,
      state: row.state || null,
      updated_at: row.updated_at,
    };
  }

  upsertProfile(userId: string, data: Partial<CandidateProfile>): CandidateProfile {
    const now = new Date().toISOString();
    const existing = this.getProfile(userId);

    const target_role = data.target_role !== undefined ? data.target_role : existing?.target_role || '';
    const seniority = data.seniority !== undefined ? data.seniority : existing?.seniority || 'Júnior';
    const expected_salary = data.expected_salary !== undefined ? data.expected_salary : existing?.expected_salary || '';
    const preferred_work_models = JSON.stringify(data.preferred_work_models || existing?.preferred_work_models || []);
    const skills = JSON.stringify(data.skills || existing?.skills || []);
    const primary_stack = JSON.stringify(data.primary_stack || existing?.primary_stack || []);
    const secondary_stack = JSON.stringify(data.secondary_stack || existing?.secondary_stack || []);
    const bio = data.bio !== undefined ? data.bio : existing?.bio || '';
    const city = data.city !== undefined ? data.city : existing?.city || null;
    const state = data.state !== undefined ? data.state : existing?.state || null;

    const stmt = db.prepare(`
      INSERT INTO candidate_profiles (user_id, target_role, seniority, expected_salary, preferred_work_models, skills, primary_stack, secondary_stack, bio, city, state, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        target_role = excluded.target_role,
        seniority = excluded.seniority,
        expected_salary = excluded.expected_salary,
        preferred_work_models = excluded.preferred_work_models,
        skills = excluded.skills,
        primary_stack = excluded.primary_stack,
        secondary_stack = excluded.secondary_stack,
        bio = excluded.bio,
        city = excluded.city,
        state = excluded.state,
        updated_at = excluded.updated_at
    `);

    stmt.run(userId, target_role, seniority, expected_salary, preferred_work_models, skills, primary_stack, secondary_stack, bio, city, state, now);

    // Sincroniza e unifica status de onboarding (REQ-05)
    this.isOnboardingComplete(userId);

    return this.getProfile(userId)!;
  }

  // --- Currículo ---

  saveResume(resume: { id: string; user_id: string; filename: string; file_path: string; file_size: number; file_type: string }): CandidateResume {
    const now = new Date().toISOString();

    // Remove qualquer currículo anterior do mesmo usuário para manter o mais recente
    db.prepare('DELETE FROM candidate_resumes WHERE user_id = ?').run(resume.user_id);

    const stmt = db.prepare(`
      INSERT INTO candidate_resumes (id, user_id, filename, file_path, file_size, file_type, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(resume.id, resume.user_id, resume.filename, resume.file_path, resume.file_size, resume.file_type, now);

    return {
      ...resume,
      uploaded_at: now,
      ai_analysis: null,
      analyzed_at: null,
    };
  }

  getResume(userId: string): CandidateResume | null {
    const stmt = db.prepare('SELECT * FROM candidate_resumes WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1');
    const row = stmt.get(userId) as any;
    if (!row) return null;

    let analysis: CVAnalysisResult | null = null;
    if (row.ai_analysis) {
      try {
        analysis = typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis;
      } catch {
        analysis = null;
      }
    }

    return {
      id: row.id,
      user_id: row.user_id,
      filename: row.filename,
      file_path: row.file_path,
      file_size: row.file_size,
      file_type: row.file_type,
      ai_analysis: analysis,
      analyzed_at: row.analyzed_at || null,
      uploaded_at: row.uploaded_at,
    };
  }

  updateResumeAnalysis(userId: string, analysis: CVAnalysisResult): boolean {
    const now = new Date().toISOString();
    const jsonStr = JSON.stringify(analysis);
    const stmt = db.prepare(`
      UPDATE candidate_resumes 
      SET ai_analysis = ?, analyzed_at = ? 
      WHERE user_id = ?
    `);
    const info = stmt.run(jsonStr, now, userId);
    return info.changes > 0;
  }

  syncSkillsToProfile(
    userId: string,
    newSkills: string[],
    detectedRole?: string,
    detectedSeniority?: string,
    summary?: string,
    primaryStack?: string[],
    secondaryStack?: string[],
    workModel?: string,
    expectedSalary?: string
  ): CandidateProfile {
    const currentProfile = this.getProfile(userId);
    const existingSkills = currentProfile?.skills || [];
    
    // Mescla skills sem duplicar
    const mergedSkills = Array.from(new Set([...existingSkills, ...newSkills]));
    
    const updateData: Partial<CandidateProfile> = {
      skills: mergedSkills,
    };

    if (detectedRole && (!currentProfile?.target_role || currentProfile.target_role.trim() === '')) {
      updateData.target_role = detectedRole;
    }
    if (detectedSeniority && (!currentProfile?.seniority || currentProfile.seniority === 'Júnior')) {
      updateData.seniority = detectedSeniority;
    }
    if (summary && (!currentProfile?.bio || currentProfile.bio.trim() === '')) {
      updateData.bio = summary;
    }
    if (primaryStack && primaryStack.length > 0) {
      const mergedPrimary = Array.from(new Set([...(currentProfile?.primary_stack || []), ...primaryStack]));
      updateData.primary_stack = mergedPrimary;
    }
    if (secondaryStack && secondaryStack.length > 0) {
      const mergedSecondary = Array.from(new Set([...(currentProfile?.secondary_stack || []), ...secondaryStack]));
      updateData.secondary_stack = mergedSecondary;
    }
    if (workModel && (!currentProfile?.preferred_work_models || currentProfile.preferred_work_models.length === 0)) {
      updateData.preferred_work_models = [workModel];
    }
    if (expectedSalary && (!currentProfile?.expected_salary || currentProfile.expected_salary.trim() === '')) {
      updateData.expected_salary = expectedSalary;
    }

    const updated = this.upsertProfile(userId, updateData);

    // Marca onboarding como concluído se os campos essenciais estiverem preenchidos
    if (
      updated.target_role &&
      updated.seniority &&
      updated.primary_stack.length > 0
    ) {
      this.updateOnboardingStatus(userId, true);
    }

    return updated;
  }

  deleteResume(userId: string): boolean {
    const stmt = db.prepare('DELETE FROM candidate_resumes WHERE user_id = ?');
    const info = stmt.run(userId);
    return info.changes > 0;
  }

  // --- Vagas Salvas & Candidaturas ---

  toggleSavedJob(userId: string, jobId: string, status: string = 'saved'): { isSaved: boolean; status: string } {
    const checkStmt = db.prepare('SELECT status FROM user_saved_jobs WHERE user_id = ? AND job_id = ?');
    const existing = checkStmt.get(userId, jobId) as { status: string } | undefined;

    if (existing) {
      if (existing.status === status) {
        // Remove
        db.prepare('DELETE FROM user_saved_jobs WHERE user_id = ? AND job_id = ?').run(userId, jobId);
        return { isSaved: false, status: '' };
      } else {
        // Atualiza status (ex: de saved para applied)
        db.prepare('UPDATE user_saved_jobs SET status = ? WHERE user_id = ? AND job_id = ?').run(status, userId, jobId);
        return { isSaved: true, status };
      }
    } else {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO user_saved_jobs (user_id, job_id, status, created_at) VALUES (?, ?, ?, ?)').run(
        userId,
        jobId,
        status,
        now
      );
      return { isSaved: true, status };
    }
  }

  getSavedJobs(userId: string): SavedJobRecord[] {
    const stmt = db.prepare(`
      SELECT 
        s.user_id,
        s.job_id,
        s.status,
        s.created_at as saved_at,
        j.id as j_id,
        j.title as j_title,
        j.company as j_company,
        j.location as j_location,
        j.url as j_url,
        j.platform as j_platform,
        j.published_at as j_published_at,
        j.score_ia as j_score_ia,
        j.overall_score as j_overall_score
      FROM user_saved_jobs s
      JOIN jobs j ON s.job_id = j.id
      WHERE s.user_id = ?
      ORDER BY j.overall_score DESC, s.created_at DESC
    `);

    const rows = stmt.all(userId) as any[];

    return rows.map((r) => ({
      user_id: r.user_id,
      job_id: r.job_id,
      status: r.status,
      saved_at: r.saved_at,
      job: {
        id: r.j_id,
        title: r.j_title,
        company: r.j_company,
        location: r.j_location,
        url: r.j_url,
        platform: r.j_platform,
        published_at: r.j_published_at,
        score_ia: r.j_score_ia || 0,
        overall_score: r.j_overall_score || 0,
      },
    }));
  }

  updateSavedJobStatus(userId: string, jobId: string, status: string): boolean {
    const stmt = db.prepare('UPDATE user_saved_jobs SET status = ? WHERE user_id = ? AND job_id = ?');
    const result = stmt.run(status, userId, jobId);
    return result.changes > 0;
  }

  // --- Vagas Ocultadas (Multi-tenant) ---

  hideJobs(userId: string, jobIds: string[]): { count: number } {
    if (!jobIds || jobIds.length === 0) return { count: 0 };
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO user_hidden_jobs (user_id, job_id, created_at)
      VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction((ids: string[]) => {
      let inserted = 0;
      for (const id of ids) {
        const res = insertStmt.run(userId, id, now);
        if (res.changes > 0) inserted++;
      }
      return inserted;
    });

    const count = insertMany(jobIds);
    return { count };
  }

  unhideJob(userId: string, jobId: string): boolean {
    const stmt = db.prepare('DELETE FROM user_hidden_jobs WHERE user_id = ? AND job_id = ?');
    const result = stmt.run(userId, jobId);
    return result.changes > 0;
  }

  getHiddenJobIds(userId: string): string[] {
    const stmt = db.prepare('SELECT job_id FROM user_hidden_jobs WHERE user_id = ?');
    const rows = stmt.all(userId) as Array<{ job_id: string }>;
    return rows.map((r) => r.job_id);
  }

  // --- Match Perfeito & Recomendações de Vagas (Fase 38) ---

  getCandidateContext(userId: string): CandidateContext | null {
    const user = this.getUserById(userId);
    if (!user) return null;

    const profile = this.getProfile(userId);
    const resume = this.getResume(userId);

    const profileSkills = profile?.skills || [];
    const resumeSkills = resume?.ai_analysis?.hard_skills || [];
    const combinedSkills = Array.from(new Set([...profileSkills, ...resumeSkills]));

    const targetRole = profile?.target_role || resume?.ai_analysis?.detected_role || 'Desenvolvedor Full Stack';
    const seniority = profile?.seniority || resume?.ai_analysis?.detected_seniority || 'Júnior';
    const preferredWorkModels = profile?.preferred_work_models && profile.preferred_work_models.length > 0
      ? profile.preferred_work_models
      : ['Remoto'];

    return {
      userId,
      targetRole,
      seniority,
      expectedSalary: profile?.expected_salary || null,
      preferredWorkModels,
      skills: combinedSkills,
      bio: profile?.bio || resume?.ai_analysis?.summary || null,
      city: profile?.city || null,
      state: profile?.state || null,
    };
  }

  getRecommendedJobs(
    userId: string,
    options?: {
      minScore?: number;
      search?: string;
      workModel?: string;
      platform?: string;
      limit?: number;
      offset?: number;
    }
  ): {
    totalCount: number;
    candidate: CandidateContext | null;
    items: Array<{
      job: any;
      match: {
        jobId: string;
        overallScore: number;
        stackScore: number;
        roleScore: number;
        seniorityScore: number;
        locationScore: number;
        matchedSkills: string[];
        missingSkills: string[];
        matchReasoning: string;
        isStrongMatch: boolean;
      };
      isSaved: boolean;
    }>;
  } {
    const candidate = this.getCandidateContext(userId);
    if (!candidate) {
      return { totalCount: 0, candidate: null, items: [] };
    }

    // Busca vagas ativas recentes no SQLite
    const stmt = db.prepare(`
      SELECT 
        id, url, title, company, platform, description, published_at, location, 
        overall_score, score_ia, application_status
      FROM jobs
      ORDER BY published_at DESC, created_at DESC
      LIMIT 1000
    `);

    const rawJobs = stmt.all() as any[];

    const matcher = new CandidateMatcher();

    // Vagas já salvas pelo usuário
    const savedJobs = this.getSavedJobs(userId);
    const savedJobIds = new Set(savedJobs.map((s) => s.job_id));

    // Ranqueia vagas
    const ranked = matcher.rankJobs(rawJobs, candidate, {
      minScore: options?.minScore || 0,
      search: options?.search,
      workModel: options?.workModel,
      platform: options?.platform,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    });

    const items = ranked.map((r: any) => ({
      job: r.job,
      match: r.match,
      isSaved: savedJobIds.has(r.job.id),
    }));

    return {
      totalCount: items.length,
      candidate,
      items,
    };
  }

  getMatchStats(userId: string): {
    totalAnalyzed: number;
    avgScore: number;
    highMatchCount: number; // >= 75
    moderateMatchCount: number; // 50 - 74
    topMatchedSkills: Array<{ skill: string; count: number }>;
  } {
    const candidate = this.getCandidateContext(userId);
    if (!candidate || candidate.skills.length === 0) {
      return {
        totalAnalyzed: 0,
        avgScore: 0,
        highMatchCount: 0,
        moderateMatchCount: 0,
        topMatchedSkills: [],
      };
    }

    const stmt = db.prepare(`
      SELECT id, title, company, platform, description, location
      FROM jobs
      LIMIT 500
    `);
    const rawJobs = stmt.all() as any[];

    const matcher = new CandidateMatcher();

    let totalScore = 0;
    let highCount = 0;
    let moderateCount = 0;
    const skillCounts: Record<string, number> = {};

    for (const job of rawJobs) {
      const match = matcher.calculateMatch(job, candidate);
      totalScore += match.overallScore;
      if (match.overallScore >= 75) highCount++;
      else if (match.overallScore >= 50) moderateCount++;

      for (const skill of match.matchedSkills) {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      }
    }

    const avgScore = rawJobs.length > 0 ? Math.round(totalScore / rawJobs.length) : 0;
    const topMatchedSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalAnalyzed: rawJobs.length,
      avgScore,
      highMatchCount: highCount,
      moderateMatchCount: moderateCount,
      topMatchedSkills,
    };
  }
}
