'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Sparkles, Bell, Search } from 'lucide-react';

interface AppHeaderProps {
  onOpenMobile: () => void;
}

export function AppHeader({ onOpenMobile }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Botão de abrir menu no Mobile */}
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50"
          title="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ● Radar Ativo
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden md:inline">
            | Monitoramento em tempo real
          </span>
        </div> */}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/jobs"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <span>Pesquisar oportunidades...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-zinc-800 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-400">
            /
          </kbd>
        </Link>

        <Link
          href="/candidate?tab=recommended"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Match IA</span>
        </Link>
      </div>
    </header>
  );
}

