import React from 'react';
import Link from 'next/link';

/**
 * Layout Minimalista Isolado para Autenticação — (auth)
 * Segue as diretrizes estritas da Skill buscavag-design-system:
 * - Zero elementos da navegação autenticada (sem Sidebar, sem AppShell, sem vazamento de perfil).
 * - Superfície neutra e limpa com suporte a temas Claro e Escuro.
 */
export default function AuthBlankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Top Minimal Brand Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-border/60 bg-card/50 backdrop-blur-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold shadow-xs">
            BV
          </span>
          <span>Buscavag</span>
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            Workspace
          </span>
        </Link>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="py-4 px-6 border-t border-border/40 text-center text-xs text-muted-foreground font-mono">
        <span>© {new Date().getFullYear()} Buscavag Personal Workspace • Segurança & Inteligência</span>
      </footer>
    </div>
  );
}

