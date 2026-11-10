'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { WorkspaceSessionResponse } from '@/app/api/workspace/session/route';

interface WorkspaceSessionContextValue {
  session: WorkspaceSessionResponse | null;
  isLoading: boolean;
  error: string | null;
  refetchSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const WorkspaceSessionContext = createContext<WorkspaceSessionContextValue | undefined>(undefined);

export function WorkspaceSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WorkspaceSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/workspace/session', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Falha ao consultar sessão do workspace (${res.status})`);
      }

      const data: WorkspaceSessionResponse = await res.json();
      setSession(data);
    } catch (err: any) {
      console.error('[WorkspaceSessionProvider error]:', err);
      setError(err.message || 'Erro ao carregar sessão');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/workspace/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'sec-fetch-site': 'same-origin',
        },
      });
      // Recarrega o estado de sessão após logout
      await fetchSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('[WorkspaceSessionProvider logout error]:', err);
    }
  }, [fetchSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return (
    <WorkspaceSessionContext.Provider
      value={{
        session,
        isLoading,
        error,
        refetchSession: fetchSession,
        logout,
      }}
    >
      {children}
    </WorkspaceSessionContext.Provider>
  );
}

export function useWorkspaceSession(): WorkspaceSessionContextValue {
  const context = useContext(WorkspaceSessionContext);
  if (!context) {
    throw new Error('useWorkspaceSession deve ser utilizado dentro de um WorkspaceSessionProvider');
  }
  return context;
}

