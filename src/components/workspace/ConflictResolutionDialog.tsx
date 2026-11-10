'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWorkspaceSession } from './WorkspaceSessionContext';
import {
  ShieldAlertIcon,
  UserCheckIcon,
  KeyRoundIcon,
  LogOutIcon,
  Loader2Icon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from 'lucide-react';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConflictResolutionDialog({ open, onOpenChange }: ConflictResolutionDialogProps) {
  const { session, refetchSession } = useWorkspaceSession();

  const [activeTab, setActiveTab] = useState<'overview' | 'choose_admin'>('overview');
  const [adminPassword, setAdminPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setActiveTab('overview');
    setAdminPassword('');
    setTotpCode('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleChooseCandidate = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch('/api/workspace/resolve-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify({ action: 'choose_candidate' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Erro ao resolver identidade como candidato');
      }

      setSuccessMsg('Sessão administrativa revogada com sucesso! Liberando contexto de candidato...');
      await refetchSession();
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar resolução');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChooseAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setErrorMsg('Informe sua senha administrativa');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch('/api/workspace/resolve-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify({
          action: 'choose_admin',
          password: adminPassword,
          totpCode: totpCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Falha ao revalidar sessão administrativa');
      }

      setSuccessMsg('Sessão administrativa revalidada com sucesso! Cookie comum desconectado.');
      await refetchSession();
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao revalidar administrador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTerminateAll = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch('/api/workspace/resolve-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'sec-fetch-site': 'same-origin',
        },
        body: JSON.stringify({ action: 'terminate_all' }),
      });

      const data = await res.json();
      setSuccessMsg(data.message || 'Todas as sessões foram encerradas com segurança.');
      await refetchSession();
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao encerrar sessões');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTotpEnabled = session?.sessions.admin.totpEnabled ?? false;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!isSubmitting) {
          resetForm();
          onOpenChange(val);
        }
      }}
    >
      <DialogContent className="sm:max-w-md border-border/80 bg-card p-6 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <ShieldAlertIcon className="h-5 w-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">Segurança de Sessão</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Resolução de Identidade Concorrente
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Duas sessões ativas distintas coexistem neste navegador. Para evitar vazamento de privilégios ou ações
            ambíguas, selecione com qual identidade você deseja prosseguir.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeTab === 'overview' ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sessão Comum (Candidato):</span>
                <span className="font-mono font-medium text-foreground">
                  {session?.sessions.candidate.userId ? `ID: ${session.sessions.candidate.userId.slice(0, 12)}...` : 'Ativa'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-muted-foreground">Sessão Administrativa:</span>
                <span className="font-mono font-medium text-foreground">
                  {session?.sessions.admin.adminId ? `ID: ${session.sessions.admin.adminId.slice(0, 12)}...` : 'Ativa'}
                  {isTotpEnabled ? ' (2FA Ativo)' : ''}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-3 h-11 border-border/80 hover:bg-accent"
                onClick={handleChooseCandidate}
                disabled={isSubmitting}
              >
                <UserCheckIcon className="h-4 w-4 text-emerald-500" />
                <div className="text-left">
                  <div className="text-xs font-semibold">Continuar como Candidato</div>
                  <div className="text-[11px] text-muted-foreground">Revoga a sessão administrativa no SQLite</div>
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-3 h-11 border-border/80 hover:bg-accent"
                onClick={() => {
                  setErrorMsg(null);
                  setActiveTab('choose_admin');
                }}
                disabled={isSubmitting}
              >
                <KeyRoundIcon className="h-4 w-4 text-amber-500" />
                <div className="text-left">
                  <div className="text-xs font-semibold">Continuar como Administrador</div>
                  <div className="text-[11px] text-muted-foreground">Exige confirmação de senha {isTotpEnabled ? '+ 2FA' : ''}</div>
                </div>
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleTerminateAll}
                disabled={isSubmitting}
              >
                <LogOutIcon className="h-4 w-4" />
                <span className="text-xs">Encerrar todas as sessões e sair</span>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleChooseAdmin} className="space-y-4 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Senha Administrativa
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Sua senha de administrador"
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoFocus
                />
              </div>

              {isTotpEnabled && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Código 2FA / TOTP (6 dígitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    disabled={isSubmitting}
                    className="w-full font-mono text-center tracking-widest rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setActiveTab('overview')}
                disabled={isSubmitting}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1 text-xs font-medium"
                disabled={isSubmitting || !adminPassword.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Confirmar Identidade Admin'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

