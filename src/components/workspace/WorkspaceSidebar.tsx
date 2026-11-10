'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { WORKSPACE_NAV_GROUPS, type WorkspaceNavItem } from '@/configs/workspaceNavConfig';
import { useWorkspaceSession } from './WorkspaceSessionContext';
import {
  CompassIcon,
  ShieldAlertIcon,
  ExternalLinkIcon,
  LockIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const { session } = useWorkspaceSession();
  const { isMobile, setOpenMobile } = useSidebar();

  const canAccessAdmin = session?.canAccessAdminViews ?? false;
  const isConflict = session?.identityConflict ?? false;

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/80 bg-sidebar">
      {/* Header com Logotipo e Versão */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link
          href="/workspace"
          onClick={handleLinkClick}
          className="flex items-center gap-2.5 outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring rounded-md"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
            <CompassIcon className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-sidebar-foreground truncate">Buscavag</span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                v25.0
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">Personal Workspace</span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Conteúdo com os 5 Grupos de Navegação */}
      <SidebarContent className="px-2 py-3 space-y-3">
        {WORKSPACE_NAV_GROUPS.map((group, groupIndex) => {
          const isGroupLocked = group.adminOnly && !canAccessAdmin;

          return (
            <React.Fragment key={group.id}>
              {groupIndex === 1 && (
                <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
                  <Separator className="bg-sidebar-border/60" />
                </div>
              )}
              <SidebarGroup className="p-1 space-y-1">
                <SidebarGroupLabel className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 h-6 flex items-center justify-between group-data-[collapsible=icon]:hidden">
                  <span className="truncate">{group.title}</span>
                  {isGroupLocked && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-normal px-1 py-0.2 rounded bg-muted/70 text-muted-foreground/80 border border-border/40">
                      <LockIcon className="h-2.5 w-2.5" />
                      Admin
                    </span>
                  )}
                </SidebarGroupLabel>
                <SidebarMenu>
                  {group.items.map((item: WorkspaceNavItem) => {
                    const isActive = pathname === item.href || (item.href !== '/workspace' && pathname.startsWith(item.href));
                    const IconComponent = item.icon;
                    const tooltipText = isGroupLocked
                      ? `${item.title} (Acesso Restrito - Admin)`
                      : item.title;

                    if (isGroupLocked) {
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            tooltip={tooltipText}
                            className="text-xs font-medium h-8.5 rounded-md text-sidebar-foreground/60 cursor-not-allowed hover:bg-muted/30 hover:text-sidebar-foreground/70 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                            }}
                          >
                            <IconComponent className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                            <span className="truncate flex-1 text-sidebar-foreground/70">{item.title}</span>
                            <LockIcon className="h-3 w-3 text-muted-foreground/50 shrink-0 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={tooltipText}
                          className={cn(
                            'text-xs font-medium h-8.5 rounded-md transition-colors',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          )}
                        >
                          <Link href={item.href} onClick={handleLinkClick}>
                            <IconComponent className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.title}</span>
                            {item.badge && (
                              <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full font-normal bg-muted text-muted-foreground group-data-[collapsible=icon]:hidden">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </React.Fragment>
          );
        })}

        {/* Alerta de RBAC na Sidebar se for candidato */}
        {!canAccessAdmin && !isConflict && (
          <div className="mx-1 p-2.5 rounded-lg border border-border/60 bg-muted/30 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden max-w-[240px] break-words">
            <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
              <LockIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>Acesso Administrativo</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Módulos de coleta, scrapers e mensageria exigem sessão administrativa verificada no servidor.
            </p>
          </div>
        )}

        {/* Indicador de Conflito na Sidebar */}
        {isConflict && (
          <div className="mx-1 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-200 group-data-[collapsible=icon]:hidden max-w-[240px] break-words">
            <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300 mb-1">
              <ShieldAlertIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Conflito Detectado</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              Defina a identidade ativa para liberar visualizações protegidas.
            </p>
          </div>
        )}
      </SidebarContent>

      {/* Footer com Links Legados de Apoio */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="text-xs text-muted-foreground hover:text-foreground h-8"
              tooltip="Acessar Sistema Legado"
            >
              <Link href={canAccessAdmin ? '/admin' : '/candidate'}>
                <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  {canAccessAdmin ? 'Painel Admin Legado' : 'Portal Candidato Legado'}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
