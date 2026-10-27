'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { VelzonSubTabs, SubTabItem } from '@/components/admin/ui/VelzonSubTabs';
import { VelzonCard } from '@/components/admin/ui/VelzonCard';
import { VelzonBadge } from '@/components/admin/ui/VelzonBadge';
import { VelzonModal } from '@/components/admin/ui/VelzonModal';
import { VelzonInput } from '@/components/admin/ui/VelzonInput';
import { VelzonSelect } from '@/components/admin/ui/VelzonSelect';
import {
  Sliders,
  Activity,
  Terminal,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit2,
  Clock,
  ArrowLeft,
  Check,
  Shield,
  Layers,
  PauseCircle,
  Cpu,
} from 'lucide-react';
import { ScraperConfigEntry, ScraperMethod } from '@/db/adminScraperRepository';

export default function AdminScrapersConfigPage() {
  const scraperSubTabs: SubTabItem[] = useMemo(
    () => [
      { label: 'Painel & Telemetria', href: '/admin/scrapers', icon: Activity },
      { label: 'Terminal SSE Ao Vivo', href: '/admin/scrapers/terminal', icon: Terminal },
      { label: 'Configurações de Conectores', href: '/admin/scrapers/config', icon: Sliders },
    ],
    []
  );

  const [configs, setConfigs] = useState<ScraperConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | ScraperMethod>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Estado de edição de conector
  const [editingConfig, setEditingConfig] = useState<ScraperConfigEntry | null>(null);
  const [editMethod, setEditMethod] = useState<ScraperMethod>('ssr');
  const [editTimeout, setEditTimeout] = useState<number>(45000);
  const [isSaving, setIsSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchConfigs = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/admin/scraper/config', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setConfigs(data.data);
      } else if (!silent) {
        showToast('error', data.error || 'Erro ao carregar configurações de conectores');
      }
    } catch (err: any) {
      console.error('[AdminScrapersConfigPage] Erro ao buscar configurações:', err);
      if (!silent) showToast('error', 'Falha na conexão com o servidor');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Alternar ativação de conector (Toggle On/Off)
  const handleToggle = async (config: ScraperConfigEntry) => {
    const nextState = config.is_enabled === 1 ? false : true;
    try {
      const res = await fetch('/api/admin/scraper/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          is_enabled: nextState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          'success',
          `Conector "${config.name}" ${nextState ? 'ativado' : 'desativado'} com sucesso!`
        );
        setConfigs((prev) =>
          prev.map((c) => (c.name === config.name ? { ...c, is_enabled: nextState ? 1 : 0 } : c))
        );
      } else {
        showToast('error', data.error || 'Erro ao alternar status do conector');
      }
    } catch (err: any) {
      showToast('error', 'Falha de comunicação ao atualizar status');
    }
  };

  // Abrir modal de edição
  const openEditModal = (config: ScraperConfigEntry) => {
    setEditingConfig(config);
    setEditMethod(config.method);
    setEditTimeout(config.timeout_ms || 45000);
  };

  // Salvar alterações de método/timeout
  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/scraper/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingConfig.name,
          method: editMethod,
          timeout_ms: editTimeout,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Configurações de "${editingConfig.name}" salvas com sucesso!`);
        setEditingConfig(null);
        fetchConfigs(true);
      } else {
        showToast('error', data.error || 'Erro ao salvar alterações');
      }
    } catch (err: any) {
      showToast('error', 'Falha ao comunicar com o servidor');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtragem dos conectores
  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.target_url && c.target_url.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesMethod = methodFilter === 'all' || c.method === methodFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'enabled' && c.is_enabled === 1) ||
        (statusFilter === 'disabled' && c.is_enabled === 0);
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [configs, searchTerm, methodFilter, statusFilter]);

  const methodBadgeVariant = (method: ScraperMethod) => {
    switch (method) {
      case 'playwright':
        return 'primary';
      case 'ssr':
        return 'info';
      case 'api':
        return 'success';
      case 'cookie':
        return 'warning';
      default:
        return 'dark';
    }
  };

  const enabledCount = useMemo(() => configs.filter((c) => c.is_enabled === 1).length, [configs]);
  const disabledCount = useMemo(() => configs.filter((c) => c.is_enabled === 0).length, [configs]);

  return (
    <AdminLayout>
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/80 dark:border-rose-700 dark:text-rose-200'
              : 'bg-indigo-50 border-indigo-300 text-indigo-800 dark:bg-indigo-950/80 dark:border-indigo-700 dark:text-indigo-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
          {toast.type === 'info' && <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />}
          <span>{toast.message}</span>
        </div>
      )}

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
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Configurações</span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#405189]" />
            Governança de Conectores & Scrapers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Controle de ativação, definição de método de coleta e gestão de tolerância de timeouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{enabledCount} Ativos</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-slate-500 dark:text-slate-400">{disabledCount} Desativados</span>
          </div>

          <button
            onClick={() => fetchConfigs(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Sub-Navegação por Abas */}
      <div className="mt-4">
        <VelzonSubTabs tabs={scraperSubTabs} />
      </div>

      {/* Tabela de Governança de Conectores */}
      <div className="mt-6">
        <VelzonCard
          title={`Conectores de Coleta (${filteredConfigs.length} de ${configs.length})`}
          subtitle="Gerencie métodos de raspagem, URLs alvo e habilitação individual dos conectores"
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Busca Textual */}
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar conector ou URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#405189]"
                />
              </div>

              {/* Filtro por Método */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#405189]"
              >
                <option value="all">Todos os Métodos</option>
                <option value="playwright">Playwright</option>
                <option value="ssr">SSR / Cheerio</option>
                <option value="api">API Direta</option>
                <option value="cookie">Cookie Auth</option>
              </select>

              {/* Filtro por Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#405189]"
              >
                <option value="all">Todos os Status</option>
                <option value="enabled">Apenas Ativos</option>
                <option value="disabled">Apenas Desativados</option>
              </select>
            </div>
          }
          noPadding
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#405189]" />
              <p className="text-xs text-slate-500 font-mono">Carregando governança de conectores...</p>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Sliders className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhum conector encontrado com os filtros aplicados
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tente redefinir o termo de busca ou filtros de método.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Conector</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Método</th>
                    <th className="py-3 px-4 font-semibold">URL Alvo</th>
                    <th className="py-3 px-4 font-semibold">Timeout</th>
                    <th className="py-3 px-4 font-semibold">Atualizado em</th>
                    <th className="py-3 px-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                  {filteredConfigs.map((config) => {
                    const isEnabled = config.is_enabled === 1;

                    return (
                      <tr
                        key={config.name}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          !isEnabled ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/20' : ''
                        }`}
                      >
                        {/* Conector */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                              {config.name}
                            </span>
                          </div>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isEnabled}
                              onClick={() => handleToggle(config)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              }`}
                              title={isEnabled ? 'Clique para desativar' : 'Clique para ativar'}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isEnabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-[11px] font-semibold ${
                                isEnabled
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {isEnabled ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </td>

                        {/* Método */}
                        <td className="py-3 px-4">
                          <VelzonBadge
                            variant={methodBadgeVariant(config.method)}
                            size="sm"
                          >
                            {config.method.toUpperCase()}
                          </VelzonBadge>
                        </td>

                        {/* URL Alvo */}
                        <td className="py-3 px-4 font-mono text-[11px] max-w-[240px] truncate">
                          {config.target_url ? (
                            <a
                              href={config.target_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                              title={config.target_url}
                            >
                              <span className="truncate">{config.target_url.replace(/^https?:\/\//, '')}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">Interno / Não informado</span>
                          )}
                        </td>

                        {/* Timeout */}
                        <td className="py-3 px-4 font-mono text-xs">
                          {(config.timeout_ms / 1000).toFixed(0)}s
                          <span className="text-[10px] text-slate-400 ml-1">({config.timeout_ms}ms)</span>
                        </td>

                        {/* Atualizado Em */}
                        <td className="py-3 px-4 text-[11px] text-slate-500 font-mono">
                          {config.updated_at
                            ? new Date(config.updated_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openEditModal(config)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-[#405189]" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </VelzonCard>
      </div>

      {/* Modal de Edição de Configuração */}
      {editingConfig && (
        <VelzonModal
          isOpen={true}
          onClose={() => setEditingConfig(null)}
          title={`Editar Conector: ${editingConfig.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                Método de Scraping
              </label>
              <select
                value={editMethod}
                onChange={(e) => setEditMethod(e.target.value as ScraperMethod)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#405189]"
              >
                <option value="ssr">SSR / Cheerio (Requisição Leve)</option>
                <option value="playwright">Playwright Headless (SPA / Stealth)</option>
                <option value="api">API Direta (JSON / REST)</option>
                <option value="cookie">Cookie Auth (Sessão Autenticada)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                Timeout Máximo de Execução (Milissegundos)
              </label>
              <input
                type="number"
                step="1000"
                min="5000"
                max="180000"
                value={editTimeout}
                onChange={(e) => setEditTimeout(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#405189] font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Equivale a {(editTimeout / 1000).toFixed(0)} segundos de espera máxima antes do cancelamento forçado.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEditingConfig(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-[#405189] hover:bg-[#364473] text-white shadow-xs transition cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </VelzonModal>
      )}
    </AdminLayout>
  );
}
