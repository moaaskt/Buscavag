'use client';

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Sidebar Lateral */}
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Conteúdo Principal com margem dinâmica */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Top Header com atalhos e acionamento mobile */}
        <AppHeader onOpenMobile={() => setMobileOpen(true)} />

        {/* Corpo da página com espaçamento otimizado */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Rodapé Minimalista */}
        <footer className="border-t border-zinc-200/60 dark:border-zinc-800/60 py-6 text-center text-xs text-zinc-500 backdrop-blur-sm">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
            <p>© {new Date().getFullYear()} Buscavag • Inteligência em Vagas Tech & IA</p>
            <p className="text-zinc-400 dark:text-zinc-600">Match Semântico & Monitoramento em Tempo Real</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

