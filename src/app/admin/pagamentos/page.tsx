'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import {
  VelzonCard,
  VelzonBadge,
  VelzonStatWidget,
  VelzonModal,
  VelzonInput,
  VelzonTextarea,
  VelzonSelect,
  VelzonLabel,
  VelzonSubTabs,
  SubTabItem,
} from '@/components/admin/ui';
import {
  DollarSign,
  TrendingUp,
  Crown,
  AlertTriangle,
  Search,
  RefreshCw,
  Gift,
  RotateCcw,
  Eye,
  FileText,
  Copy,
  Check,
  CreditCard,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import type {
  AdminPaymentEntry,
  AdminSubscriptionEntry,
  AdminPaymentStats,
  PaymentWebhookRecord,
} from '@/db/adminPaymentRepository';

export default function AdminPagamentosPage() {
  const [activeTab, setActiveTab] = useState<'transacoes' | 'assinaturas' | 'webhooks'>('transacoes');

  // Estado Transações
  const [payments, setPayments] = useState<AdminPaymentEntry[]>([]);
  const [totalPayments, setTotalPayments] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Filtros de Transações
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [gateway, setGateway] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');

  // Métricas Globais
  const [stats, setStats] = useState<AdminPaymentStats>({
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    averageTicket: 0,
    activeSubscribers: 0,
    defaultCount: 0,
    totalPaymentsCount: 0,
  });

  // Estado Assinaturas
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionEntry[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subPage, setSubPage] = useState(1);
  const [totalSubs, setTotalSubs] = useState(0);
  const [totalSubPages, setTotalSubPages] = useState(1);

  // Estado Webhooks
  const [webhooks, setWebhooks] = useState<PaymentWebhookRecord[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<PaymentWebhookRecord | null>(null);

  // Modais de Operação
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentEntry | null>(null);
  const [refundTarget, setRefundTarget] = useState<AdminPaymentEntry | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  // Modal Concessão de Cortesia
  const [showCourtesyModal, setShowCourtesyModal] = useState(false);
  const [courtesyUserId, setCourtesyUserId] = useState('');
  const [courtesyDays, setCourtesyDays] = useState('30');
  const [courtesyReason, setCourtesyReason] = useState('');
  const [grantingCourtesy, setGrantingCourtesy] = useState(false);

  // Feedback de Cópia
  const [copiedText, setCopiedText] = useState(false);

  // 1. Busca Transações
  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      if (gateway !== 'all') params.set('gateway', gateway);
      if (paymentMethod !== 'all') params.set('payment_method', paymentMethod);

      const res = await fetch(`/api/admin/pagamentos?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPayments(data.payments || []);
        setTotalPayments(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  }, [page, search, status, gateway, paymentMethod]);

  // 2. Busca Assinaturas
  const fetchSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true);
    try {
      const res = await fetch(`/api/admin/pagamentos/assinaturas?page=${subPage}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
        setTotalSubs(data.total || 0);
        setTotalSubPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, [subPage]);

  // 3. Busca Webhooks
  const fetchWebhooks = useCallback(async () => {
    setLoadingWebhooks(true);
    try {
      const res = await fetch('/api/admin/pagamentos/webhooks?limit=50');
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      console.error('Error fetching webhooks:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (activeTab === 'assinaturas') {
      fetchSubscriptions();
    } else if (activeTab === 'webhooks') {
      fetchWebhooks();
    }
  }, [activeTab, fetchSubscriptions, fetchWebhooks]);

  // Ação de Estorno
  const handleExecuteRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const res = await fetch(`/api/admin/pagamentos/${refundTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refund', reason: refundReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRefundTarget(null);
        setRefundReason('');
        fetchPayments();
      } else {
        alert(data.error || 'Erro ao realizar estorno.');
      }
    } catch (err) {
      console.error('Error refunding payment:', err);
      alert('Erro inesperado de comunicação.');
    } finally {
      setRefunding(false);
    }
  };

  // Ação de Concessão de Cortesia
  const handleGrantCourtesy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtesyUserId.trim()) return;
    setGrantingCourtesy(true);
    try {
      const res = await fetch('/api/admin/pagamentos/cortesia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: courtesyUserId.trim(),
          days: parseInt(courtesyDays, 10),
          reason: courtesyReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCourtesyModal(false);
        setCourtesyUserId('');
        setCourtesyReason('');
        fetchPayments();
      } else {
        alert(data.error || 'Erro ao conceder cortesia.');
      }
    } catch (err) {
      console.error('Error granting courtesy:', err);
      alert('Erro inesperado de comunicação.');
    } finally {
      setGrantingCourtesy(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Formatador de Moeda
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Helper de Badge por Status
  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'paid':
        return <VelzonBadge variant="success">Pago</VelzonBadge>;
      case 'pending':
        return <VelzonBadge variant="warning">Pendente</VelzonBadge>;
      case 'refunded':
        return <VelzonBadge variant="danger">Reembolsado</VelzonBadge>;
      case 'failed':
        return <VelzonBadge variant="danger">Falhou</VelzonBadge>;
      case 'courtesy':
        return <VelzonBadge variant="primary">Cortesia Pro</VelzonBadge>;
      default:
        return <VelzonBadge variant="dark">{st}</VelzonBadge>;
    }
  };

  const pagamentosSubTabs: SubTabItem[] = [
    {
      id: 'transacoes',
      label: 'Transações & Faturas',
      icon: CreditCard,
      badge: totalPayments > 0 ? totalPayments : undefined,
    },
    {
      id: 'assinaturas',
      label: 'Assinaturas Recorrentes',
      icon: Layers,
      badge: totalSubs > 0 ? totalSubs : undefined,
      badgeVariant: 'warning',
    },
    {
      id: 'webhooks',
      label: 'Logs de Webhooks',
      icon: Webhook,
      badge: webhooks.length > 0 ? webhooks.length : undefined,
    },
  ];

  return (
    <AdminLayout>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e9ebec] dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#405189]" />
            Gestão Financeira & Pagamentos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Dashboard de receita recorrente (MRR), gestão de faturamento, conciliação e webhooks de pagamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCourtesyModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#405189] text-white hover:bg-[#364473] transition-all shadow-xs"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>+ Conceder Cortesia Pro</span>
          </button>
          <button
            onClick={() => {
              if (activeTab === 'transacoes') fetchPayments();
              else if (activeTab === 'assinaturas') fetchSubscriptions();
              else fetchWebhooks();
            }}
            title="Recarregar dados"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Sub-Navegação por Abas do Módulo Financeiro */}
      <div className="mt-4 mb-6">
        <VelzonSubTabs
          tabs={pagamentosSubTabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
        />
      </div>

      {/* 4 StatWidgets Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <VelzonStatWidget
          title="MRR (Mensal Recorrente)"
          value={formatMoney(stats.mrr)}
          icon={<DollarSign className="w-6 h-6" />}
          variant="primary"
          trend={{
            value: `ARR: ${formatMoney(stats.arr)}`,
            isPositive: true,
          }}
        />
        <VelzonStatWidget
          title="Receita Total Paga"
          value={formatMoney(stats.totalRevenue)}
          icon={<TrendingUp className="w-6 h-6" />}
          variant="success"
          trend={{
            value: `Ticket Médio: ${formatMoney(stats.averageTicket)}`,
            isPositive: true,
          }}
        />
        <VelzonStatWidget
          title="Assinantes Ativos Pro"
          value={stats.activeSubscribers}
          icon={<Crown className="w-6 h-6" />}
          variant="info"
          trend={{
            value: `${stats.totalPaymentsCount} transações`,
            isPositive: true,
          }}
        />
        <VelzonStatWidget
          title="Inadimplência / Falhas"
          value={stats.defaultCount}
          icon={<AlertTriangle className="w-6 h-6" />}
          variant="danger"
          trend={{
            value: stats.defaultCount === 0 ? 'Zero falhas' : 'Requer atenção',
            isPositive: stats.defaultCount === 0,
          }}
        />
      </div>

      {/* Card Principal com Abas e Conteúdo */}
      <VelzonCard
        title="Painel de Controle Financeiro"
        subtitle="Gerenciamento de faturamento, conciliação e eventos de gateways de pagamento"
      >
        {/* Navegação entre Abas */}
        <div className="mb-6">
          <VelzonSubTabs
            tabs={pagamentosSubTabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as any)}
          />
        </div>

        {/* ABA 1: TRANSAÇÕES */}
        {activeTab === 'transacoes' && (
          <div>
            {/* Barra de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <VelzonInput
                type="text"
                placeholder="Buscar por cliente, e-mail ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />

              <VelzonSelect
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Status: Todos</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="refunded">Reembolsado</option>
                <option value="courtesy">Cortesia Pro</option>
                <option value="failed">Falha</option>
              </VelzonSelect>

              <VelzonSelect
                value={gateway}
                onChange={(e) => {
                  setGateway(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Gateway: Todos</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="stripe">Stripe</option>
                <option value="asaas">Asaas</option>
                <option value="manual">Manual / Cortesia</option>
              </VelzonSelect>

              <VelzonSelect
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Método: Todos</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="boleto">Boleto</option>
                <option value="manual">Manual</option>
              </VelzonSelect>
            </div>

            {/* Tabela de Transações */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Transação / Gateway</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Plano</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPayments ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#405189]" />
                        Carregando transações financeiras...
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Nenhuma transação encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-medium text-slate-900">{p.id.substring(0, 16)}...</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">{p.gateway}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{p.user_name}</div>
                          <div className="text-[11px] text-slate-500">{p.user_email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700 uppercase">{p.plan_tier}</span>
                          <span className="text-[11px] text-slate-400 block capitalize">{p.billing_cycle === 'annual' ? 'Anual' : 'Mensal'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-medium text-slate-600">
                            {p.payment_method === 'credit_card' ? 'Cartão' : p.payment_method.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {formatMoney(p.amount)}
                        </td>
                        <td className="py-3 px-4">{renderStatusBadge(p.status)}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(p.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedPayment(p)}
                              title="Inspecionar detalhes da transação"
                              className="p-1.5 text-slate-500 hover:text-[#405189] hover:bg-[#405189]/10 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {p.status === 'paid' && (
                              <button
                                onClick={() => setRefundTarget(p)}
                                title="Estornar pagamento"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
              <div>
                Mostrando <span className="font-semibold text-slate-700">{payments.length}</span> de{' '}
                <span className="font-semibold text-slate-700">{totalPayments}</span> transações
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-semibold text-slate-700">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: ASSINATURAS RECORRENTES */}
        {activeTab === 'assinaturas' && (
          <div>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Assinante</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">Plano</th>
                    <th className="py-3 px-4">Recorrência</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Período Vigente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingSubscriptions ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#405189]" />
                        Carregando assinaturas...
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Nenhuma assinatura ativa ou registrada no momento.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{s.user_name}</div>
                          <div className="text-[11px] text-slate-500">{s.user_email}</div>
                        </td>
                        <td className="py-3 px-4 uppercase text-slate-600 font-medium">{s.gateway}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900 uppercase">{s.tier}</td>
                        <td className="py-3 px-4 capitalize text-slate-600">{s.billing_cycle === 'annual' ? 'Anual' : 'Mensal'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{formatMoney(s.amount)}</td>
                        <td className="py-3 px-4">
                          {s.status === 'active' ? (
                            <VelzonBadge variant="success">Ativa</VelzonBadge>
                          ) : s.status === 'canceled' ? (
                            <VelzonBadge variant="danger">Cancelada</VelzonBadge>
                          ) : (
                            <VelzonBadge variant="warning">{s.status}</VelzonBadge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(s.current_period_start).toLocaleDateString('pt-BR')} até{' '}
                          <span className="font-semibold text-slate-700">
                            {new Date(s.current_period_end).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação Assinaturas */}
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
              <div>
                Mostrando <span className="font-semibold text-slate-700">{subscriptions.length}</span> de{' '}
                <span className="font-semibold text-slate-700">{totalSubs}</span> assinaturas
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={subPage <= 1}
                  onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-semibold text-slate-700">
                  {subPage} / {totalSubPages}
                </span>
                <button
                  disabled={subPage >= totalSubPages}
                  onClick={() => setSubPage((p) => Math.min(totalSubPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: LOGS DE WEBHOOKS */}
        {activeTab === 'webhooks' && (
          <div>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ID Evento</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">Tipo do Evento</th>
                    <th className="py-3 px-4">Processado</th>
                    <th className="py-3 px-4">Recebido Em</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingWebhooks ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#405189]" />
                        Carregando webhooks...
                      </td>
                    </tr>
                  ) : webhooks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Nenhum evento de webhook recebido ainda.
                      </td>
                    </tr>
                  ) : (
                    webhooks.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{w.id}</td>
                        <td className="py-3 px-4 font-medium uppercase text-slate-700">{w.gateway}</td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-slate-100 text-[#405189] px-2 py-0.5 rounded font-mono font-semibold">
                            {w.event_type}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <VelzonBadge variant="success">Processado</VelzonBadge>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(w.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedWebhook(w)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Payload
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </VelzonCard>

      {/* MODAL 1: DETALHES DA TRANSAÇÃO */}
      {selectedPayment && (
        <VelzonModal
          isOpen={Boolean(selectedPayment)}
          onClose={() => setSelectedPayment(null)}
          title="Detalhes da Transação Financeira"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-400 block">ID da Transação:</span>
                <span className="font-mono font-semibold text-slate-900">{selectedPayment.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <div className="mt-0.5">{renderStatusBadge(selectedPayment.status)}</div>
              </div>
              <div>
                <span className="text-slate-400 block">Cliente:</span>
                <span className="font-semibold text-slate-900">{selectedPayment.user_name}</span>
                <span className="block text-slate-500 text-[11px]">{selectedPayment.user_email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Valor Cobrado:</span>
                <span className="font-bold text-base text-emerald-600">{formatMoney(selectedPayment.amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gateway / Método:</span>
                <span className="font-medium text-slate-800 uppercase">{selectedPayment.gateway}</span> (
                <span className="capitalize">{selectedPayment.payment_method}</span>)
              </div>
              <div>
                <span className="text-slate-400 block">ID Externo no Gateway:</span>
                <span className="font-mono text-slate-700">{selectedPayment.gateway_payment_id || 'N/A'}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                  Metadados do Gateway (JSON)
                </span>
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedPayment.metadata || {}, null, 2))}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#405189] hover:underline"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText ? 'Copiado!' : 'Copiar JSON'}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(selectedPayment.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </VelzonModal>
      )}

      {/* MODAL 2: CONCESSÃO DE CORTESIA PRO */}
      {showCourtesyModal && (
        <VelzonModal
          isOpen={showCourtesyModal}
          onClose={() => setShowCourtesyModal(false)}
          title="Conceder Cortesia Plano Pro"
        >
          <form onSubmit={handleGrantCourtesy} className="space-y-4 text-xs">
            <div>
              <VelzonLabel required>ID ou E-mail do Candidato</VelzonLabel>
              <VelzonInput
                type="text"
                required
                placeholder="Ex: candidato@exemplo.com ou ID do usuário"
                value={courtesyUserId}
                onChange={(e) => setCourtesyUserId(e.target.value)}
              />
            </div>

            <div>
              <VelzonLabel required>Período de Cortesia</VelzonLabel>
              <VelzonSelect
                value={courtesyDays}
                onChange={(e) => setCourtesyDays(e.target.value)}
              >
                <option value="7">7 dias (Degustação)</option>
                <option value="15">15 dias (Compensação)</option>
                <option value="30">30 dias (1 Mês de Cortesia)</option>
                <option value="90">90 dias (Trimestral)</option>
                <option value="180">180 dias (Semestral)</option>
                <option value="365">365 dias (1 Ano Pro)</option>
              </VelzonSelect>
            </div>

            <div>
              <VelzonLabel required>Justificativa Operacional</VelzonLabel>
              <VelzonTextarea
                required
                rows={3}
                placeholder="Ex: Cortesia por instabilidade no upload de currículo relatada no suporte..."
                value={courtesyReason}
                onChange={(e) => setCourtesyReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCourtesyModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={grantingCourtesy}
                className="px-4 py-2 bg-[#405189] text-white rounded-lg font-semibold hover:bg-[#364473] transition-colors disabled:opacity-50"
              >
                {grantingCourtesy ? 'Concedendo...' : 'Confirmar Cortesia'}
              </button>
            </div>
          </form>
        </VelzonModal>
      )}

      {/* MODAL 3: CONFIRMAÇÃO DE ESTORNO */}
      {refundTarget && (
        <VelzonModal
          isOpen={Boolean(refundTarget)}
          onClose={() => setRefundTarget(null)}
          title="Confirmar Estorno de Pagamento"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-200">
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Atenção: Ação Financeira Irreversível
              </div>
              <p>
                O estorno no valor de <strong>{formatMoney(refundTarget.amount)}</strong> marcará a transação
                como reembolsada e cancelará a assinatura Pro de <strong>{refundTarget.user_email}</strong>,
                revertendo sua conta para o Plano Gratuito.
              </p>
            </div>

            <div>
              <VelzonLabel required>Motivo do Estorno</VelzonLabel>
              <VelzonTextarea
                rows={3}
                required
                placeholder="Ex: Solicitação de cancelamento com reembolso em até 7 dias..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRefundTarget(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteRefund}
                disabled={refunding || !refundReason.trim()}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {refunding ? 'Estornando...' : 'Confirmar Estorno & Reversão'}
              </button>
            </div>
          </div>
        </VelzonModal>
      )}

      {/* MODAL 4: INSPETOR DE WEBHOOK PAYLOAD */}
      {selectedWebhook && (
        <VelzonModal
          isOpen={Boolean(selectedWebhook)}
          onClose={() => setSelectedWebhook(null)}
          title={`Payload do Webhook: ${selectedWebhook.gateway.toUpperCase()}`}
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block">Tipo do Evento:</span>
                <span className="font-mono font-semibold text-[#405189]">{selectedWebhook.event_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Recebido em:</span>
                <span className="font-semibold text-slate-700">{new Date(selectedWebhook.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <button
                onClick={() => handleCopy(JSON.stringify(selectedWebhook.payload, null, 2))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#405189] text-white rounded-lg font-semibold text-xs hover:bg-[#364473]"
              >
                {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedText ? 'Copiado!' : 'Copiar Payload'}
              </button>
            </div>

            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-96">
              {JSON.stringify(selectedWebhook.payload, null, 2)}
            </pre>
          </div>
        </VelzonModal>
      )}
    </AdminLayout>
  );
}
