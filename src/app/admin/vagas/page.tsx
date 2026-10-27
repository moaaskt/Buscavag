'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
  VelzonCard,
  VelzonBadge,
  VelzonInput,
  VelzonSelect,
  VelzonLabel,
  VelzonTextarea,
  VelzonStatWidget,
  VelzonModal,
  VelzonSubTabs,
  SubTabItem,
} from '@/components/admin/ui';
import {
  Briefcase,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Edit3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Building,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Database,
  Check,
  LayoutGrid,
  Table,
  Send,
  Share2,
  Smartphone,
  MessageSquare,
} from 'lucide-react';
import type { AdminJobEntry, AdminJobStats, JobStatus } from '@/db/adminJobRepository';

export default function AdminVagasPage() {
  const [jobs, setJobs] = useState<AdminJobEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Sub-Navegação & Visualização (Tabela vs. Kanban vs. Expurgo)
  const [activeTab, setActiveTab] = useState<'table' | 'kanban' | 'purge'>('table');
  const viewMode = activeTab === 'kanban' ? 'kanban' : 'table';

  useEffect(() => {
    try {
      const saved = localStorage.getItem('buscavag_jobs_view');
      if (saved === 'kanban' || saved === 'table' || saved === 'purge') {
        setActiveTab(saved as any);
      }
    } catch {}
  }, []);

  const handleSwitchTab = (tab: string) => {
    const validTab = tab === 'kanban' || tab === 'purge' ? tab : 'table';
    setActiveTab(validTab as any);
    try {
      localStorage.setItem('buscavag_jobs_view', validTab);
    } catch {}
  };

  // Disparo Rápido para Canais
  const [dispatchJobTarget, setDispatchJobTarget] = useState<AdminJobEntry | null>(null);
  const [dispatchChannel, setDispatchChannel] = useState<'telegram' | 'whatsapp'>('telegram');
  const [dispatchRecipient, setDispatchRecipient] = useState('');
  const [dispatchMessage, setDispatchMessage] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchToast, setDispatchToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState<JobStatus | 'all'>('all');
  const [workModel, setWorkModel] = useState('all');

  // Estatísticas
  const [stats, setStats] = useState<AdminJobStats>({
    totalJobs: 0,
    activeJobs: 0,
    hiddenJobs: 0,
    expiredJobs: 0,
    eligibleForPurge: 0,
    retentionDays: 21,
    platformsCount: {},
  });

  // Modais de Ação
  const [editingJob, setEditingJob] = useState<AdminJobEntry | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminJobEntry>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingJob, setDeletingJob] = useState<AdminJobEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeRetention, setPurgeRetention] = useState(21);
  const [purging, setPurging] = useState(false);
  const [purgeSuccessMessage, setPurgeSuccessMessage] = useState<string | null>(null);

  const generateOfficialTemplate = (job: AdminJobEntry) => {
    const workModelStr = job.work_model ? job.work_model.toUpperCase() : 'NÃO INFORMADO';
    const locationStr = job.location || 'Brasil';
    const seniorityStr = job.required_seniority || 'Não especificada';
    const stackStr = job.tech_stack || 'Geral';
    const urlStr = job.url || 'https://buscavag.com.br';

    return `🚀 NOVA OPORTUNIDADE TECH - BUSCAVAG

💼 Vaga: ${job.title}
🏢 Empresa: ${job.company}
📍 Localização: ${locationStr} (${workModelStr})
🎯 Senioridade: ${seniorityStr}
💻 Stacks: ${stackStr}

🔗 Veja mais detalhes e candidate-se em:
${urlStr}`;
  };

  const handleOpenDispatch = (job: AdminJobEntry) => {
    setDispatchJobTarget(job);
    setDispatchChannel('telegram');
    setDispatchRecipient('');
    setDispatchMessage(generateOfficialTemplate(job));
  };

  const handleExecuteDispatch = async () => {
    if (!dispatchJobTarget || !dispatchMessage.trim()) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/admin/vagas/${dispatchJobTarget.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canal: dispatchChannel,
          destinatario: dispatchRecipient.trim() || undefined,
          mensagem: dispatchMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchToast({
          message: `Vaga disparada com sucesso para ${dispatchChannel === 'telegram' ? 'Telegram' : 'WhatsApp'}!`,
          type: 'success',
        });
        setDispatchJobTarget(null);
        setTimeout(() => setDispatchToast(null), 4000);
      } else {
        setDispatchToast({
          message: data.error || 'Erro ao processar disparo',
          type: 'error',
        });
        setTimeout(() => setDispatchToast(null), 4000);
      }
    } catch (err) {
      setDispatchToast({
        message: 'Falha de comunicação ao disparar vaga',
        type: 'error',
      });
      setTimeout(() => setDispatchToast(null), 4000);
    } finally {
      setDispatching(false);
    }
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '25');
      if (search.trim()) params.set('search', search.trim());
      if (platform !== 'all') params.set('platform', platform);
      if (status !== 'all') params.set('status', status);
      if (workModel !== 'all') params.set('workModel', workModel);

      const res = await fetch(`/api/admin/vagas?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setJobs(data.jobs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
          setPurgeRetention(data.stats.retentionDays || 21);
        }
      }
    } catch (err) {
      console.error('Error fetching admin jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, platform, status, workModel]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Ação rápida: Toggle Soft-Hide
  const handleToggleHide = async (job: AdminJobEntry) => {
    try {
      const res = await fetch(`/api/admin/vagas/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_hide' }),
      });
      const data = await res.json();

      if (data.success) {
        // Atualização otimista local
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: data.newStatus } : j))
        );
        fetchJobs();
      }
    } catch (err) {
      console.error('Error toggling job visibility:', err);
    }
  };

  // Abrir modal de edição rápida
  const handleOpenEdit = (job: AdminJobEntry) => {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      company: job.company,
      location: job.location || '',
      work_model: job.work_model || '',
      required_seniority: job.required_seniority || '',
      tech_stack: job.tech_stack || '',
      salary: job.salary || '',
      status: job.status,
    });
  };

  // Salvar edição rápida
  const handleSaveEdit = async () => {
    if (!editingJob) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/vagas/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();

      if (data.success) {
        setEditingJob(null);
        fetchJobs();
      } else {
        alert(data.error || 'Erro ao salvar alterações');
      }
    } catch (err) {
      console.error('Error saving job:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Confirmar exclusão definitiva
  const handleConfirmDelete = async () => {
    if (!deletingJob) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/vagas/${deletingJob.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setDeletingJob(null);
        fetchJobs();
      } else {
        alert(data.error || 'Erro ao excluir vaga');
      }
    } catch (err) {
      console.error('Error deleting job:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Executar expurgo seguro
  const handleExecutePurge = async () => {
    setPurging(true);
    setPurgeSuccessMessage(null);
    try {
      const res = await fetch('/api/admin/jobs/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: false,
          retentionDays: purgeRetention,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setPurgeSuccessMessage(
          `Sucesso! ${data.totalDeleted} vagas foram expurgadas em ${data.batches} lote(s). O espaço em disco foi otimizado no SQLite.`
        );
        fetchJobs();
      } else {
        alert(data.error || 'Erro ao executar expurgo');
      }
    } catch (err) {
      console.error('Error executing purge:', err);
    } finally {
      setPurging(false);
    }
  };

  const getStatusBadge = (jobStatus: JobStatus) => {
    switch (jobStatus) {
      case 'active':
        return <VelzonBadge variant="success">Ativa</VelzonBadge>;
      case 'hidden':
        return <VelzonBadge variant="warning">Oculta (Soft)</VelzonBadge>;
      case 'expired':
        return <VelzonBadge variant="danger">Expirada</VelzonBadge>;
      default:
        return <VelzonBadge variant="dark">{jobStatus}</VelzonBadge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderKanbanCard = (job: AdminJobEntry) => (
    <div
      key={job.id}
      className="bg-white dark:bg-[#1a1e29] border border-[#e9ebec] dark:border-slate-800 rounded-lg p-3 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <h4
          className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug"
          title={job.title}
        >
          {job.title}
        </h4>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
          {job.platform}
        </span>
      </div>

      <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 truncate">
          <Building className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{job.company}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="capitalize">{job.work_model || 'Híbrido'}</span>
          <span>•</span>
          <span className="truncate">{job.location || 'Brasil'}</span>
          {job.required_seniority && (
            <>
              <span>•</span>
              <span className="font-mono">{job.required_seniority}</span>
            </>
          )}
        </div>
      </div>

      {job.tech_stack && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {job.tech_stack
            .split(',')
            .slice(0, 3)
            .map((st, idx) => (
              <span
                key={idx}
                className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {st.trim()}
              </span>
            ))}
        </div>
      )}

      <div className="pt-2 border-t border-[#e9ebec] dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono">{formatDate(job.published_at)}</span>

        <div className="flex items-center gap-1">
          {/* Disparo para Canais */}
          <button
            onClick={() => handleOpenDispatch(job)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-500 hover:text-indigo-600 transition-colors"
            title="Disparar vaga para canais (Telegram / WhatsApp)"
          >
            <Send className="w-3 h-3" />
          </button>

          {/* Link original */}
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-500 hover:text-[#405189] transition-colors"
            title="Abrir URL original"
          >
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Toggle Soft-Hide */}
          <button
            onClick={() => handleToggleHide(job)}
            className={`p-1 rounded transition-colors ${
              job.status === 'hidden'
                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-amber-600'
            }`}
            title={job.status === 'hidden' ? 'Desocultar vaga' : 'Ocultar da busca (Soft-Hide)'}
          >
            {job.status === 'hidden' ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>

          {/* Editar */}
          <button
            onClick={() => handleOpenEdit(job)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-500 hover:text-[#405189] transition-colors"
            title="Editar Vaga"
          >
            <Edit3 className="w-3 h-3" />
          </button>

          {/* Excluir */}
          <button
            onClick={() => setDeletingJob(job)}
            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
            title="Excluir Definitivamente"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  const vagasSubTabs: SubTabItem[] = [
    {
      id: 'table',
      label: 'Tabela de Oportunidades',
      icon: Table,
      badge: total > 0 ? total : undefined,
    },
    {
      id: 'kanban',
      label: 'Kanban Visual de Vagas',
      icon: LayoutGrid,
    },
    {
      id: 'purge',
      label: 'Expurgo Seguro & Retenção',
      icon: Trash2,
      badge: stats.eligibleForPurge > 0 ? stats.eligibleForPurge : undefined,
      badgeVariant: 'danger',
    },
  ];

  return (
    <AdminLayout>
      {/* Toast de Notificação de Disparo */}
      {dispatchToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold transition-all ${
            dispatchToast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {dispatchToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{dispatchToast.message}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e9ebec] dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#405189]" />
            Gestão de Vagas Expostas & Expurgo
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Controle de visibilidade pública, retificação de scraping, visualização Kanban e disparo para canais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPurgeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Expurgo Seguro</span>
            {stats.eligibleForPurge > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono">
                {stats.eligibleForPurge}
              </span>
            )}
          </button>

          <button
            onClick={() => fetchJobs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Sub-Navegação por Abas do Módulo de Vagas */}
      <div className="mt-4">
        <VelzonSubTabs
          tabs={vagasSubTabs}
          activeTab={activeTab}
          onTabChange={(id) => handleSwitchTab(id as any)}
        />
      </div>

      {/* KPI Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <VelzonStatWidget
          title="Total de Vagas"
          value={stats.totalJobs.toLocaleString('pt-BR')}
          icon={<Briefcase className="w-6 h-6" />}
          variant="primary"
          trend={{ value: `${total}`, label: 'filtradas' }}
        />
        <VelzonStatWidget
          title="Vagas Ativas"
          value={stats.activeJobs.toLocaleString('pt-BR')}
          icon={<CheckCircle2 className="w-6 h-6" />}
          variant="success"
          trend={{
            value: stats.totalJobs > 0 ? `${Math.round((stats.activeJobs / stats.totalJobs) * 100)}%` : '0%',
            isPositive: true,
            label: 'do catálogo',
          }}
        />
        <VelzonStatWidget
          title="Ocultas / Expiradas"
          value={(stats.hiddenJobs + stats.expiredJobs).toLocaleString('pt-BR')}
          icon={<EyeOff className="w-6 h-6" />}
          variant="warning"
          trend={{
            value: `${stats.hiddenJobs} ocultas`,
            label: `${stats.expiredJobs} expiradas`,
          }}
        />
        <VelzonStatWidget
          title="Elegíveis p/ Expurgo"
          value={stats.eligibleForPurge.toLocaleString('pt-BR')}
          icon={<Database className="w-6 h-6" />}
          variant="danger"
          trend={{
            value: `${stats.retentionDays} dias`,
            isPositive: stats.eligibleForPurge === 0,
            label: 'retenção VPS',
          }}
        />
      </div>

      {/* Barra de Filtros & Operações ou Painel de Expurgo */}
      <VelzonCard noPadding>
        {activeTab === 'purge' ? (
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Governança de Retenção & Expurgo Definitivo no SQLite
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Remove vagas ocultadas ou expiradas há mais de {purgeRetention} dias. Esta operação executa <code>incremental_vacuum</code> e otimiza os índices B-Tree do banco.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Abrir Assistente de Expurgo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-[#e9ebec] dark:border-slate-800">
                <span className="text-xs text-slate-500 font-mono">Vagas Elegíveis para Expurgo</span>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {stats.eligibleForPurge.toLocaleString('pt-BR')}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Inativas há mais de {stats.retentionDays} dias</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-[#e9ebec] dark:border-slate-800">
                <span className="text-xs text-slate-500 font-mono">Janela de Retenção Ativa</span>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {purgeRetention} dias
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Configuração padrão do sistema</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-[#e9ebec] dark:border-slate-800">
                <span className="text-xs text-slate-500 font-mono">Status da Base de Dados</span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                  <Database className="w-5 h-5" />
                  WAL Ativo
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Auto-vacuum incremental habilitado</span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[#e9ebec] dark:border-slate-800 bg-white dark:bg-slate-800/60 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                Ações Rápidas de Limpeza
              </h4>
              <p className="text-xs text-slate-500">
                Você pode executar a pré-visualização ou disparar o expurgo seguro sem sair do painel:
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExecutePurge}
                  disabled={purging || stats.eligibleForPurge === 0}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {purging ? 'Expurgando registros...' : `Executar Expurgo Seguro (${stats.eligibleForPurge} vagas)`}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Configurar Dias de Retenção
                </button>
              </div>
              {purgeSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800 mt-2">
                  {purgeSuccessMessage}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 md:p-5 border-b border-[#e9ebec] dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Busca Textual */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por cargo, empresa ou stack..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-[#e9ebec] dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#405189]"
              />
            </div>

            {/* Filtro por Plataforma */}
            <div>
              <select
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-[#e9ebec] dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#405189]"
              >
                <option value="all">Todas as Plataformas</option>
                {Object.keys(stats.platformsCount).map((p) => (
                  <option key={p} value={p}>
                    {p} ({stats.platformsCount[p]})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Status */}
            <div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-[#e9ebec] dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#405189]"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativas</option>
                <option value="hidden">Ocultas (Soft-Hide)</option>
                <option value="expired">Expiradas</option>
              </select>
            </div>

            {/* Filtro por Modelo de Trabalho */}
            <div>
              <select
                value={workModel}
                onChange={(e) => {
                  setWorkModel(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-[#e9ebec] dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#405189]"
              >
                <option value="all">Todos os Modelos</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
                <option value="presencial">Presencial</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visualização Alternada: Tabela vs. Kanban */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono border-b border-[#e9ebec] dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Vaga & Empresa</th>
                  <th className="py-3 px-4">Plataforma</th>
                  <th className="py-3 px-4">Modelo & Local</th>
                  <th className="py-3 px-4">Publicação</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ebec] dark:divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#405189]" />
                      Carregando catálogo de vagas...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      Nenhuma vaga encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={job.title}>
                          {job.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{job.company}</span>
                          {job.required_seniority && (
                            <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                              {job.required_seniority}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {job.platform}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                            {job.work_model || 'Não especificado'}
                          </span>
                        </div>
                        {job.location && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[140px]">{job.location}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDate(job.published_at)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(job.status)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Disparo Rápido para Canais */}
                          <button
                            onClick={() => handleOpenDispatch(job)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Disparar vaga para canais (Telegram / WhatsApp)"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Link externo */}
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#405189] transition-colors"
                            title="Abrir URL original"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Soft-Hide Toggle */}
                          <button
                            onClick={() => handleToggleHide(job)}
                            className={`p-1.5 rounded transition-colors ${
                              job.status === 'hidden'
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-600'
                            }`}
                            title={job.status === 'hidden' ? 'Desocultar vaga' : 'Ocultar da busca pública (Soft-Hide)'}
                          >
                            {job.status === 'hidden' ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(job)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#405189] transition-colors"
                            title="Editar Vaga"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Excluir Definitivo */}
                          <button
                            onClick={() => setDeletingJob(job)}
                            className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Excluir Definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/30 min-h-[450px]">
            {/* Coluna 1: Ativas */}
            <div className="flex flex-col rounded-lg bg-slate-100/70 dark:bg-slate-800/40 border border-[#e9ebec] dark:border-slate-800 p-3">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#e9ebec] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Vagas Ativas</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {jobs.filter((j) => j.status === 'active').length}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {jobs.filter((j) => j.status === 'active').length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-mono">
                    Nenhuma vaga ativa na página.
                  </div>
                ) : (
                  jobs.filter((j) => j.status === 'active').map((job) => renderKanbanCard(job))
                )}
              </div>
            </div>

            {/* Coluna 2: Ocultas */}
            <div className="flex flex-col rounded-lg bg-slate-100/70 dark:bg-slate-800/40 border border-[#e9ebec] dark:border-slate-800 p-3">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#e9ebec] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Ocultas (Soft-Hide)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  {jobs.filter((j) => j.status === 'hidden').length}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {jobs.filter((j) => j.status === 'hidden').length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-mono">
                    Nenhuma vaga oculta na página.
                  </div>
                ) : (
                  jobs.filter((j) => j.status === 'hidden').map((job) => renderKanbanCard(job))
                )}
              </div>
            </div>

            {/* Coluna 3: Expiradas */}
            <div className="flex flex-col rounded-lg bg-slate-100/70 dark:bg-slate-800/40 border border-[#e9ebec] dark:border-slate-800 p-3">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#e9ebec] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Expiradas</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                  {jobs.filter((j) => j.status === 'expired').length}
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {jobs.filter((j) => j.status === 'expired').length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-mono">
                    Nenhuma vaga expirada na página.
                  </div>
                ) : (
                  jobs.filter((j) => j.status === 'expired').map((job) => renderKanbanCard(job))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rodapé de Paginação */}
        <div className="p-4 border-t border-[#e9ebec] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Mostrando {jobs.length > 0 ? (page - 1) * 25 + 1 : 0} até{' '}
            {Math.min(page * 25, total)} de {total} vagas
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              title="Página Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-medium">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              title="Próxima Página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
          </>
        )}
      </VelzonCard>

      {/* Modal de Edição Rápida */}
      <VelzonModal
        isOpen={Boolean(editingJob)}
        onClose={() => setEditingJob(null)}
        title="Edição Rápida de Vaga"
        description="Retifique falhas de scraping ou ajuste a visibilidade operacional da vaga."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setEditingJob(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#405189] hover:bg-[#364574] text-white transition-colors disabled:opacity-60"
            >
              {savingEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Salvar Alterações</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <VelzonLabel required>Título da Vaga</VelzonLabel>
            <VelzonInput
              type="text"
              value={editForm.title || ''}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <VelzonLabel required>Empresa</VelzonLabel>
              <VelzonInput
                type="text"
                value={editForm.company || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, company: e.target.value }))}
              />
            </div>
            <div>
              <VelzonLabel>Localização</VelzonLabel>
              <VelzonInput
                type="text"
                value={editForm.location || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <VelzonLabel>Modelo</VelzonLabel>
              <VelzonSelect
                value={editForm.work_model || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, work_model: e.target.value }))}
              >
                <option value="">Não informado</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
                <option value="presencial">Presencial</option>
              </VelzonSelect>
            </div>
            <div>
              <VelzonLabel>Senioridade</VelzonLabel>
              <VelzonInput
                type="text"
                placeholder="Ex: Júnior, Pleno"
                value={editForm.required_seniority || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, required_seniority: e.target.value }))}
              />
            </div>
            <div>
              <VelzonLabel>Status</VelzonLabel>
              <VelzonSelect
                value={editForm.status || 'active'}
                onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as any }))}
              >
                <option value="active">Ativa</option>
                <option value="hidden">Oculta (Soft-Hide)</option>
                <option value="expired">Expirada</option>
              </VelzonSelect>
            </div>
          </div>

          <div>
            <VelzonLabel>Stack Tecnológica</VelzonLabel>
            <VelzonInput
              type="text"
              placeholder="Ex: React, Node.js, TypeScript"
              value={editForm.tech_stack || ''}
              onChange={(e) => setEditForm((prev) => ({ ...prev, tech_stack: e.target.value }))}
            />
          </div>
        </div>
      </VelzonModal>

      {/* Modal de Expurgo Seguro */}
      <VelzonModal
        isOpen={isPurgeModalOpen}
        onClose={() => {
          setIsPurgeModalOpen(false);
          setPurgeSuccessMessage(null);
        }}
        title="Expurgo Seguro de Vagas (SQLite VPS)"
        description="Remoção em lotes de vagas expiradas antigas com conservação gradual de disco."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-slate-400 font-mono">
              PRAGMA incremental_vacuum
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsPurgeModalOpen(false);
                  setPurgeSuccessMessage(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
              >
                Fechar
              </button>
              <button
                onClick={handleExecutePurge}
                disabled={purging || stats.eligibleForPurge === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
              >
                {purging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirmar Expurgo</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {purgeSuccessMessage ? (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>{purgeSuccessMessage}</div>
            </div>
          ) : (
            <>
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Vagas elegíveis no momento:</span>
                  <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                    {stats.eligibleForPurge} vagas
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Janela de retenção:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={purgeRetention}
                      onChange={(e) => setPurgeRetention(Math.max(1, parseInt(e.target.value, 10) || 21))}
                      className="w-16 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-center font-mono font-bold bg-white dark:bg-slate-800"
                    />
                    <span className="text-slate-500">dias</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    <strong>Proteção de Candidatos:</strong> Vagas favoritadas ou com candidaturas ativas no Kanban (registradas em <code className="font-mono text-indigo-600">user_saved_jobs</code>) nunca serão deletadas.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Database className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <span>
                    <strong>Gestão de Disco VPS:</strong> A rotina roda em lotes de 500 registros e aciona <code className="font-mono text-blue-600">incremental_vacuum</code> para devolver espaço ao SO sem risco de duplicar o banco de dados.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </VelzonModal>

      {/* Modal de Exclusão Definitiva */}
      <VelzonModal
        isOpen={Boolean(deletingJob)}
        onClose={() => setDeletingJob(null)}
        title="Excluir Vaga Definitivamente?"
        description="Esta ação é irreversível e removerá o registro completamente do banco de dados."
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setDeletingJob(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60"
            >
              {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Excluir Definitivamente</span>
            </button>
          </div>
        }
      >
        {deletingJob && (
          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-100">{deletingJob.title}</div>
            <div className="text-slate-500 mt-1">{deletingJob.company} • {deletingJob.platform}</div>
          </div>
        )}
      </VelzonModal>

      {/* Modal de Disparo Rápido para Canais */}
      <VelzonModal
        isOpen={Boolean(dispatchJobTarget)}
        onClose={() => !dispatching && setDispatchJobTarget(null)}
        title="Disparar Vaga para Canais de Mensageria"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setDispatchJobTarget(null)}
              disabled={dispatching}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExecuteDispatch}
              disabled={dispatching || !dispatchMessage.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#405189] hover:bg-[#364473] text-white transition-colors disabled:opacity-60 shadow-xs"
            >
              {dispatching ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{dispatching ? 'Disparando...' : 'Confirmar e Disparar'}</span>
            </button>
          </div>
        }
      >
        {dispatchJobTarget && (
          <div className="space-y-4 text-xs">
            {/* Card resumo da vaga */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-[#e9ebec] dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{dispatchJobTarget.title}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-[#405189] dark:text-indigo-300 border border-indigo-200/50">
                    {dispatchJobTarget.platform}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {dispatchJobTarget.company} • {dispatchJobTarget.location || 'Brasil'} • {dispatchJobTarget.work_model || 'Não especificado'}
                </div>
              </div>
              {getStatusBadge(dispatchJobTarget.status)}
            </div>

            {/* Seletor de Canal */}
            <div>
              <VelzonLabel required>Canal de Comunicação</VelzonLabel>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setDispatchChannel('telegram')}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-colors ${
                    dispatchChannel === 'telegram'
                      ? 'border-[#405189] bg-[#405189]/5 text-[#405189] dark:border-indigo-400 dark:text-indigo-300'
                      : 'border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Send className="w-4 h-4 shrink-0 text-blue-500" />
                  <div>
                    <div className="font-bold text-xs">Telegram</div>
                    <div className="text-[10px] text-slate-400">Canal / Grupo Oficial</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchChannel('whatsapp')}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-colors ${
                    dispatchChannel === 'whatsapp'
                      ? 'border-[#405189] bg-[#405189]/5 text-[#405189] dark:border-indigo-400 dark:text-indigo-300'
                      : 'border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 text-emerald-500" />
                  <div>
                    <div className="font-bold text-xs">WhatsApp</div>
                    <div className="text-[10px] text-slate-400">Meta Cloud API / Lista</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Destinatário customizado (opcional) */}
            <div>
              <VelzonLabel>Destinatário / Grupo (Opcional)</VelzonLabel>
              <VelzonInput
                placeholder={
                  dispatchChannel === 'telegram'
                    ? 'Ex: @canal_vagas_tech ou deixe em branco para canal padrão'
                    : 'Ex: 5511999998888 ou deixe em branco para número padrão'
                }
                value={dispatchRecipient}
                onChange={(e) => setDispatchRecipient(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Deixe em branco para utilizar as credenciais e destinos oficiais configurados nas variáveis de ambiente.
              </p>
            </div>

            {/* Mensagem Formatada Oficial */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <VelzonLabel required>Prévia da Mensagem Oficial</VelzonLabel>
                <button
                  type="button"
                  onClick={() => setDispatchMessage(generateOfficialTemplate(dispatchJobTarget))}
                  className="text-[10px] text-[#405189] dark:text-indigo-400 hover:underline font-semibold"
                >
                  Restaurar Template
                </button>
              </div>
              <VelzonTextarea
                rows={9}
                value={dispatchMessage}
                onChange={(e) => setDispatchMessage(e.target.value)}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
        )}
      </VelzonModal>
    </AdminLayout>
  );
}
function ShieldAlert(props: any) {
  return <AlertTriangle {...props} />;
}
