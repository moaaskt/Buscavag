'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { VelzonCard } from '@/components/admin/ui/VelzonCard';
import { VelzonBadge } from '@/components/admin/ui/VelzonBadge';
import { VelzonStatWidget } from '@/components/admin/ui/VelzonStatWidget';
import { VelzonModal } from '@/components/admin/ui/VelzonModal';
import { VelzonSelect } from '@/components/admin/ui/VelzonSelect';
import { VelzonSubTabs, SubTabItem } from '@/components/admin/ui/VelzonSubTabs';
import {
  Cpu,
  RefreshCw,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  Loader2,
  Clock,
  Layers,
  Filter,
  ShieldAlert,
  Activity,
  PauseCircle,
  Radio,
  Timer,
  FileText,
  ScrollText,
  Terminal,
  Sliders,
  Settings,
} from 'lucide-react';
import {
  ScraperMonitoringItem,
  ScraperMonitoringSummary,
  ScraperMethod,
  ScraperOperationalStatus,
} from '@/db/adminScraperRepository';

export default function AdminScrapersPage() {
  const scraperSubTabs: SubTabItem[] = useMemo(
    () => [
      { label: 'Painel & Telemetria', href: '/admin/scrapers', icon: Activity },
      { label: 'Terminal SSE Ao Vivo', href: '/admin/scrapers/terminal', icon: Terminal },
      { label: 'Configurações de Conectores', href: '/admin/scrapers/config', icon: Sliders },
    ],
    []
  );

  const [items, setItems] = useState<ScraperMonitoringItem[]>([]);
  const [summary, setSummary] = useState<ScraperMonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Auto-refresh (polling)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | ScraperMethod>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ScraperOperationalStatus>('all');

  // Estados de ações
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingScraperName, setSyncingScraperName] = useState<string | null>(null);
  const [selectedSingleScraper, setSelectedSingleScraper] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);

  // Diagnóstico
  const [selectedDiagConnector, setSelectedDiagConnector] = useState<ScraperMonitoringItem | null>(null);
  const [diagLogs, setDiagLogs] = useState<Array<{ id: string; runId: string; level: string; message: string; createdAt: string }>>([]);
  const [loadingDiag, setLoadingDiag] = useState(false);

  // Toast / feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchMetrics = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/admin/scraper/metrics', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.data.length > 0 && !selectedSingleScraper) {
          setSelectedSingleScraper(data.data[0].name);
        }
        setLastRefreshedAt(new Date());
      } else if (!silent) {
        showToast('error', data.error || 'Erro ao carregar métricas');
      }
    } catch (err: any) {
      console.error('[AdminScrapersPage] Erro ao buscar métricas:', err);
      if (!silent) showToast('error', 'Falha na conexão com o servidor');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(false);
  }, []);

  // Polling dinâmico a cada 10s quando autoRefresh está ligado
  useEffect(() => {
    if (autoRefresh) {
      pollingRef.current = setInterval(() => {
        fetchMetrics(true);
      }, 10000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [autoRefresh]);

  // Alternar ativação de conector
  const handleToggle = async (scraper: ScraperMonitoringItem) => {
    const nextState = scraper.is_enabled === 1 ? false : true;
    const previousItems = [...items];

    // Atualização otimista
    setItems((prev) =>
      prev.map((c) =>
        c.name === scraper.name
          ? {
              ...c,
              is_enabled: nextState ? 1 : 0,
              status: nextState ? 'idle' : 'disabled',
            }
          : c
      )
    );

    try {
      const res = await fetch('/api/admin/scraper/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: scraper.name, is_enabled: nextState }),
      });
      const data = await res.json();
      if (!data.success) {
        setItems(previousItems);
        showToast('error', data.error || `Erro ao atualizar conector ${scraper.name}`);
      } else {
        showToast(
          'success',
          `Conector ${scraper.name} ${nextState ? 'ativado' : 'desativado'} com sucesso!`
        );
        fetchMetrics(true);
      }
    } catch (err: any) {
      setItems(previousItems);
      showToast('error', `Falha ao alternar conector ${scraper.name}`);
    }
  };

  // Disparo global
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    showToast('info', 'Iniciando sincronização global de todos os conectores...');
    try {
      const res = await fetch('/api/admin/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Pipeline global disparado com sucesso! (Run ID: ${data.runId})`);
        fetchMetrics(true);
      } else {
        showToast('error', data.error || 'Erro ao iniciar pipeline');
      }
    } catch (err: any) {
      showToast('error', 'Falha na requisição de sincronização');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Disparo individual
  const handleSyncSingle = async (name: string) => {
    if (!name) return;
    setSyncingScraperName(name);
    showToast('info', `Iniciando conector individual: ${name}...`);
    try {
      const res = await fetch('/api/admin/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scraperName: name }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Conector "${name}" disparado com sucesso! (Run ID: ${data.runId})`);
        fetchMetrics(true);
      } else {
        showToast('error', data.error || `Erro ao disparar conector ${name}`);
      }
    } catch (err: any) {
      showToast('error', `Falha na execução do conector ${name}`);
    } finally {
      setSyncingScraperName(null);
    }
  };

  // Expurgo de vagas rejeitadas
  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const res = await fetch('/api/admin/jobs/purge-non-tech', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Expurgo concluído! ${data.purgedCount} vagas rejeitadas foram eliminadas.`);
        setShowPurgeModal(false);
        fetchMetrics(true);
      } else {
        showToast('error', data.error || 'Erro ao executar expurgo');
      }
    } catch (err: any) {
      showToast('error', 'Falha ao processar expurgo de vagas');
    } finally {
      setIsPurging(false);
    }
  };

  // Abrir modal de diagnóstico
  const openDiagnosisModal = async (connector: ScraperMonitoringItem) => {
    setSelectedDiagConnector(connector);
    setLoadingDiag(true);
    setDiagLogs([]);
    try {
      const res = await fetch(`/api/admin/scraper/metrics?name=${encodeURIComponent(connector.name)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setDiagLogs(data.logs);
      }
    } catch (err) {
      console.error('Erro ao buscar logs de diagnóstico:', err);
    } finally {
      setLoadingDiag(false);
    }
  };

  // Formatação de tempo relativo
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca executado';
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return 'Agora mesmo';
      if (diffMin < 60) return `Há ${diffMin} min`;
      if (diffHours < 24) return `Há ${diffHours}h`;
      return `Há ${diffDays}d`;
    } catch {
      return dateStr;
    }
  };

  // Formatação de latência
  const formatLatency = (ms: number | null) => {
    if (ms === null || ms === undefined) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Filtragem
  const filteredItems = useMemo(() => {
    return items.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.target_url && c.target_url.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesMethod = methodFilter === 'all' || c.method === methodFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [items, searchTerm, methodFilter, statusFilter]);

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

  const statusBadge = (status: ScraperOperationalStatus) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-sky-600 dark:text-sky-400" />
            Executando
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Sucesso
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            Falha
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            <PauseCircle className="w-3 h-3 text-slate-500" />
            Desativado
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            <Clock className="w-3 h-3 text-slate-400" />
            Ocioso
          </span>
        );
    }
  };

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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#405189]" />
            Central de Scrapers & Ingestão (Monitoramento)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Painel de controle em tempo real, telemetria de latência, governança de conectores e expurgo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Auto-Refresh */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <Radio
              className={`w-3.5 h-3.5 ${
                autoRefresh ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Auto-Refresh (10s)</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoRefresh}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoRefresh ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  autoRefresh ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <Link
            href="/admin/logs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            Logs de Auditoria
          </Link>

          <button
            onClick={() => fetchMetrics(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Sub-Navegação por Abas da Central de Scrapers */}
      <div className="mt-4">
        <VelzonSubTabs tabs={scraperSubTabs} />
      </div>

      {/* Widgets Estatísticos Calculados em Tempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <VelzonStatWidget
          title="Total de Conectores"
          value={summary?.total ?? items.length}
          icon={<Cpu className="w-6 h-6 text-[#405189]" />}
          variant="primary"
          trend={{
            value: `${summary?.active ?? items.length} ativos`,
            isPositive: true,
          }}
        />
        <VelzonStatWidget
          title="Conectores Saudáveis"
          value={summary?.success ?? 0}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          variant="success"
          trend={{
            value: `${summary?.total ? Math.round(((summary.success) / summary.total) * 100) : 100}% taxa de sucesso`,
            isPositive: true,
          }}
        />
        <VelzonStatWidget
          title="Falhas Recentes"
          value={summary?.failed ?? 0}
          icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          variant="danger"
          trend={{
            value: summary?.failed === 0 ? 'Zero falhas no ciclo' : `${summary?.failed} com alertas`,
            isPositive: summary?.failed === 0,
          }}
        />
        <VelzonStatWidget
          title="Latência Média Global"
          value={formatLatency(summary?.avgLatencyMs ?? null)}
          icon={<Timer className="w-6 h-6 text-sky-500" />}
          variant="info"
          trend={{
            value: `${(summary?.totalJobsStored ?? 0).toLocaleString('pt-BR')} vagas no banco`,
            label: 'consolidado',
          }}
        />
      </div>

      {/* Painel de Controle Operacional (Ações Globais e Unitárias) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        {/* Card 1: Disparo Global */}
        <VelzonCard
          title="Sincronização Global"
          subtitle="Executar todos os conectores ativos simultaneamente"
          className="border-t-4 border-t-[#405189]"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Inicia o pipeline autônomo com concorrência paralela e timeout supervisionado para todas as fontes habilitadas.
          </p>
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#405189] hover:bg-[#364473] text-white font-medium text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSyncingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sincronizando Todas as Fontes...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sincronizar Todas as Fontes
              </>
            )}
          </button>
        </VelzonCard>

        {/* Card 2: Disparo Individual */}
        <VelzonCard
          title="Execução Granular"
          subtitle="Disparar um único conector sob demanda"
          className="border-t-4 border-t-sky-500"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
            Selecione uma fonte específica para testar a captura ou forçar atualização isolada:
          </p>
          <div className="space-y-3">
            <VelzonSelect
              value={selectedSingleScraper}
              onChange={(e) => setSelectedSingleScraper(e.target.value)}
              className="text-xs"
            >
              {items.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.method.toUpperCase()}) {c.is_enabled === 0 ? '[DESATIVADO]' : ''}
                </option>
              ))}
            </VelzonSelect>

            <button
              onClick={() => handleSyncSingle(selectedSingleScraper)}
              disabled={!selectedSingleScraper || syncingScraperName === selectedSingleScraper}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {syncingScraperName === selectedSingleScraper ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executando {selectedSingleScraper}...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Disparar Conector Selecionado
                </>
              )}
            </button>
          </div>
        </VelzonCard>

        {/* Card 3: Expurgo Operacional */}
        <VelzonCard
          title="Expurgo & Limpeza"
          subtitle="Higienização do banco de dados e expurgo de ruído"
          className="border-t-4 border-t-rose-500"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Remove permanentemente vagas rejeitadas por filtros não-tech e ruídos de scraping, liberando espaço e otimizando consultas.
          </p>
          <button
            onClick={() => setShowPurgeModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-medium text-sm transition shadow-sm cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Expurgar Vagas Rejeitadas
          </button>
        </VelzonCard>
      </div>

      {/* Card de Atalho para o Terminal SSE em Tela Cheia */}
      <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold flex items-center gap-2 text-slate-100">
              Terminal de Logs SSE em Tempo Real
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Ao Vivo
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Acesse o console em tela cheia com transmissão SSE contínua, auto-scroll, filtros por severidade e exportação.
            </p>
          </div>
        </div>
        <Link
          href="/admin/scrapers/terminal"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#405189] hover:bg-[#364473] text-white text-xs font-semibold shadow-sm transition whitespace-nowrap cursor-pointer"
        >
          <Terminal className="w-4 h-4" />
          Abrir Terminal Dedicado
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>

      {/* Tabela de Monitoramento & Métricas de Conectores */}
      <div className="mt-8">
        <VelzonCard
          title={`Telemetria de Conectores (${filteredItems.length} de ${items.length})`}
          subtitle={
            lastRefreshedAt
              ? `Última sincronização de status: ${lastRefreshedAt.toLocaleTimeString('pt-BR')}`
              : 'Monitoramento em tempo real de latência, status e captura'
          }
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Busca Textual */}
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar conector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#405189]"
                />
              </div>

              {/* Filtro Método */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as any)}
                className="py-1.5 px-2.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="all">Todos os Métodos</option>
                <option value="playwright">Playwright Stealth</option>
                <option value="ssr">SSR / Cheerio</option>
                <option value="api">API / REST</option>
                <option value="cookie">Sessão / Cookie</option>
              </select>

              {/* Filtro Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-1.5 px-2.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="running">Em Execução</option>
                <option value="success">Sucesso</option>
                <option value="failed">Com Falhas</option>
                <option value="idle">Ociosos</option>
                <option value="disabled">Desativados</option>
              </select>
            </div>
          }
        >
          {loading && items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#405189] mb-2" />
              <p className="text-xs font-mono">Carregando telemetria dos conectores...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Filter className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-medium">Nenhum conector encontrado para os filtros selecionados.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setMethodFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-2 text-xs text-[#405189] hover:underline font-semibold"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider">
                    <th className="py-3 px-4">Conector</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4">Latência</th>
                    <th className="py-3 px-4">Vagas (Última / Banco)</th>
                    <th className="py-3 px-4">Última Execução</th>
                    <th className="py-3 px-4 text-center">Ativo</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {filteredItems.map((item) => {
                    const isEnabled = item.is_enabled === 1;
                    const isRunning = syncingScraperName === item.name || item.status === 'running';

                    return (
                      <tr
                        key={item.name}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                          !isEnabled ? 'opacity-65 bg-slate-50/30 dark:bg-slate-900/20' : ''
                        }`}
                      >
                        {/* Nome do Conector */}
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{item.name}</span>
                              {item.last_error && (
                                <span
                                  title={`Erro: ${item.last_error}`}
                                  className="cursor-help text-rose-500"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            {item.target_url && (
                              <a
                                href={item.target_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#405189] dark:hover:text-indigo-400 transition font-mono truncate max-w-[200px]"
                              >
                                <span>{item.target_url.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Status Semântico ao Vivo */}
                        <td className="py-3.5 px-4 text-center">
                          {statusBadge(item.status)}
                        </td>

                        {/* Método */}
                        <td className="py-3.5 px-4">
                          <VelzonBadge variant={methodBadgeVariant(item.method)} size="sm">
                            {item.method.toUpperCase()}
                          </VelzonBadge>
                        </td>

                        {/* Latência da última execução */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span
                            className={
                              item.last_latency_ms && item.last_latency_ms > 25000
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : item.last_latency_ms && item.last_latency_ms > 12000
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {formatLatency(item.last_latency_ms)}
                          </span>
                        </td>

                        {/* Vagas Capturadas / Armazenadas */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              +{item.last_jobs_found}
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {item.total_jobs_stored}
                            </span>
                          </div>
                        </td>

                        {/* Data da última execução */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">
                          <span title={item.last_run_at ? new Date(item.last_run_at).toLocaleString('pt-BR') : ''}>
                            {formatRelativeTime(item.last_run_at)}
                          </span>
                        </td>

                        {/* Toggle Ativação */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            onClick={() => handleToggle(item)}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDiagnosisModal(item)}
                              title="Ver diagnóstico e histórico recente"
                              className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Activity className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleSyncSingle(item.name)}
                              disabled={isRunning}
                              title={`Disparar ${item.name} agora`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#405189]/10 text-[#405189] dark:bg-[#405189]/25 dark:text-indigo-300 hover:bg-[#405189]/20 transition disabled:opacity-50 cursor-pointer"
                            >
                              {isRunning ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Disparar
                            </button>
                          </div>
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

      {/* Modal de Diagnóstico Técnico do Conector */}
      <VelzonModal
        isOpen={Boolean(selectedDiagConnector)}
        onClose={() => setSelectedDiagConnector(null)}
        title={
          selectedDiagConnector ? (
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#405189]" />
              <span>Diagnóstico: {selectedDiagConnector.name}</span>
            </div>
          ) : (
            'Diagnóstico de Conector'
          )
        }
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400 font-mono">
              {diagLogs.length} logs recentes registrados
            </span>
            <button
              onClick={() => setSelectedDiagConnector(null)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        }
      >
        {selectedDiagConnector && (
          <div className="space-y-4">
            {/* Resumo Rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Método</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedDiagConnector.method.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Status</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedDiagConnector.status.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Última Latência</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatLatency(selectedDiagConnector.last_latency_ms)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Vagas no Banco</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedDiagConnector.total_jobs_stored}
                </span>
              </div>
            </div>

            {/* Mensagem de Erro em Destaque */}
            {selectedDiagConnector.last_error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 font-mono">
                <strong className="block font-semibold mb-1">Último Erro Detectado:</strong>
                {selectedDiagConnector.last_error}
              </div>
            )}

            {/* Lista de Logs Recentes */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                Histórico Recente de Execução
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                {loadingDiag ? (
                  <div className="py-6 flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Carregando logs...
                  </div>
                ) : diagLogs.length === 0 ? (
                  <p className="text-slate-400 text-xs py-4 text-center">
                    Nenhum log individual registrado para este conector até o momento.
                  </p>
                ) : (
                  diagLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-[11px] leading-relaxed"
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span
                          className={`font-semibold px-1 py-0.2 rounded text-[9px] ${
                            log.level === 'ERROR'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              : log.level === 'WARN'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          }`}
                        >
                          {log.level}
                        </span>
                        <span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 break-words">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </VelzonModal>

      {/* Modal de Expurgo Seguro */}
      <VelzonModal
        isOpen={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        title="Confirmar Expurgo de Vagas Rejeitadas"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowPurgeModal(false)}
              disabled={isPurging}
              className="px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handlePurge}
              disabled={isPurging}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isPurging ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Expurgando Registros...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirmar e Expurgar
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              <strong className="block font-semibold mb-1">Ação Irreversível de Limpeza</strong>
              Esta operação realizará um hard delete de todas as vagas marcadas como ruído ou rejeitadas pelos filtros semânticos não-tech.
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Recomendado para otimizar o índice do banco de dados SQLite e manter apenas oportunidades estritamente válidas. Deseja prosseguir com o expurgo?
          </p>
        </div>
      </VelzonModal>
    </AdminLayout>
  );
}
