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
  VelzonLabel,
  VelzonSubTabs,
  SubTabItem,
} from '@/components/admin/ui';
import {
  Users,
  Search,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  Unlock,
  KeyRound,
  LogIn,
  Crown,
  MapPin,
  Briefcase,
  DollarSign,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import type { AdminUserEntry, AdminUserStats, CandidateFullDetail } from '@/db/adminUserRepository';

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');

  // Sub-Aba Ativa: 'all' | 'pro' | 'free' | 'suspended'
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pro' | 'free' | 'suspended'>('all');

  const handleSwitchUserTab = (tabId: string) => {
    setActiveSubTab(tabId as any);
    setPage(1);
    if (tabId === 'all') {
      setTier('all');
      setStatus('all');
    } else if (tabId === 'pro') {
      setTier('pro');
      setStatus('all');
    } else if (tabId === 'free') {
      setTier('free');
      setStatus('all');
    } else if (tabId === 'suspended') {
      setTier('all');
      setStatus('suspended');
    }
  };

  // Métricas de topo
  const [stats, setStats] = useState<AdminUserStats>({
    totalUsers: 0,
    proUsers: 0,
    freeUsers: 0,
    suspendedUsers: 0,
    onboardedUsers: 0,
  });

  // Modais de Operação
  const [selectedUserDetail, setSelectedUserDetail] = useState<CandidateFullDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [resetUser, setResetUser] = useState<AdminUserEntry | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [suspendingUser, setSuspendingUser] = useState<AdminUserEntry | null>(null);
  const [togglingSuspension, setTogglingSuspension] = useState(false);

  const [tierTargetUser, setTierTargetUser] = useState<AdminUserEntry | null>(null);
  const [changingTier, setChangingTier] = useState(false);

  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search.trim()) params.set('search', search.trim());
      if (tier !== 'all') params.set('tier', tier);
      if (status !== 'all') params.set('status', status);
      if (role !== 'all') params.set('role', role);

      const res = await fetch(`/api/admin/usuarios?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, tier, status, role]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Ação: Abrir modal de detalhes
  const handleOpenDetail = async (user: AdminUserEntry) => {
    setLoadingDetail(true);
    setSelectedUserDetail(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedUserDetail(data.detail);
      } else {
        alert(data.error || 'Erro ao carregar detalhes do usuário');
      }
    } catch (err) {
      console.error('Error fetching user detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Ação: Impersonate
  const handleImpersonate = async (user: AdminUserEntry) => {
    setImpersonatingId(user.id);
    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}/impersonate`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        // Abre a área de candidato em nova aba
        window.open('/candidate', '_blank');
      } else {
        alert(data.error || 'Erro ao iniciar sessão de suporte');
      }
    } catch (err) {
      console.error('Error impersonating user:', err);
    } finally {
      setImpersonatingId(null);
    }
  };

  // Ação: Reset de Senha
  const handleExecuteResetPassword = async () => {
    if (!resetUser) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${resetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password' }),
      });
      const data = await res.json();

      if (data.success) {
        setGeneratedPassword(data.tempPassword);
      } else {
        alert(data.error || 'Erro ao redefinir senha');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
    } finally {
      setResettingPassword(false);
    }
  };

  // Ação: Copiar senha gerada
  const handleCopyPassword = () => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  // Ação: Confirmar Suspensão / Reativação
  const handleConfirmSuspension = async () => {
    if (!suspendingUser) return;
    setTogglingSuspension(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${suspendingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status' }),
      });
      const data = await res.json();

      if (data.success) {
        setSuspendingUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Erro ao alterar status');
      }
    } catch (err) {
      console.error('Error toggling suspension:', err);
    } finally {
      setTogglingSuspension(false);
    }
  };

  // Ação: Confirmar Alteração de Plano
  const handleConfirmChangeTier = async () => {
    if (!tierTargetUser) return;
    setChangingTier(true);
    const newTier = tierTargetUser.tier === 'premium' ? 'free' : 'premium';
    try {
      const res = await fetch(`/api/admin/usuarios/${tierTargetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_tier', tier: newTier }),
      });
      const data = await res.json();

      if (data.success) {
        setTierTargetUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Erro ao alterar plano');
      }
    } catch (err) {
      console.error('Error changing user tier:', err);
    } finally {
      setChangingTier(false);
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

  const usuariosSubTabs: SubTabItem[] = [
    {
      id: 'all',
      label: 'Todos os Usuários',
      icon: Users,
      badge: stats.totalUsers > 0 ? stats.totalUsers : undefined,
    },
    {
      id: 'pro',
      label: 'Assinantes PRO',
      icon: Crown,
      badge: stats.proUsers > 0 ? stats.proUsers : undefined,
      badgeVariant: 'warning',
    },
    {
      id: 'free',
      label: 'Contas Gratuitas',
      icon: UserCheck,
      badge: stats.freeUsers > 0 ? stats.freeUsers : undefined,
      badgeVariant: 'default',
    },
    {
      id: 'suspended',
      label: 'Suspensos / Bloqueados',
      icon: ShieldAlert,
      badge: stats.suspendedUsers > 0 ? stats.suspendedUsers : undefined,
      badgeVariant: 'danger',
    },
  ];

  return (
    <AdminLayout>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e9ebec] dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#405189]" />
            Gestão de Usuários & Suporte
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Controle de planos SaaS, suporte operacional, impersonate e auditoria de candidatos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Sub-Navegação por Abas do Módulo de Usuários */}
      <div className="mt-4 mb-6">
        <VelzonSubTabs
          tabs={usuariosSubTabs}
          activeTab={activeSubTab}
          onTabChange={handleSwitchUserTab}
        />
      </div>

      {/* KPI Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <VelzonStatWidget
          title="Total de Usuários"
          value={stats.totalUsers.toLocaleString('pt-BR')}
          icon={<Users className="w-6 h-6" />}
          variant="primary"
          trend={{ value: `${total}`, label: 'filtrados' }}
        />
        <VelzonStatWidget
          title="Assinantes Pro"
          value={stats.proUsers.toLocaleString('pt-BR')}
          icon={<Sparkles className="w-6 h-6" />}
          variant="success"
          trend={{
            value: stats.totalUsers > 0 ? `${Math.round((stats.proUsers / stats.totalUsers) * 100)}%` : '0%',
            isPositive: true,
            label: 'conversão SaaS',
          }}
        />
        <VelzonStatWidget
          title="Usuários Gratuitos"
          value={stats.freeUsers.toLocaleString('pt-BR')}
          icon={<UserCheck className="w-6 h-6" />}
          variant="info"
          trend={{
            value: `${stats.onboardedUsers} ativos`,
            label: 'onboardings',
          }}
        />
        <VelzonStatWidget
          title="Contas Suspensas"
          value={stats.suspendedUsers.toLocaleString('pt-BR')}
          icon={<ShieldAlert className="w-6 h-6" />}
          variant="danger"
          trend={{
            value: stats.suspendedUsers === 0 ? 'Sem bloqueios' : `${stats.suspendedUsers} suspensas`,
            isPositive: stats.suspendedUsers === 0,
            label: 'status de risco',
          }}
        />
      </div>

      {/* Barra de Filtros & Operações */}
      <VelzonCard noPadding>
        <div className="p-4 md:p-5 border-b border-[#e9ebec] dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Busca Textual */}
            <div className="lg:col-span-2">
              <VelzonInput
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Filtro por Plano */}
            <div>
              <VelzonSelect
                value={tier}
                onChange={(e) => {
                  setTier(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Todos os Planos</option>
                <option value="premium">Plano Pro (SaaS)</option>
                <option value="free">Plano Free</option>
              </VelzonSelect>
            </div>

            {/* Filtro por Status */}
            <div>
              <VelzonSelect
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativas</option>
                <option value="suspended">Suspensas</option>
              </VelzonSelect>
            </div>

            {/* Filtro por Papel */}
            <div>
              <VelzonSelect
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Todos os Papéis</option>
                <option value="CANDIDATE">Candidato</option>
                <option value="ADMIN">Administrador</option>
              </VelzonSelect>
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono border-b border-[#e9ebec] dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Plano SaaS</th>
                <th className="py-3 px-4">Papel</th>
                <th className="py-3 px-4">Onboarding</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Cadastro</th>
                <th className="py-3 px-4 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec] dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#405189]" />
                    Carregando base de usuários...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.force_password_change === 1 && (
                          <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono">
                            Troca Obrigatória
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.tier === 'premium' ? (
                        <VelzonBadge variant="success">Pro</VelzonBadge>
                      ) : (
                        <VelzonBadge variant="dark">Free</VelzonBadge>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.onboarding_completed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <Check className="w-3 h-3" />
                          Concluído
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">Pendente</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.status === 'suspended' ? (
                        <VelzonBadge variant="danger">Suspensa</VelzonBadge>
                      ) : (
                        <VelzonBadge variant="success">Ativa</VelzonBadge>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {/* Ver Perfil Completo */}
                        <button
                          onClick={() => handleOpenDetail(u)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#405189] transition-colors"
                          title="Inspecionar Perfil e Currículo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Alterar Plano Free ↔ Pro */}
                        <button
                          onClick={() => setTierTargetUser(u)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors"
                          title={u.tier === 'premium' ? 'Downgrade para Free' : 'Upgrade para Pro'}
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>

                        {/* Suspender / Reativar */}
                        <button
                          onClick={() => setSuspendingUser(u)}
                          className={`p-1.5 rounded transition-colors ${
                            u.status === 'suspended'
                              ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40'
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600'
                          }`}
                          title={u.status === 'suspended' ? 'Reativar Conta' : 'Suspender Conta'}
                        >
                          {u.status === 'suspended' ? (
                            <Unlock className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Reset de Senha */}
                        <button
                          onClick={() => {
                            setResetUser(u);
                            setGeneratedPassword(null);
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#405189] transition-colors"
                          title="Gerar Senha Temporária"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Impersonate */}
                        <button
                          onClick={() => handleImpersonate(u)}
                          disabled={impersonatingId === u.id || u.status === 'suspended'}
                          className="p-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-500 hover:text-[#405189] transition-colors disabled:opacity-40"
                          title="Acessar como Candidato (Suporte)"
                        >
                          {impersonatingId === u.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#405189]" />
                          ) : (
                            <LogIn className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação */}
        <div className="p-4 border-t border-[#e9ebec] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Mostrando {users.length > 0 ? (page - 1) * 20 + 1 : 0} até{' '}
            {Math.min(page * 20, total)} de {total} usuários
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
      </VelzonCard>

      {/* Modal: Detalhes Completos do Candidato */}
      <VelzonModal
        isOpen={Boolean(selectedUserDetail) || loadingDetail}
        onClose={() => setSelectedUserDetail(null)}
        title="Perfil do Candidato & Diagnóstico"
        description="Visão consolidada de dados cadastrais, preferências profissionais e análise de IA."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            {selectedUserDetail && (
              <button
                onClick={() => handleImpersonate(selectedUserDetail.user)}
                disabled={selectedUserDetail.user.status === 'suspended'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#405189] border border-indigo-200 transition-colors disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Acessar Área do Candidato</span>
              </button>
            )}
            <button
              onClick={() => setSelectedUserDetail(null)}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        }
      >
        {loadingDetail ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#405189]" />
            Carregando dados aprofundados do candidato...
          </div>
        ) : selectedUserDetail ? (
          <div className="space-y-4 text-xs">
            {/* Header com dados essenciais */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Nome</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{selectedUserDetail.user.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">E-mail</span>
                <span className="font-mono text-slate-600 dark:text-slate-300 truncate block">
                  {selectedUserDetail.user.email}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Plano</span>
                <span className="capitalize font-semibold text-emerald-600">
                  {selectedUserDetail.user.tier === 'premium' ? 'Plano Pro' : 'Plano Free'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Kanban</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {selectedUserDetail.savedJobsCount} salvas • {selectedUserDetail.appliedJobsCount} aplicadas
                </span>
              </div>
            </div>

            {/* Perfil Profissional */}
            {selectedUserDetail.profile ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">Cargo Alvo & Nível</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedUserDetail.profile.target_role || 'Não definido'} ({selectedUserDetail.profile.seniority || 'N/A'})
                    </span>
                  </div>
                  <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">Localização</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedUserDetail.profile.city || 'N/I'} - {selectedUserDetail.profile.state || 'N/I'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">Pretensão Salarial</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {selectedUserDetail.profile.expected_salary || 'A combinar'}
                    </span>
                  </div>
                </div>

                {/* Stacks e Habilidades */}
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase font-mono block">
                    Stack & Habilidades Mapeadas
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedUserDetail.profile.primary_stack.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px]">
                        {s}
                      </span>
                    ))}
                    {selectedUserDetail.profile.skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 font-mono">
                Perfil de candidato ainda não configurado pelo usuário.
              </div>
            )}

            {/* Currículo e Análise de IA */}
            {selectedUserDetail.resumes.length > 0 && selectedUserDetail.resumes[0].ai_analysis && (
              <div className="p-3.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Diagnóstico do Hermes IA para o Currículo</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedUserDetail.resumes[0].ai_analysis.summary}
                </p>
                {selectedUserDetail.resumes[0].ai_analysis.strengths?.length > 0 && (
                  <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                    <strong>Pontos Fortes:</strong> {selectedUserDetail.resumes[0].ai_analysis.strengths.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </VelzonModal>

      {/* Modal: Reset de Senha */}
      <VelzonModal
        isOpen={Boolean(resetUser)}
        onClose={() => {
          setResetUser(null);
          setGeneratedPassword(null);
        }}
        title="Reset de Senha pelo Suporte"
        description="Gera uma senha temporária segura para repasse ao candidato. A troca será exigida no próximo login."
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => {
                setResetUser(null);
                setGeneratedPassword(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
            >
              Fechar
            </button>
            {!generatedPassword && (
              <button
                onClick={handleExecuteResetPassword}
                disabled={resettingPassword}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#405189] hover:bg-[#364574] text-white transition-colors disabled:opacity-60"
              >
                {resettingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Gerar Senha Temporária</span>
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {resetUser && (
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-800 dark:text-slate-100">{resetUser.name}</div>
              <div className="text-slate-500 font-mono text-[11px]">{resetUser.email}</div>
            </div>
          )}

          {generatedPassword ? (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 block">
                Senha Temporária Ativada
              </span>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-base font-bold text-center border border-slate-800 tracking-wider">
                {generatedPassword}
              </pre>

              <button
                onClick={handleCopyPassword}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#405189]/30 bg-[#405189]/10 hover:bg-[#405189]/20 text-[#405189] dark:text-indigo-300 font-semibold transition-colors"
              >
                {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPassword ? 'Senha Copiada!' : 'Copiar Senha'}</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                Envie a senha acima ao usuário. No primeiro acesso, o sistema exigirá a definição de uma nova credencial.
              </p>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              Ao confirmar, a senha atual do candidato será invalidada e uma nova senha com hash scrypt será atribuída à conta.
            </p>
          )}
        </div>
      </VelzonModal>

      {/* Modal: Confirmação de Suspensão */}
      <VelzonModal
        isOpen={Boolean(suspendingUser)}
        onClose={() => setSuspendingUser(null)}
        title={suspendingUser?.status === 'suspended' ? 'Reativar Conta?' : 'Suspender Conta de Usuário?'}
        description="A suspensão impede o candidato de efetuar login ou acessar qualquer recurso da plataforma."
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setSuspendingUser(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSuspension}
              disabled={togglingSuspension}
              className={`flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-60 ${
                suspendingUser?.status === 'suspended'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {togglingSuspension && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{suspendingUser?.status === 'suspended' ? 'Reativar Conta' : 'Confirmar Suspensão'}</span>
            </button>
          </div>
        }
      >
        {suspendingUser && (
          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-100">{suspendingUser.name}</div>
            <div className="text-slate-500 font-mono text-[11px]">{suspendingUser.email}</div>
          </div>
        )}
      </VelzonModal>

      {/* Modal: Confirmação de Alteração de Plano */}
      <VelzonModal
        isOpen={Boolean(tierTargetUser)}
        onClose={() => setTierTargetUser(null)}
        title="Alterar Plano do Usuário"
        description="Alterne o plano contratado entre Free e Pro (Acesso a vagas ilimitadas e IA)."
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setTierTargetUser(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmChangeTier}
              disabled={changingTier}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
            >
              {changingTier && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>
                Confirmar para {tierTargetUser?.tier === 'premium' ? 'Plano Free' : 'Plano Pro'}
              </span>
            </button>
          </div>
        }
      >
        {tierTargetUser && (
          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-100">{tierTargetUser.name}</div>
            <div className="text-slate-500 font-mono text-[11px]">{tierTargetUser.email}</div>
            <div className="pt-2 text-[11px] text-slate-600 dark:text-slate-400">
              Plano atual:{' '}
              <strong className="text-indigo-600">
                {tierTargetUser.tier === 'premium' ? 'Pro' : 'Free'}
              </strong>{' '}
              ➔ Novo plano:{' '}
              <strong className="text-emerald-600">
                {tierTargetUser.tier === 'premium' ? 'Free' : 'Pro'}
              </strong>
            </div>
          </div>
        )}
      </VelzonModal>
    </AdminLayout>
  );
}
