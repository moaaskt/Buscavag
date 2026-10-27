'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SubTabItem {
  id?: string;
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger';
}

export interface VelzonSubTabsProps {
  tabs: SubTabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function VelzonSubTabs({ tabs, activeTab, onTabChange, className = '' }: VelzonSubTabsProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sub-navegação de módulo"
      role={onTabChange ? 'tablist' : undefined}
      className={`border-b border-[#e9ebec] dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar pb-px ${className}`}
    >
      {tabs.map((tab, idx) => {
        const tabIdentifier = tab.id || tab.href || String(idx);
        const isActive = activeTab !== undefined ? activeTab === tabIdentifier : pathname === tab.href;
        const Icon = tab.icon;

        let badgeClasses = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        if (tab.badgeVariant === 'success') {
          badgeClasses = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50';
        } else if (tab.badgeVariant === 'warning') {
          badgeClasses = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50';
        } else if (tab.badgeVariant === 'danger') {
          badgeClasses = 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50';
        }

        const tabContent = (
          <>
            {Icon && (
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive
                    ? 'text-[#405189] dark:text-indigo-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                }`}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold font-mono rounded-full ${badgeClasses}`}
              >
                {tab.badge}
              </span>
            )}
          </>
        );

        const commonClassName = `group inline-flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all duration-200 border-b-2 whitespace-nowrap cursor-pointer ${
          isActive
            ? 'border-[#405189] text-[#405189] dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 font-semibold shadow-2xs'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`;

        // Se houver callback onTabChange ou não houver href, renderiza como button
        if (onTabChange || !tab.href) {
          return (
            <button
              key={tabIdentifier}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange && onTabChange(tabIdentifier)}
              className={commonClassName}
            >
              {tabContent}
            </button>
          );
        }

        // Caso contrário, opera no modo navegação por rota (Next.js Link)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={commonClassName}
          >
            {tabContent}
          </Link>
        );
      })}
    </nav>
  );
}

export const AdminSubNav = VelzonSubTabs;
