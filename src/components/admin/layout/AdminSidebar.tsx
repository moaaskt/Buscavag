'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  ScrollText,
  Users,
  CreditCard,
  Send,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Cpu,
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({ collapsed, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      group: 'Visão Geral',
      items: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      group: 'Operações SaaS',
      items: [
        { name: 'Central de Scrapers', href: '/admin/scrapers', icon: Cpu },
        { name: 'Gestão de Vagas', href: '/admin/vagas', icon: Briefcase },
        { name: 'Empresas B2B', href: '/admin/empresas', icon: Building2 },
        { name: 'Logs & Auditoria', href: '/admin/logs', icon: ScrollText },
        { name: 'Usuários & Acessos', href: '/admin/usuarios', icon: Users },
        { name: 'Financeiro', href: '/admin/pagamentos', icon: CreditCard },
        { name: 'Hub Mensageria', href: '/admin/mensageria', icon: Send },
      ],
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-[#1f2430] text-slate-300 flex flex-col border-r border-slate-800 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-[#1a1e29]">
        <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-[#405189] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            BV
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide text-sm leading-tight flex items-center gap-1.5">
                BuscaVag
                <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Admin
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">v21.0 Enterprise</span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navigation.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1.5">
            {!collapsed && (
              <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400/80 font-mono">
                {group.group}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#405189] text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Portal Shortcut & Security Badge */}
      <div className="p-3 border-t border-slate-800/80 bg-[#1a1e29]/70 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" />
          {!collapsed && <span className="truncate">Portal Público</span>}
        </Link>
        {!collapsed && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate font-mono">admin_session isolada</span>
          </div>
        )}
      </div>
    </aside>
  );
}
