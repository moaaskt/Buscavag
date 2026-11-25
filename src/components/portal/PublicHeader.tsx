'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/workspace/ThemeToggle';
import { Separator } from '@/components/ui/separator';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PublicHeader() {
  const pathname = usePathname() ?? '';

  const isVagasActive = pathname === '/vagas' || pathname.startsWith('/vagas/');
  const isSobreActive = pathname === '/sobre';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link
            href="/vagas"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md shrink-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold shadow-xs">
              BV
            </span>
            <span>Buscavag</span>
          </Link>

          <nav aria-label="Navegação principal" className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Link
              href="/vagas"
              aria-current={isVagasActive ? 'page' : undefined}
              className={cn(
                'px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                isVagasActive
                  ? 'text-foreground bg-muted/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              Vagas
            </Link>
            <Link
              href="/sobre"
              aria-current={isSobreActive ? 'page' : undefined}
              className={cn(
                'px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                isSobreActive
                  ? 'text-foreground bg-muted/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              Sobre
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <ThemeToggle />
          <Separator orientation="vertical" className="h-4" />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'text-muted-foreground hover:text-foreground'
            )}
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
