'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWorkspaceSession } from '@/components/workspace/WorkspaceSessionContext';
import { WORKSPACE_NAV_GROUPS, type WorkspaceNavItem } from '@/configs/workspaceNavConfig';
import { Button } from '@/components/ui/button';
import { ConflictResolutionDialog } from '@/components/workspace/ConflictResolutionDialog';
import {
  CompassIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  UserCheckIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  SparklesIcon,
  LockIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WorkspaceHubPage() {
  const { session, isLoading } = useWorkspaceSession();
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  const canAccessAdmin = session?.canAccessAdminViews ?? false;
  const isConflict = session?.identityConflict ?? false;

  return (
    <div className="space-y-8 pb-12">
      {/* Hero / Apresentação do Workspace */}
      <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span>Personal Workspace v25.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ambiente Unificado de Operação & Carreira
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Centralização dos 5 pilares do Buscavag em um único shell. Monitoramento de vagas, scrapers autônomos,
              inteligência de mercado e mensageria sob governança unificada.
            </p>
          </div>

          {/* Card de Status da Sessão */}
          <div className="shrink-0 rounded-lg border border-border/70 bg-muted/30 p-4 sm:min-w-64 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Identidade do Contexto
            </div>
            {isLoading ? (
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            ) : isConflict ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <ShieldAlertIcon className="h-4 w-4" />
                  <span>Conflito Detectado</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConflictDialogOpen(true)}
                  className="w-full text-xs h-7 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                >
                  Resolver Conflito
                </Button>
              </div>
            ) : session?.authenticated && session.activeProfile ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {canAccessAdmin ? (
                    <ShieldCheckIcon className="h-4 w-4 text-amber-500" />
                  ) : (
                    <UserCheckIcon className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-xs font-bold text-foreground">
                    {session.activeProfile.name}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Perfil: {session.activeProfile.role} ({canAccessAdmin ? 'Acesso Total' : 'Candidato'})
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Sessão Anônima (Convidado)</div>
                <Link href="/login">
                  <Button size="sm" className="w-full text-xs h-7">
                    Fazer Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grade dos 5 Pilares de Navegação */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">Pilares do Workspace</h2>
            <p className="text-xs text-muted-foreground">Navegue pelas cinco áreas fundamentais da plataforma</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {WORKSPACE_NAV_GROUPS.map((group) => {
            const isGroupLocked = group.adminOnly && !canAccessAdmin;
            const isFeatured = group.id === 'carreira';

            return (
              <div
                key={group.id}
                className={cn(
                  'rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between bg-card',
                  isFeatured ? 'md:col-span-2 lg:col-span-2' : 'col-span-1',
                  isGroupLocked
                    ? 'border-border/70'
                    : 'border-border/80 hover:border-border hover:shadow-sm'
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </span>
                    {isGroupLocked ? (
                      <span className="inline-flex items-center gap-1 rounded bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/60">
                        <LockIcon className="h-2.5 w-2.5 text-muted-foreground" />
                        Acesso Restrito
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                        {group.items.length} módulos
                      </span>
                    )}
                  </div>

                  <div
                    className={cn(
                      'gap-2.5',
                      isFeatured
                        ? 'grid grid-cols-1 sm:grid-cols-3'
                        : 'flex flex-col space-y-1.5'
                    )}
                  >
                    {group.items.map((item: WorkspaceNavItem) => {
                      const ItemIcon = item.icon;

                      if (isGroupLocked) {
                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg text-xs bg-muted/20 border border-border/30 cursor-default select-none"
                          >
                            <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground/70 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-foreground/85 flex items-center justify-between">
                                <span className="truncate">{item.title}</span>
                                {item.badge && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-normal">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={cn(
                            'flex items-start gap-2.5 p-2.5 rounded-lg text-xs transition-colors',
                            isFeatured
                              ? 'bg-muted/30 border border-border/50 hover:bg-accent/80 hover:border-border text-foreground'
                              : 'hover:bg-accent/80 text-foreground'
                          )}
                        >
                          <ItemIcon className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold flex items-center justify-between">
                              <span className="truncate">{item.title}</span>
                              {item.badge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-normal">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50 mt-4 flex items-center justify-between">
                  {isGroupLocked ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <LockIcon className="h-3 w-3 text-muted-foreground/70" />
                      Requer credencial de administrador
                    </span>
                  ) : (
                    <>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Área Liberada
                      </span>
                      <Link
                        href={group.items[0]?.href || '/workspace'}
                        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span>Acessar {group.title}</span>
                        <ArrowRightIcon className="h-3 w-3" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConflictResolutionDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen} />
    </div>
  );
}
