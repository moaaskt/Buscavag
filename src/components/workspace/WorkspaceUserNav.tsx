'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWorkspaceSession } from './WorkspaceSessionContext';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  UserIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  LogOutIcon,
  ExternalLinkIcon,
  LogInIcon,
} from 'lucide-react';

export function WorkspaceUserNav() {
  const { session, logout, isLoading } = useWorkspaceSession();
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
  }

  // Estado Anônimo / Não Autenticado
  if (!session || !session.authenticated || !session.activeProfile) {
    if (session?.identityConflict) {
      return (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConflictDialogOpen(true)}
            className="h-8 gap-1.5 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium"
          >
            <ShieldAlertIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Resolver Conflito</span>
          </Button>
          <ConflictResolutionDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen} />
        </>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <LogInIcon className="h-3.5 w-3.5" />
            <span>Entrar</span>
          </Button>
        </Link>
      </div>
    );
  }

  const { activeProfile } = session;
  const initials = activeProfile.name
    ? activeProfile.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const isAdmin = activeProfile.role === 'ADMIN';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button
            variant="ghost"
            size="sm"
            className="relative h-8 w-8 rounded-full border border-border/80 bg-muted/60 p-0 hover:bg-muted"
            aria-label="Menu do usuário"
          >
            <span className="text-xs font-semibold text-foreground">{initials}</span>
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-56 p-1.5">
          <DropdownMenuLabel className="font-normal p-2">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold leading-none text-foreground truncate">
                  {activeProfile.name}
                </p>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${
                    isAdmin
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Candidato'}
                </span>
              </div>
              <p className="text-[11px] leading-none text-muted-foreground truncate">
                {activeProfile.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isAdmin ? (
            <DropdownMenuItem render={
              <Link href="/admin" className="flex items-center justify-between w-full text-xs">
                <span className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-amber-500" />
                  Painel Admin Legado
                </span>
                <ExternalLinkIcon className="h-3 w-3 text-muted-foreground" />
              </Link>
            } />
          ) : (
            <DropdownMenuItem render={
              <Link href="/candidate" className="flex items-center justify-between w-full text-xs">
                <span className="flex items-center gap-2">
                  <UserIcon className="h-3.5 w-3.5 text-primary" />
                  Painel Candidato Legado
                </span>
                <ExternalLinkIcon className="h-3 w-3 text-muted-foreground" />
              </Link>
            } />
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout()}
            className="text-xs text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer gap-2"
          >
            <LogOutIcon className="h-3.5 w-3.5" />
            <span>Encerrar Sessão</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConflictResolutionDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen} />
    </>
  );
}

