import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAdminSessionUser } from '@/lib/admin-auth';
import { CandidateRepository } from '@/db/candidateRepository';

export const dynamic = 'force-dynamic';

export interface WorkspaceSessionResponse {
  status: 'unauthenticated' | 'authenticated' | 'conflict';
  authenticated: boolean;
  activeProfile: {
    id: string;
    email: string;
    name: string;
    role: 'CANDIDATE' | 'ADMIN' | 'GUEST';
    source: 'candidate_session' | 'admin_session';
  } | null;
  sessions: {
    candidate: {
      active: boolean;
      userId: string | null;
    };
    admin: {
      active: boolean;
      adminId: string | null;
      totpEnabled: boolean;
    };
  };
  canAccessAdminViews: boolean;
  identityConflict: boolean;
}

/**
 * Resolução determinística de identidade do Workspace com autoridade no servidor.
 *
 * Política de Segurança:
 * - Inspeciona separadamente buscavag_session (tabela users, stateless HMAC) e admin_session (tabela admin_users + admin_sessions).
 * - Como não há vínculo canônico verificável entre users e admin_users no banco, a coexistência das duas sessões
 *   é tratada INCONDICIONALMENTE como conflito (status: 'conflict'), mesmo que possuam o mesmo e-mail.
 * - Em estado de conflito, activeProfile é nulo e canAccessAdminViews é bloqueado (false) até resolução explícita.
 * - Minimização de dados: durante conflito, não expõe dados pessoais cruzados (como e-mails ou nomes de ambas as contas).
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verifica sessão de candidato (buscavag_session)
    const candidateTokenSession = await getSessionUser(req);
    let validCandidateUser: {
      id: string;
      email: string;
      name: string;
      role: 'CANDIDATE' | 'ADMIN' | 'GUEST';
    } | null = null;

    if (candidateTokenSession) {
      const candidateRepo = new CandidateRepository();
      const dbUser = candidateRepo.getUserById(candidateTokenSession.userId);
      if (dbUser && dbUser.status === 'active') {
        validCandidateUser = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: (dbUser.role as 'CANDIDATE' | 'ADMIN' | 'GUEST') || 'CANDIDATE',
        };
      }
    }

    // 2. Verifica sessão administrativa (admin_session validada no SQLite admin_sessions)
    // Permite allowConflict: true pois este endpoint é a autoridade de diagnóstico do conflito
    const adminSessionData = await getAdminSessionUser(req, { allowConflict: true });
    const validAdminUser = adminSessionData?.user || null;

    const hasCandidate = Boolean(validCandidateUser);
    const hasAdmin = Boolean(validAdminUser);

    // CENÁRIO D / CONFLITO: Ambas as sessões estão ativas simultaneamente
    if (hasCandidate && hasAdmin) {
      const conflictResponse: WorkspaceSessionResponse = {
        status: 'conflict',
        authenticated: false,
        activeProfile: null,
        sessions: {
          candidate: {
            active: true,
            userId: validCandidateUser!.id,
          },
          admin: {
            active: true,
            adminId: validAdminUser!.id,
            totpEnabled: validAdminUser!.totp_enabled === 1,
          },
        },
        canAccessAdminViews: false,
        identityConflict: true,
      };

      return NextResponse.json(conflictResponse, { status: 200 });
    }

    // CENÁRIO B: Apenas Sessão Administrativa válida
    if (hasAdmin && validAdminUser) {
      const adminResponse: WorkspaceSessionResponse = {
        status: 'authenticated',
        authenticated: true,
        activeProfile: {
          id: validAdminUser.id,
          email: validAdminUser.email,
          name: validAdminUser.name,
          role: 'ADMIN',
          source: 'admin_session',
        },
        sessions: {
          candidate: { active: false, userId: null },
          admin: {
            active: true,
            adminId: validAdminUser.id,
            totpEnabled: validAdminUser.totp_enabled === 1,
          },
        },
        canAccessAdminViews: true,
        identityConflict: false,
      };

      return NextResponse.json(adminResponse, { status: 200 });
    }

    // CENÁRIO A: Apenas Sessão Comum / Candidato válida
    if (hasCandidate && validCandidateUser) {
      const candidateResponse: WorkspaceSessionResponse = {
        status: 'authenticated',
        authenticated: true,
        activeProfile: {
          id: validCandidateUser.id,
          email: validCandidateUser.email,
          name: validCandidateUser.name,
          role: validCandidateUser.role,
          source: 'candidate_session',
        },
        sessions: {
          candidate: { active: true, userId: validCandidateUser.id },
          admin: { active: false, adminId: null, totpEnabled: false },
        },
        canAccessAdminViews: validCandidateUser.role === 'ADMIN',
        identityConflict: false,
      };

      return NextResponse.json(candidateResponse, { status: 200 });
    }

    // CENÁRIO NENHUMA SESSÃO: Anônimo
    const unauthResponse: WorkspaceSessionResponse = {
      status: 'unauthenticated',
      authenticated: false,
      activeProfile: null,
      sessions: {
        candidate: { active: false, userId: null },
        admin: { active: false, adminId: null, totpEnabled: false },
      },
      canAccessAdminViews: false,
      identityConflict: false,
    };

    return NextResponse.json(unauthResponse, { status: 200 });
  } catch (error) {
    console.error('[Workspace Session Error]:', error);
    return NextResponse.json(
      {
        status: 'unauthenticated',
        authenticated: false,
        activeProfile: null,
        canAccessAdminViews: false,
        identityConflict: false,
        error: 'Erro ao verificar sessão do Workspace',
      },
      { status: 500 }
    );
  }
}

