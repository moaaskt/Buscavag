import { db, initDatabase } from './index';
import crypto from 'crypto';
import { hashPassword } from '@/lib/auth';

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  totp_secret: string | null;
  totp_enabled: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface AdminSession {
  id: string;
  admin_user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

export interface CreateAdminUserDTO {
  id?: string;
  email: string;
  password_hash: string;
  name: string;
  totp_secret?: string | null;
  totp_enabled?: number;
}

export interface CreateAdminSessionDTO {
  id?: string;
  admin_user_id: string;
  token_hash: string;
  ip_address?: string | null;
  user_agent?: string | null;
  expires_at: string;
}

export class AdminRepository {
  constructor() {
    initDatabase();
  }

  getAdminByEmail(email: string): AdminUser | null {
    const stmt = db.prepare('SELECT * FROM admin_users WHERE LOWER(email) = LOWER(?)');
    return (stmt.get(email.trim()) as AdminUser) || null;
  }

  getAdminById(id: string): AdminUser | null {
    const stmt = db.prepare('SELECT * FROM admin_users WHERE id = ?');
    return (stmt.get(id) as AdminUser) || null;
  }

  createAdminUser(data: CreateAdminUserDTO): AdminUser {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, name, totp_secret, totp_enabled, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);
    stmt.run(
      id,
      data.email.trim().toLowerCase(),
      data.password_hash,
      data.name.trim(),
      data.totp_secret || null,
      data.totp_enabled ? 1 : 0,
      now,
      now
    );

    return this.getAdminById(id)!;
  }

  updateAdminTotp(id: string, secret: string | null, enabled: boolean): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE admin_users
      SET totp_secret = ?, totp_enabled = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(secret, enabled ? 1 : 0, now, id);
  }

  updateLastLogin(id: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE admin_users
      SET last_login_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, now, id);
  }

  createSession(data: CreateAdminSessionDTO): AdminSession {
    const id = data.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO admin_sessions (id, admin_user_id, token_hash, ip_address, user_agent, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.admin_user_id,
      data.token_hash,
      data.ip_address || null,
      data.user_agent || null,
      data.expires_at,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM admin_sessions WHERE id = ?');
    return selectStmt.get(id) as AdminSession;
  }

  /**
   * Rotaciona uma sessão administrativa atomicamente dentro de uma única transação SQLite.
   * Se a deleção da sessão anterior ou inserção da nova falhar, tudo sofre rollback automático.
   */
  rotateSessionAtomic(oldSessionId: string, newSessionData: CreateAdminSessionDTO): AdminSession {
    const rotateTx = db.transaction(() => {
      // 1. Revoga a sessão antiga
      const delStmt = db.prepare('DELETE FROM admin_sessions WHERE id = ?');
      delStmt.run(oldSessionId);

      // 2. Insere a nova sessão
      const newId = newSessionData.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const insStmt = db.prepare(`
        INSERT INTO admin_sessions (id, admin_user_id, token_hash, ip_address, user_agent, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insStmt.run(
        newId,
        newSessionData.admin_user_id,
        newSessionData.token_hash,
        newSessionData.ip_address || null,
        newSessionData.user_agent || null,
        newSessionData.expires_at,
        now
      );

      const selectStmt = db.prepare('SELECT * FROM admin_sessions WHERE id = ?');
      return selectStmt.get(newId) as AdminSession;
    });

    return rotateTx();
  }

  getSessionByTokenHash(tokenHash: string): AdminSession | null {
    const stmt = db.prepare('SELECT * FROM admin_sessions WHERE token_hash = ?');
    return (stmt.get(tokenHash) as AdminSession) || null;
  }

  touchSession(sessionId: string, newExpiresAt: string): void {
    const stmt = db.prepare('UPDATE admin_sessions SET expires_at = ? WHERE id = ?');
    stmt.run(newExpiresAt, sessionId);
  }

  revokeSession(sessionId: string): void {
    const stmt = db.prepare('DELETE FROM admin_sessions WHERE id = ?');
    stmt.run(sessionId);
  }

  revokeSessionByTokenHash(tokenHash: string): void {
    const stmt = db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?');
    stmt.run(tokenHash);
  }

  revokeAllSessionsForUser(adminUserId: string): void {
    const stmt = db.prepare('DELETE FROM admin_sessions WHERE admin_user_id = ?');
    stmt.run(adminUserId);
  }

  getSetting(key: string, defaultValue: string | null = null): string | null {
    const stmt = db.prepare('SELECT value FROM admin_settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : defaultValue;
  }

  setSetting(key: string, value: string): void {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO admin_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    stmt.run(key, value, now);
  }

  ensureSeedAdmin(): AdminUser {
    const defaultEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@buscavag.com.br';
    let admin = this.getAdminByEmail(defaultEmail);

    if (!admin) {
      const defaultPass = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456';
      const defaultName = process.env.ADMIN_INITIAL_NAME || 'Administrador BuscaVag';

      const passwordHash = hashPassword(defaultPass);
      admin = this.createAdminUser({
        email: defaultEmail,
        password_hash: passwordHash,
        name: defaultName,
        totp_enabled: 0,
      });

      // Define configuração inicial de 2FA
      if (this.getSetting('totp_enabled') === null) {
        this.setSetting('totp_enabled', 'false');
      }
    }

    return admin;
  }
}
