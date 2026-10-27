import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'buscavag.db');

// Garante que o diretório do banco existe antes de instanciar
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath, { timeout: 10000 });

try {
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 10000');
} catch (err) {
  console.warn('[DB Pragma] Aviso ao configurar pragmas:', (err as Error).message);
}

let isInitialized = false;

export function initDatabase() {
  if (isInitialized) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      platform TEXT NOT NULL,
      description TEXT NOT NULL,
      published_at TEXT NOT NULL,
      location TEXT,
      is_junior_fullstack INTEGER DEFAULT 0,
      score_ia REAL DEFAULT 0,
      overall_score REAL DEFAULT 0,
      stack_score REAL DEFAULT 0,
      seniority_score REAL DEFAULT 0,
      location_score REAL DEFAULT 0,
      category TEXT,
      gaps TEXT,
      resume_tips TEXT,
      application_status TEXT DEFAULT 'pending',
      ai_reasoning TEXT,
      notified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      extracted_role TEXT,
      contract_type TEXT,
      application_channel TEXT,
      salary TEXT,
      direct_contact TEXT,
      required_seniority TEXT,
      tech_stack TEXT,
      work_model TEXT,
      is_tech_software INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      fingerprint TEXT,
      city TEXT,
      state TEXT
    );

    CREATE TABLE IF NOT EXISTS scraper_logs (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      scraper_name TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      tier TEXT DEFAULT 'free',
      role TEXT DEFAULT 'CANDIDATE',
      onboarding_completed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      force_password_change INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candidate_profiles (
      user_id TEXT PRIMARY KEY,
      target_role TEXT,
      seniority TEXT,
      expected_salary TEXT,
      preferred_work_models TEXT,
      skills TEXT,
      primary_stack TEXT,
      secondary_stack TEXT,
      bio TEXT,
      city TEXT,
      state TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidate_resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      ai_analysis TEXT,
      analyzed_at TEXT,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_saved_jobs (
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      status TEXT DEFAULT 'saved',
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, job_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_hidden_jobs (
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, job_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id TEXT,
      metadata TEXT,
      ip TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      nivel TEXT NOT NULL,
      origem TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_tipo ON logs(tipo);
    CREATE INDEX IF NOT EXISTS idx_logs_nivel ON logs(nivel);
    CREATE INDEX IF NOT EXISTS idx_logs_origem ON logs(origem);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

    -- Phase 80: Gestão Financeira & Pagamentos
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      gateway TEXT NOT NULL,
      gateway_payment_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'BRL',
      status TEXT NOT NULL,
      payment_method TEXT,
      plan_tier TEXT DEFAULT 'premium',
      billing_cycle TEXT DEFAULT 'monthly',
      invoice_url TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(gateway);
    CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      gateway TEXT NOT NULL,
      gateway_subscription_id TEXT,
      tier TEXT DEFAULT 'premium',
      billing_cycle TEXT DEFAULT 'monthly',
      status TEXT NOT NULL,
      amount REAL NOT NULL,
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      cancel_at_period_end INTEGER DEFAULT 0,
      canceled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

    CREATE TABLE IF NOT EXISTS payment_webhooks (
      id TEXT PRIMARY KEY,
      gateway TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      processed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_webhooks_gateway ON payment_webhooks(gateway);
    CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON payment_webhooks(created_at DESC);

    -- Phase 85: Módulo B2B & Gestão de Empresas
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      website TEXT,
      industry TEXT,
      description TEXT,
      recruiter_name TEXT,
      recruiter_email TEXT,
      recruiter_phone TEXT,
      plan_tier TEXT DEFAULT 'free',
      status TEXT DEFAULT 'active',
      featured_job_limit INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
    CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
    CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
    CREATE INDEX IF NOT EXISTS idx_companies_plan_tier ON companies(plan_tier);
    CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);

    CREATE TABLE IF NOT EXISTS scraper_configs (
      name TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 1,
      method TEXT NOT NULL,
      target_url TEXT,
      timeout_ms INTEGER DEFAULT 45000,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scraper_configs_enabled ON scraper_configs(is_enabled);
  `);

  // Migração automática para bancos já existentes
  try {
    const existingJobCols = (db.pragma('table_info(jobs)') as Array<{ name: string }>).map((col) => col.name);
    const jobColumnsToAdd: Array<{ name: string; type: string }> = [
      { name: 'overall_score', type: 'REAL DEFAULT 0' },
      { name: 'stack_score', type: 'REAL DEFAULT 0' },
      { name: 'seniority_score', type: 'REAL DEFAULT 0' },
      { name: 'location_score', type: 'REAL DEFAULT 0' },
      { name: 'category', type: 'TEXT' },
      { name: 'gaps', type: 'TEXT' },
      { name: 'resume_tips', type: 'TEXT' },
      { name: 'application_status', type: "TEXT DEFAULT 'pending'" },
      { name: 'extracted_role', type: 'TEXT' },
      { name: 'contract_type', type: 'TEXT' },
      { name: 'application_channel', type: 'TEXT' },
      { name: 'salary', type: 'TEXT' },
      { name: 'direct_contact', type: 'TEXT' },
      { name: 'required_seniority', type: 'TEXT' },
      { name: 'tech_stack', type: 'TEXT' },
      { name: 'work_model', type: 'TEXT' },
      { name: 'is_tech_software', type: 'INTEGER DEFAULT 1' },
      { name: 'status', type: "TEXT DEFAULT 'active'" },
      { name: 'fingerprint', type: 'TEXT' },
      { name: 'city', type: 'TEXT' },
      { name: 'state', type: 'TEXT' },
    ];

    for (const col of jobColumnsToAdd) {
      if (!existingJobCols.includes(col.name)) {
        db.exec(`ALTER TABLE jobs ADD COLUMN ${col.name} ${col.type};`);
      }
    }

    db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);');

    // Garante que registros sem status sejam marcados como 'active'
    db.exec("UPDATE jobs SET status = 'active' WHERE status IS NULL;");

    const existingUserCols = (db.pragma('table_info(users)') as Array<{ name: string }>).map((col) => col.name);
    if (!existingUserCols.includes('role')) {
      db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'CANDIDATE';`);
    }
    if (!existingUserCols.includes('onboarding_completed')) {
      db.exec(`ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0;`);
    }
    if (!existingUserCols.includes('status')) {
      db.exec(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';`);
    }
    if (!existingUserCols.includes('force_password_change')) {
      db.exec(`ALTER TABLE users ADD COLUMN force_password_change INTEGER DEFAULT 0;`);
    }
    db.exec("UPDATE users SET status = 'active' WHERE status IS NULL;");

    const existingProfileCols = (db.pragma('table_info(candidate_profiles)') as Array<{ name: string }>).map((col) => col.name);
    const profileColumnsToAdd: Array<{ name: string; type: string }> = [
      { name: 'primary_stack', type: 'TEXT' },
      { name: 'secondary_stack', type: 'TEXT' },
      { name: 'city', type: 'TEXT' },
      { name: 'state', type: 'TEXT' },
    ];

    for (const col of profileColumnsToAdd) {
      if (!existingProfileCols.includes(col.name)) {
        db.exec(`ALTER TABLE candidate_profiles ADD COLUMN ${col.name} ${col.type};`);
      }
    }

    const existingResumeCols = (db.pragma('table_info(candidate_resumes)') as Array<{ name: string }>).map((col) => col.name);
    const resumeColumnsToAdd: Array<{ name: string; type: string }> = [
      { name: 'ai_analysis', type: 'TEXT' },
      { name: 'analyzed_at', type: 'TEXT' },
    ];

    for (const col of resumeColumnsToAdd) {
      if (!existingResumeCols.includes(col.name)) {
        db.exec(`ALTER TABLE candidate_resumes ADD COLUMN ${col.name} ${col.type};`);
      }
    }
  } catch (err) {
    console.warn('[DB Migration] Aviso ao verificar colunas:', (err as Error).message);
  }

  // Configuração segura de auto_vacuum = INCREMENTAL para gestão enxuta de disco na VPS
  try {
    const currentAutoVacuum = db.pragma('auto_vacuum', { simple: true });
    if (currentAutoVacuum === 0) {
      db.pragma('auto_vacuum = INCREMENTAL');
      db.exec('VACUUM');
    }
  } catch (err) {
    console.warn('[DB Pragma] Aviso ao verificar auto_vacuum:', (err as Error).message);
  }

  // Seed da retenção de vagas em admin_settings
  try {
    const retentionSetting = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get('job_retention_days');
    if (!retentionSetting) {
      db.prepare('INSERT INTO admin_settings (key, value, updated_at) VALUES (?, ?, ?)').run(
        'job_retention_days',
        '21',
        new Date().toISOString()
      );
    }
  } catch (err) {
    console.warn('[DB Seed] Aviso ao verificar job_retention_days:', (err as Error).message);
  }

  // Criação segura de índices após migrações
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform);
      CREATE INDEX IF NOT EXISTS idx_jobs_notified ON jobs(notified);
      CREATE INDEX IF NOT EXISTS idx_jobs_app_status ON jobs(application_status);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
      CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);
      CREATE INDEX IF NOT EXISTS idx_logs_run_id ON scraper_logs(run_id);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON scraper_logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_scraper_name ON scraper_logs(scraper_name);
      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON scraper_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
      CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON candidate_resumes(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON user_saved_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_hidden_jobs_user ON user_hidden_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
      CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
    `);
  } catch (err) {
    console.warn('[DB Migration] Aviso ao criar índices:', (err as Error).message);
  }

  isInitialized = true;
}
