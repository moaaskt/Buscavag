'use client';

import React, { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from './ThemeToggle';
import { WorkspaceUserNav } from './WorkspaceUserNav';
import { useWorkspaceSession } from './WorkspaceSessionContext';
import { ShieldAlertIcon } from 'lucide-react';

const PATH_LABELS: Record<string, string> = {
  workspace: 'Workspace',
  carreira: 'Minha Carreira',
  kanban: 'Kanban',
  perfil: 'Perfil & Currículo',
  operacao: 'Operação e Coleta',
  scrapers: 'Central de Scrapers',
  terminal: 'Terminal SSE',
  config: 'Configurações',
  inteligencia: 'Inteligência',
  vagas: 'Banco de Vagas',
  empresas: 'Empresas',
  logs: 'Logs do Sistema',
  comunicacao: 'Comunicação',
  canais: 'Canais Telegram & WhatsApp',
  gestao: 'Configurações e Gestão',
  usuarios: 'Usuários & RBAC',
  pagamentos: 'Assinaturas & Planos',
  metricas: 'Métricas da Plataforma',
};

export function WorkspaceHeader() {
  const pathname = usePathname();
  const { session } = useWorkspaceSession();

  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-border/80 bg-background/95 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex flex-1 items-center gap-3 sm:gap-4 overflow-hidden">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4 hidden sm:block" />

        <Breadcrumb className="hidden sm:block overflow-hidden">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink href="/workspace">
                Workspace
              </BreadcrumbLink>
            </BreadcrumbItem>

            {segments.length > 1 && <BreadcrumbSeparator />}

            {segments.slice(1).map((segment, index) => {
              const isLast = index === segments.length - 2;
              const href = '/' + segments.slice(0, index + 2).join('/');
              const label = PATH_LABELS[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

              return (
                <Fragment key={href}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="font-medium text-foreground">{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {session?.identityConflict && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <ShieldAlertIcon className="h-3 w-3 text-amber-500" />
            Conflito de Sessões
          </span>
        )}

        <ThemeToggle />
        <Separator orientation="vertical" className="h-4" />
        <WorkspaceUserNav />
      </div>
    </header>
  );
}
