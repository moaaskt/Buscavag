'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  KanbanSquare,
  Sparkles,
  FileText,
  Crown,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogIn,
  LogOut,
  User,
  Zap,
} from 'lucide-react';

interface AuthUserState {
  authenticated: boolean;
  name?: string;
  email?: string;
  tier?: 'free' | 'premium';
  role?: string;
}

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [authState, setAuthState] = useState<AuthUserState>({ authenticated: false });

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setAuthState({
          authenticated: true,
          name: data.user.name,
          email: data.user.email,
          tier: data.user.tier,
          role: data.user.role,
        });
      } else {
        setAuthState({ authenticated: false });
      }
    } catch {
      setAuthState({ authenticated: false });
    }
  };

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('buscavag_theme');
      if (storedTheme === 'light') {
        setIsDarkMode(false);
      } else if (storedTheme === 'dark') {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    } catch {}

    checkAuth();

    const handleAuthChange = () => checkAuth();
    window.addEventListener('buscavag:auth-changed', handleAuthChange);
    return () => {
      window.removeEventListener('buscavag:auth-changed', handleAuthChange);
    };
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
    try {
      localStorage.setItem('buscavag_theme', isDark ? 'dark' : 'light');
    } catch {}
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
      badge: null,
    },
    {
      name: 'Explorador de Vagas',
      href: '/jobs',
      icon: Compass,
      active: pathname.startsWith('/jobs'),
      badge: 'Live',
    },
    {
      name: 'Kanban Candidaturas',
      href: '/board',
      icon: KanbanSquare,
      active: pathname.startsWith('/board'),
      badge: null,
    },
    {
      name: 'Match IA & Vagas',
      href: '/candidate?tab=recommended',
      icon: Sparkles,
      active: pathname.startsWith('/candidate') && !pathname.includes('tab=profile'),
      badge: 'IA',
    },
    {
      name: 'Meu Perfil & CV',
      href: '/candidate?tab=profile',
      icon: FileText,
      active: pathname.startsWith('/candidate') && pathname.includes('tab=profile'),
      badge: null,
    },
    {
      name: 'Planos & Preços',
      href: '/pricing',
      icon: Crown,
      active: pathname.startsWith('/pricing'),
      badge: 'Pro',
    },
    ...(authState.role === 'ADMIN'
      ? [
          {
            name: 'Painel Admin',
            href: '/admin',
            icon: ShieldCheck,
            active: pathname.startsWith('/admin'),
            badge: 'Admin',
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.dispatchEvent(new Event('buscavag:auth-changed'));
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Backdrop para telas mobile */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Lateral Principal */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r
          bg-white/80 dark:bg-zinc-950/85 backdrop-blur-xl border-zinc-200/80 dark:border-zinc-800/80
          shadow-lg dark:shadow-2xl text-zinc-700 dark:text-zinc-200
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand / Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
              B
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  Buscavag
                  <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                    Radar
                  </span>
                </span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                  IA Job Matcher
                </span>
              </div>
            )}
          </Link>

          {/* Botão de Toggle Lateral (Desktop) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 scrollbar-thin">
          {!collapsed && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Navegação
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  item.active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold dark:bg-indigo-600'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    item.active ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          item.active
                            ? 'bg-white/20 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <div key={item.href} title={item.name} className="flex justify-center">
                  {content}
                </div>
              );
            }

            return content;
          })}
        </div>

        {/* Rodapé da Sidebar: Tema, Perfil e Auth */}
        <div className="p-3 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-2">
          {/* Alternador de Tema Dark/Light */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
            )}
            {!collapsed && (
              <span className="flex-1 text-left truncate">
                {isDarkMode ? 'Tema Claro' : 'Tema Escuro'}
              </span>
            )}
          </button>

          {/* Área do Usuário / Auth */}
          {authState.authenticated ? (
            <div
              className={`pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center gap-2.5 ${
                collapsed ? 'justify-center' : 'px-2'
              }`}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {authState.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                {authState.tier === 'premium' && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[8px] text-zinc-900 font-bold">
                    ★
                  </span>
                )}
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {authState.name || 'Candidato'}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate font-mono">
                    {authState.email}
                  </p>
                </div>
              )}

              {!collapsed && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onCloseMobile}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity ${
                collapsed ? 'justify-center' : ''
              }`}
              title="Entrar na conta"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="font-semibold truncate">Entrar</span>}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
