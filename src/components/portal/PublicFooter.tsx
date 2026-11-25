import React from 'react';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/80 py-6 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6">
        <span className="font-mono text-center sm:text-left">
          © {new Date().getFullYear()} Buscavag • Catálogo Aberto de Vagas Tech
        </span>

        <nav aria-label="Links institucionais" className="flex items-center gap-4">
          <Link
            href="/vagas"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
          >
            Vagas
          </Link>
          <Link
            href="/sobre"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
          >
            Sobre
          </Link>
          <Link
            href="/login"
            className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
          >
            Entrar
          </Link>
        </nav>
      </div>
    </footer>
  );
}
