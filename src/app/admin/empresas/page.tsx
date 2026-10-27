'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
  VelzonCard,
  VelzonBadge,
  VelzonStatWidget,
  VelzonModal,
  VelzonInput,
  VelzonSelect,
  VelzonTextarea,
  VelzonLabel,
  VelzonSubTabs,
  SubTabItem,
} from '@/components/admin/ui';
import {
  Building2,
  Search,
  RefreshCw,
  Plus,
  ExternalLink,
  Eye,
  Edit2,
  Trash2,
  Briefcase,
  ShieldCheck,
  Target,
  Users,
  Phone,
  Mail,
  Globe,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  Sparkles,
  Layers,
} from 'lucide-react';
import type {
  AdminCompany,
  AdminCompanyStats,
  AdminCompanyInput,
  CompanyLinkedJob,
} from '@/db/adminCompanyRepository';

export default function AdminEmpresasPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [planTier, setPlanTier] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'active_jobs_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Métricas de topo (KPIs)
  const [stats, setStats] = useState<AdminCompanyStats>({
    totalCompanies: 0,
    activePartners: 0,
    prospectCompanies: 0,
    totalMappedJobs: 0,
  });

  // Notificação Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sincronização em lote
  const [syncingJobs, setSyncingJobs] = useState(false);

  // Modais
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<AdminCompany | null>(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  const [formData, setFormData] = useState<AdminCompanyInput>({
    name: '',
    website: '',
    industry: 'Tecnologia',
    description: '',
    recruiter_name: '',
    recruiter_email: '',
    recruiter_phone: '',
    plan_tier: 'free',
    status: 'active',
    featured_job_limit: 0,
    notes: '',
  });

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    company: AdminCompany;
    jobs: CompanyLinkedJob[];
    totalJobs: number;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminCompany | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Exibir Toast temporário
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Buscar empresas e estatísticas
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      if (planTier !== 'all') params.set('planTier', planTier);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/admin/empresas?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCompanies(data.companies || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.error || 'Erro ao carregar empresas', 'error');
      }
    } catch (err) {
      console.error('Erro na requisição de empresas:', err);
      showToast('Falha na comunicação com o servidor', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, planTier, sortBy, sortOrder]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Ação: Sincronizar empresas a partir das vagas
  const handleSyncJobs = async () => {
    setSyncingJobs(true);
    try {
      const res = await fetch('/api/admin/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_jobs' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Empresas sincronizadas com sucesso!', 'success');
        fetchCompanies();
      } else {
        showToast(data.error || 'Falha ao sincronizar empresas', 'error');
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      showToast('Erro ao sincronizar empresas das vagas', 'error');
    } finally {
      setSyncingJobs(false);
    }
  };

  // Ação: Abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      website: '',
      industry: 'Tecnologia',
      description: '',
      recruiter_name: '',
      recruiter_email: '',
      recruiter_phone: '',
      plan_tier: 'free',
      status: 'active',
      featured_job_limit: 0,
      notes: '',
    });
    setShowFormModal(true);
  };

  // Ação: Abrir modal de edição
  const handleOpenEditModal = (comp: AdminCompany) => {
    setEditingCompany(comp);
    setFormData({
      name: comp.name,
      website: comp.website || '',
      industry: comp.industry || 'Tecnologia',
      description: comp.description || '',
      recruiter_name: comp.recruiter_name || '',
      recruiter_email: comp.recruiter_email || '',
      recruiter_phone: comp.recruiter_phone || '',
      plan_tier: comp.plan_tier,
      status: comp.status,
      featured_job_limit: comp.featured_job_limit || 0,
      notes: comp.notes || '',
    });
    setShowFormModal(true);
  };

  // Ação: Salvar (Criar ou Atualizar)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('O nome da empresa é obrigatório', 'error');
      return;
    }

    setSubmittingForm(true);
    try {
      const isEdit = !!editingCompany;
      const url = isEdit ? `/api/admin/empresas/${editingCompany.id}` : '/api/admin/empresas';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        showToast(
          isEdit ? 'Empresa atualizada com sucesso!' : 'Empresa cadastrada com sucesso!',
          'success'
        );
        setShowFormModal(false);
        fetchCompanies();
      } else {
        showToast(data.error || 'Erro ao salvar empresa', 'error');
      }
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      showToast('Erro interno ao processar cadastro', 'error');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Ação: Abrir modal de detalhes
  const handleOpenDetailModal = async (comp: AdminCompany) => {
    setDetailLoading(true);
    setSelectedDetail(null);
    setDetailModalOpen(true);
    try {
      const res = await fetch(`/api/admin/empresas/${comp.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDetail({
          company: data.company,
          jobs: data.jobs || [],
          totalJobs: data.totalJobs || 0,
        });
      } else {
        showToast(data.error || 'Erro ao buscar detalhes da empresa', 'error');
      }
    } catch (err) {
      console.error('Erro ao abrir detalhes:', err);
      showToast('Falha na comunicação ao carregar detalhes', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Ação: Confirmar e excluir empresa
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/empresas/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('Empresa excluída com sucesso', 'success');
        setDeleteTarget(null);
        fetchCompanies();
      } else {
        showToast(data.error || 'Erro ao remover empresa', 'error');
      }
    } catch (err) {
      console.error('Erro ao deletar:', err);
      showToast('Erro interno ao excluir empresa', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Formatador de WhatsApp
  const formatWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    return `https://wa.me/${number}`;
  };

  // Renderizadores de Badges
  const renderPlanBadge = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return <VelzonBadge variant="primary">Enterprise</VelzonBadge>;
      case 'startup':
        return <VelzonBadge variant="info">Startup</VelzonBadge>;
      case 'free':
      default:
        return <VelzonBadge variant="dark">Free</VelzonBadge>;
    }
  };

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ativo
          </span>
        );
      case 'prospect':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Prospecção
          </span>
        );
      case 'inactive':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inativo
          </span>
        );
    }
  };

  const empresasSubTabs: SubTabItem[] = [
    {
      id: 'all',
      label: 'Todas as Empresas',
      icon: Building2,
      badge: stats.totalCompanies > 0 ? stats.totalCompanies : undefined,
    },
    {
      id: 'active',
      label: 'Parceiras Ativas',
      icon: ShieldCheck,
      badge: stats.activePartners > 0 ? stats.activePartners : undefined,
      badgeVariant: 'success',
    },
    {
      id: 'prospect',
      label: 'Prospecção & Livres',
      icon: Target,
      badge: stats.prospectCompanies > 0 ? stats.prospectCompanies : undefined,
      badgeVariant: 'default',
    },
  ];

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e9ebec] dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#405189]" />
            Gestão de Empresas & Parcerias B2B
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Mapeamento corporativo, relacionamento comercial, planos parceiros e histórico de vagas indexadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncJobs}
            disabled={syncingJobs}
            title="Importa empresas inéditas que possuem vagas na plataforma"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingJobs ? 'animate-spin' : ''}`} />
            <span>{syncingJobs ? 'Sincronizando...' : 'Sincronizar Vagas'}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#405189] text-white hover:bg-[#364473] transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Empresa</span>
          </button>
        </div>
      </div>

      {/* Sub-Navegação por Abas do Módulo de Empresas */}
      <div className="mt-4 mb-6">
        <VelzonSubTabs
          tabs={empresasSubTabs}
          activeTab={status}
          onTabChange={(tabId) => {
            setStatus(tabId);
            setPage(1);
          }}
        />
      </div>

      {/* 4 KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <VelzonStatWidget
          title="Total de Empresas"
          value={stats.totalCompanies.toLocaleString('pt-BR')}
          icon={<Building2 className="w-5 h-5" />}
          variant="primary"
        />
        <VelzonStatWidget
          title="Parceiras Ativas"
          value={stats.activePartners.toLocaleString('pt-BR')}
          icon={<ShieldCheck className="w-5 h-5" />}
          variant="success"
        />
        <VelzonStatWidget
          title="Em Prospecção"
          value={stats.prospectCompanies.toLocaleString('pt-BR')}
          icon={<Target className="w-5 h-5" />}
          variant="warning"
        />
        <VelzonStatWidget
          title="Vagas Vinculadas"
          value={stats.totalMappedJobs.toLocaleString('pt-BR')}
          icon={<Briefcase className="w-5 h-5" />}
          variant="info"
        />
      </div>

      {/* Barra de Busca e Filtros Rápidos */}
      <VelzonCard className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <VelzonLabel>Buscar Empresa</VelzonLabel>
            <VelzonInput
              placeholder="Buscar por nome, website, setor ou recrutador..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-3.5 h-3.5" />}
            />
          </div>

          <div className="md:col-span-3">
            <VelzonLabel>Plano B2B</VelzonLabel>
            <VelzonSelect
              value={planTier}
              onChange={(e) => {
                setPlanTier(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Todos os Planos' },
                { value: 'free', label: 'Plano Gratuito (Free)' },
                { value: 'startup', label: 'Plano Startup' },
                { value: 'enterprise', label: 'Plano Enterprise' },
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <VelzonLabel>Status Comercial</VelzonLabel>
            <VelzonSelect
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Todos os Status' },
                { value: 'active', label: 'Ativo' },
                { value: 'prospect', label: 'Prospecção' },
                { value: 'inactive', label: 'Inativo' },
              ]}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              onClick={() => {
                setSearch('');
                setStatus('all');
                setPlanTier('all');
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </VelzonCard>

      {/* Tabela de Empresas */}
      <VelzonCard className="overflow-hidden mb-6">
        <div className="p-4 border-b border-[#e9ebec] dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Empresas Cadastradas
            </h2>
            <span className="text-xs text-slate-400 font-mono">({total} registros)</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Ordenar:</span>
            <button
              onClick={() => {
                if (sortBy === 'name') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('name');
                  setSortOrder('asc');
                }
              }}
              className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                sortBy === 'name'
                  ? 'bg-[#405189]/10 text-[#405189] border-[#405189]/30 dark:text-indigo-400'
                  : 'border-[#e9ebec] dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Nome {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'active_jobs_count') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('active_jobs_count');
                  setSortOrder('desc');
                }
              }}
              className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                sortBy === 'active_jobs_count'
                  ? 'bg-[#405189]/10 text-[#405189] border-[#405189]/30 dark:text-indigo-400'
                  : 'border-[#e9ebec] dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Vagas {sortBy === 'active_jobs_count' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-[#e9ebec] dark:border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Setor / Indústria</th>
                <th className="py-3 px-4">Plano B2B</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Contato / Recrutador</th>
                <th className="py-3 px-4 text-center">Vagas Ativas</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec] dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#405189]" />
                    Carregando base de empresas B2B...
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    Nenhuma empresa encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                companies.map((comp) => {
                  const initial = comp.name.trim().charAt(0).toUpperCase();
                  return (
                    <tr
                      key={comp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Empresa (Avatar + Nome + Website) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-slate-800 text-[#405189] dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                              <span>{comp.name}</span>
                              {comp.website && (
                                <a
                                  href={
                                    comp.website.startsWith('http')
                                      ? comp.website
                                      : `https://${comp.website}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Acessar website oficial"
                                  className="text-slate-400 hover:text-[#405189] dark:hover:text-indigo-400 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              slug: {comp.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Setor */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {comp.industry || 'Tecnologia'}
                        </span>
                      </td>

                      {/* Plano B2B */}
                      <td className="py-3 px-4">{renderPlanBadge(comp.plan_tier)}</td>

                      {/* Status */}
                      <td className="py-3 px-4">{renderStatusBadge(comp.status)}</td>

                      {/* Contato do Recrutador */}
                      <td className="py-3 px-4">
                        {comp.recruiter_name || comp.recruiter_email || comp.recruiter_phone ? (
                          <div className="space-y-0.5">
                            {comp.recruiter_name && (
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {comp.recruiter_name}
                              </div>
                            )}
                            {comp.recruiter_email && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{comp.recruiter_email}</span>
                              </div>
                            )}
                            {comp.recruiter_phone && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-500" />
                                <a
                                  href={formatWhatsAppLink(comp.recruiter_phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline text-emerald-600 dark:text-emerald-400"
                                >
                                  {comp.recruiter_phone}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Não informado</span>
                        )}
                      </td>

                      {/* Vagas Ativas */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            (comp.active_jobs_count || 0) > 0
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          }`}
                        >
                          {comp.active_jobs_count || 0}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetailModal(comp)}
                            title="Ver vagas e histórico corporativo"
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(comp)}
                            title="Editar empresa"
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(comp)}
                            title="Excluir cadastro da empresa"
                            className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-4 border-t border-[#e9ebec] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Mostrando página <span className="font-bold text-slate-800 dark:text-slate-200">{page}</span> de{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span> ({total} empresas)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-md border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </VelzonCard>

      {/* Modal de Criação / Edição de Empresa */}
      <VelzonModal
        isOpen={showFormModal}
        onClose={() => !submittingForm && setShowFormModal(false)}
        title={editingCompany ? `Editar Empresa: ${editingCompany.name}` : 'Cadastrar Nova Empresa B2B'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveForm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <VelzonLabel required>Nome da Empresa</VelzonLabel>
              <VelzonInput
                placeholder="Ex: Nubank, Totvs, Stefanini..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <VelzonLabel>Website / Domínio</VelzonLabel>
              <VelzonInput
                placeholder="Ex: https://empresa.com.br"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                leftIcon={<Globe className="w-3.5 h-3.5" />}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <VelzonLabel>Setor / Indústria</VelzonLabel>
              <VelzonInput
                placeholder="Ex: Fintech, E-commerce, Software"
                value={formData.industry || ''}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              />
            </div>

            <div>
              <VelzonLabel>Plano B2B</VelzonLabel>
              <VelzonSelect
                value={formData.plan_tier || 'free'}
                onChange={(e) =>
                  setFormData({ ...formData, plan_tier: e.target.value as any })
                }
                options={[
                  { value: 'free', label: 'Gratuito (Free)' },
                  { value: 'startup', label: 'Plano Startup' },
                  { value: 'enterprise', label: 'Plano Enterprise' },
                ]}
              />
            </div>

            <div>
              <VelzonLabel>Status da Parceria</VelzonLabel>
              <VelzonSelect
                value={formData.status || 'active'}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
                options={[
                  { value: 'active', label: 'Ativo' },
                  { value: 'prospect', label: 'Prospecção' },
                  { value: 'inactive', label: 'Inativo' },
                ]}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#e9ebec] dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Informações de Contato do Recrutador
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <VelzonLabel>Nome do Responsável</VelzonLabel>
                <VelzonInput
                  placeholder="Ex: Mariana Silva"
                  value={formData.recruiter_name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, recruiter_name: e.target.value })
                  }
                  leftIcon={<Users className="w-3.5 h-3.5" />}
                />
              </div>

              <div>
                <VelzonLabel>E-mail de Contato</VelzonLabel>
                <VelzonInput
                  type="email"
                  placeholder="Ex: vagas@empresa.com.br"
                  value={formData.recruiter_email || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, recruiter_email: e.target.value })
                  }
                  leftIcon={<Mail className="w-3.5 h-3.5" />}
                />
              </div>

              <div>
                <VelzonLabel>WhatsApp / Telefone</VelzonLabel>
                <VelzonInput
                  placeholder="Ex: (11) 98765-4321"
                  value={formData.recruiter_phone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, recruiter_phone: e.target.value })
                  }
                  leftIcon={<Phone className="w-3.5 h-3.5" />}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#e9ebec] dark:border-slate-800">
            <div>
              <VelzonLabel>Descrição Institucional</VelzonLabel>
              <VelzonTextarea
                rows={3}
                placeholder="Breve descrição das atividades e cultura da organização..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <VelzonLabel>Anotações Internas (CRM / Histórico)</VelzonLabel>
              <VelzonTextarea
                rows={3}
                placeholder="Notas de prospecção, status de negociação, preferências de contratação..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e9ebec] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              disabled={submittingForm}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingForm}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#405189] text-white hover:bg-[#364473] transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {submittingForm && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}</span>
            </button>
          </div>
        </form>
      </VelzonModal>

      {/* Modal de Detalhes da Empresa e Histórico de Vagas */}
      <VelzonModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedDetail ? `Perfil B2B: ${selectedDetail.company.name}` : 'Detalhes da Empresa'}
        maxWidth="lg"
      >
        {detailLoading ? (
          <div className="py-12 text-center text-slate-400 font-mono">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#405189]" />
            Carregando histórico corporativo e vagas vinculadas...
          </div>
        ) : selectedDetail ? (
          <div className="space-y-6">
            {/* Header da Empresa */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#e9ebec] dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#405189] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {selectedDetail.company.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {selectedDetail.company.name}
                    {renderPlanBadge(selectedDetail.company.plan_tier)}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{selectedDetail.company.industry || 'Tecnologia'}</span>
                    <span>•</span>
                    <span>slug: {selectedDetail.company.slug}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderStatusBadge(selectedDetail.company.status)}
                {selectedDetail.company.website && (
                  <a
                    href={
                      selectedDetail.company.website.startsWith('http')
                        ? selectedDetail.company.website
                        : `https://${selectedDetail.company.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Grid de Informações de Contato e CRM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-[#e9ebec] dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Contato de Recrutamento
                </h4>
                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold">
                      {selectedDetail.company.recruiter_name || 'Não informado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedDetail.company.recruiter_email || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    {selectedDetail.company.recruiter_phone ? (
                      <a
                        href={formatWhatsAppLink(selectedDetail.company.recruiter_phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        {selectedDetail.company.recruiter_phone} (Abrir WhatsApp)
                      </a>
                    ) : (
                      <span>Não informado</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[#e9ebec] dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Anotações Internas (CRM)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedDetail.company.notes || 'Nenhuma observação interna cadastrada.'}
                </p>
              </div>
            </div>

            {/* Vagas Ativas Vinculadas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#e9ebec] dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#405189]" />
                  <span>Vagas Vinculadas ({selectedDetail.totalJobs})</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Últimas 25 oportunidades indexadas
                </span>
              </div>

              {selectedDetail.jobs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  Nenhuma vaga ativa indexada para esta empresa no momento.
                </div>
              ) : (
                <div className="divide-y divide-[#e9ebec] dark:divide-slate-800 max-h-64 overflow-y-auto pr-1">
                  {selectedDetail.jobs.map((job) => (
                    <div
                      key={job.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {job.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-medium text-indigo-500">{job.platform}</span>
                          <span>•</span>
                          <span>{job.work_model || 'Não especificado'}</span>
                          <span>•</span>
                          <span>{job.location || 'Brasil'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(job.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-[#405189] transition-colors"
                            title="Ver link original da vaga"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </VelzonModal>

      {/* Modal de Confirmação de Exclusão */}
      <VelzonModal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Confirmar Exclusão de Empresa"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Tem certeza de que deseja remover a empresa{' '}
            <strong className="text-slate-900 dark:text-slate-100 font-bold">
              {deleteTarget?.name}
            </strong>{' '}
            do cadastro B2B?
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            * Esta ação remove apenas o cadastro comercial da empresa. As vagas indexadas no BuscaVag continuarão preservadas.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e9ebec] dark:border-slate-800">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
            >
              {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Excluir Cadastro</span>
            </button>
          </div>
        </div>
      </VelzonModal>
    </AdminLayout>
  );
}
