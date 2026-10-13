'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { VelzonSubTabs, SubTabItem } from '@/components/admin/ui/VelzonSubTabs';
import { ScraperLiveTerminal } from '@/components/admin/scrapers/ScraperLiveTerminal';
import {
  Terminal,
  Activity,
  Sliders,
  Radio,
  ArrowLeft,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function AdminScrapersTerminalPage() {
  const scraperSubTabs: SubTabItem[] = useMemo(
    () => [
      { label: 'Painel & Telemetria', href: '/admin/scrapers', icon: Activity },
      { label: 'Terminal SSE Ao Vivo', href: '/admin/scrapers/terminal', icon: Terminal },
      { label: 'Configurações de Conectores', href: '/admin/scrapers/config', icon: Sliders },
    ],
    []
  );

  return (
    <AdminLayout>
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e9ebec] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1 font-mono">
            <Link
              href="/admin/scrapers"
              className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Central de Scrapers
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Terminal SSE</span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-[#405189]" />
            Terminal de Logs SSE em Tempo Real
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Console dedicado de transmissão de eventos ao vivo, telemetria analítica e inspeção profunda de execuções.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
            Stream SSE Ativo (/api/admin/scraper/stream)
          </div>

          <Link
            href="/admin/logs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            Auditoria Global
          </Link>
        </div>
      </div>

      {/* Sub-Navegação por Abas */}
      <div className="mt-4">
        <VelzonSubTabs tabs={scraperSubTabs} />
      </div>

      {/* Console em Tela Cheia Dedicada */}
      <div className="mt-6">
        <ScraperLiveTerminal className="w-full shadow-md" />
      </div>
    </AdminLayout>
  );
}
