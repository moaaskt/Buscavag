'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WORKSPACE_NAV_GROUPS, type WorkspaceNavItem } from '@/configs/workspaceNavConfig';
import { useWorkspaceSession } from './WorkspaceSessionContext';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import {
  CompassIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  ExternalLinkIcon,
  LockIcon,
  LogOutIcon,
  ChevronsUpDownIcon,
  LogInIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const { session, logout, isLoading } = useWorkspaceSession();
  const { isMobile, setOpenMobile } = useSidebar();
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  const canAccessAdmin = session?.canAccessAdminViews ?? false;
  const isConflict = session?.identityConflict ?? false;
  const activeProfile = session?.activeProfile;

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const initials = activeProfile?.name
    ? activeProfile.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <Sidebar collapsible="icon" className="border-r border-border/80 bg-sidebar">
      {/* 1. SidebarHeader com Marca Buscavag */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/workspace" onClick={handleLinkClick} />}
              tooltip="Buscavag Personal Workspace v25.0"
              className="gap-2.5 outline-none hover:bg-sidebar-accent focus-visible:ring-1"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
                <CompassIcon className="size-4" />
              </div>
              <div className="flex flex-col items-start min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-1.5 w-full">
                  <span className="font-bold text-sm tracking-tight text-sidebar-foreground truncate">
                    Buscavag
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                    v25.0
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground truncate">
                  Personal Workspace
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 2. SidebarContent com os 5 Grupos de Navegação */}
      <SidebarContent>
        {WORKSPACE_NAV_GROUPS.map((group, groupIndex) => {
          const isGroupLocked = group.adminOnly && !canAccessAdmin;

          return (
            <React.Fragment key={group.id}>
              {groupIndex === 1 && <SidebarSeparator className="my-1.5" />}
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center justify-between">
                  <span className="truncate">{group.title}</span>
                  {isGroupLocked && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-normal px-1 py-0.2 rounded bg-muted/80 text-muted-foreground/90 border border-border/50">
                      <LockIcon className="size-2.5" />
                      Admin
                    </span>
                  )}
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item: WorkspaceNavItem) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== '/workspace' && pathname.startsWith(item.href));
                      const IconComponent = item.icon;
                      const tooltipText = isGroupLocked
                        ? `${item.title} (Acesso Restrito - Admin)`
                        : item.title;

                      if (isGroupLocked) {
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              tooltip={tooltipText}
                              className="text-sidebar-foreground/60 cursor-not-allowed hover:bg-muted/30 transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                              }}
                            >
                              <IconComponent className="size-4 shrink-0 text-muted-foreground/70" />
                              <span className="truncate flex-1 text-sidebar-foreground/70">
                                {item.title}
                              </span>
                              <LockIcon className="size-3 text-muted-foreground/50 shrink-0 group-data-[collapsible=icon]:hidden" />
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      }

                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            render={<Link href={item.href} onClick={handleLinkClick} />}
                            isActive={isActive}
                            tooltip={tooltipText}
                            className={cn(
                              'transition-colors',
                              isActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                          >
                            <IconComponent className="size-4 shrink-0" />
                            <span className="truncate flex-1">{item.title}</span>
                            {item.badge && (
                              <SidebarMenuBadge>
                                {item.badge}
                              </SidebarMenuBadge>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </React.Fragment>
          );
        })}

        {/* Alerta Discreto de RBAC (Visível apenas expandido) */}
        {!canAccessAdmin && !isConflict && (
          <div className="mx-2 mt-2 p-2.5 rounded-lg border border-border/60 bg-muted/30 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden max-w-[240px] break-words">
            <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
              <LockIcon className="size-3.5 text-muted-foreground shrink-0" />
              <span>Acesso Administrativo</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Módulos de coleta, scrapers e mensageria exigem sessão administrativa verificada no servidor.
            </p>
          </div>
        )}

        {/* Indicador de Conflito de Identidade */}
        {isConflict && (
          <div className="mx-2 mt-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200 group-data-[collapsible=icon]:hidden max-w-[240px] break-words">
            <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300 mb-1">
              <ShieldAlertIcon className="size-3.5 text-amber-500 shrink-0" />
              <span>Conflito Detectado</span>
            </div>
            <p className="text-[10px] leading-relaxed mb-2">
              Defina a identidade ativa para liberar visualizações protegidas.
            </p>
            <button
              type="button"
              onClick={() => setConflictDialogOpen(true)}
              className="text-[10px] font-semibold underline text-amber-700 dark:text-amber-300 hover:text-amber-900"
            >
              Resolver Agora
            </button>
          </div>
        )}
      </SidebarContent>

      {/* 3. SidebarFooter com Menu do Usuário Oficial */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isLoading ? (
              <div className="flex items-center gap-2 p-2">
                <div className="size-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1 group-data-[collapsible=icon]:hidden">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-2.5 w-14 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ) : session?.authenticated && activeProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      tooltip={activeProfile.name}
                      className="gap-2.5 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/70 text-foreground font-semibold text-xs">
                    {initials}
                  </div>
                  <div className="flex flex-col items-start min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="text-xs font-semibold text-foreground truncate w-full text-left">
                      {activeProfile.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate w-full text-left">
                      {activeProfile.role === 'ADMIN' ? 'Administrador' : 'Candidato'}
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  side="right"
                  align="end"
                  className="w-56 p-1.5"
                >
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold leading-none text-foreground truncate">
                          {activeProfile.name}
                        </p>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wide uppercase ${
                            activeProfile.role === 'ADMIN'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
                          {activeProfile.role}
                        </span>
                      </div>
                      <p className="text-[11px] leading-none text-muted-foreground truncate">
                        {activeProfile.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    render={
                      <Link
                        href={canAccessAdmin ? '/admin' : '/candidate'}
                        onClick={handleLinkClick}
                        className="flex items-center gap-2 cursor-pointer"
                      />
                    }
                  >
                    <ExternalLinkIcon className="size-3.5" />
                    <span>{canAccessAdmin ? 'Painel Admin Legado' : 'Portal Candidato Legado'}</span>
                  </DropdownMenuItem>

                  {session?.identityConflict && (
                    <DropdownMenuItem
                      onClick={() => setConflictDialogOpen(true)}
                      className="flex items-center gap-2 text-amber-600 dark:text-amber-400 cursor-pointer"
                    >
                      <ShieldAlertIcon className="size-3.5" />
                      <span>Resolver Conflito de Sessões</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  >
                    <LogOutIcon className="size-3.5" />
                    <span>Encerrar Sessão</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton
                render={<Link href="/login" onClick={handleLinkClick} />}
                tooltip="Fazer Login"
                size="lg"
                className="gap-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <LogInIcon className="size-4" />
                </div>
                <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                  <span className="text-xs font-semibold text-foreground">Sessão Anônima</span>
                  <span className="text-[10px] text-primary">Fazer Login →</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* 4. SidebarRail Oficial */}
      <SidebarRail />

      <ConflictResolutionDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen} />
    </Sidebar>
  );
}
