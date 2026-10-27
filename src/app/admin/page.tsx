'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { VelzonCard } from '@/components/admin/ui/VelzonCard';
import { VelzonStatWidget } from '@/components/admin/ui/VelzonStatWidget';
import { VelzonBadge } from '@/components/admin/ui/VelzonBadge';
import { PlatformDistribution } from '@/components/admin/PlatformDistribution';
import {
  Briefcase,
  Users,
  Building2,
  Zap,
  CreditCard,
  Cpu,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
  FileCheck,
  Building,
  TrendingUp,
  BarChart3,
  Layers,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { AdminDashboardMetrics } from '@/app/api/admin/dashboard/metrics/route';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchMetrics = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/admin/dashboard/metrics', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data);
        setLastRefreshedAt(new Date());
      }
    } catch (err) {
      console.error('[AdminDashboardPage] Erro ao carregar métricas executivas:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(false);
  }, []);

  const jobs = metrics?.jobs;
  const users = metrics?.users;
  const companies = metrics?.companies;
  const financial = metrics?.financial;
  const infra = metrics?.infrastructure;

  const totalJobs = jobs?.total ?? 0;
  const approvedJobs = jobs?.approved ?? 0;
  const fitRate = jobs?.fitRate ?? 0;

  // Cálculos do Kanban Pipeline
  const pendingJobs = jobs?.statusCounts?.pending ?? 0;
  const appliedJobs = jobs?.statusCounts?.applied ?? 0;
  const interviewJobs = jobs?.statusCounts?.interview ?? 0;
  const offerJobs = jobs?.statusCounts?.offer ?? 0;
  const rejectedJobs = jobs?.statusCounts?.rejected ?? 0;

  const activePipelineTotal = pendingJobs + appliedJobs + interviewJobs + offerJobs;

  return (
    <AdminLayout>
      {/* Top Banner & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e9ebec] dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#405189]" />
            Dashboard Executiva SaaS
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Visão holística de vagas, talentos, parcerias B2B, inteligência artificial e receita.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastRefreshedAt && (
            <span className="text-xs text-slate-400 font-mono hidden md:inline-block">
              Atualizado às {lastRefreshedAt.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <button
            onClick={() => fetchMetrics(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Métricas</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs Executivos do SaaS (5 Widgets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        {/* KPI 1: Vagas Ativas */}
        <VelzonStatWidget
          title="Vagas no Pipeline"
          value={loading ? '...' : totalJobs.toLocaleString('pt-BR')}
          icon={<Briefcase className="w-6 h-6 text-[#405189]" />}
          variant="primary"
          trend={{
            value: `${approvedJobs.toLocaleString('pt-BR')} aprovadas`,
            isPositive: true,
          }}
        />

        {/* KPI 2: Candidatos Cadastrados */}
        <VelzonStatWidget
          title="Base de Talentos"
          value={loading ? '...' : (users?.candidates ?? 0).toLocaleString('pt-BR')}
          icon={<Users className="w-6 h-6 text-emerald-500" />}
          variant="success"
          trend={{
            value: `+${users?.newLast7Days ?? 0} novos 7d`,
            isPositive: true,
          }}
        />

        {/* KPI 3: Empresas B2B */}
        <VelzonStatWidget
          title="Empresas Mapeadas"
          value={loading ? '...' : (companies?.total ?? 0).toLocaleString('pt-BR')}
          icon={<Building2 className="w-6 h-6 text-sky-500" />}
          variant="info"
          trend={{
            value: `${companies?.activePartners ?? 0} parceiras ativas`,
            isPositive: true,
          }}
        />

        {/* KPI 4: Taxa de Fit da IA */}
        <VelzonStatWidget
          title="Taxa de Fit IA"
          value={loading ? '...' : `${fitRate}%`}
          icon={<Zap className="w-6 h-6 text-amber-500" />}
          variant="warning"
          trend={{
            value: 'Hermes AI Engine',
            isPositive: true,
          }}
        />

        {/* KPI 5: MRR / Receita SaaS */}
        <VelzonStatWidget
          title="Receita / MRR"
          value={
            loading
              ? '...'
              : `R$ ${(financial?.mrr ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          }
          icon={<CreditCard className="w-6 h-6 text-indigo-500" />}
          variant="primary"
          trend={{
            value: `${financial?.activeSubscribers ?? 0} assinantes`,
            isPositive: true,
          }}
        />
      </div>

      {/* Main Grid: Business Analytics & Infrastructure Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Coluna Esquerda Principal (8 Colunas) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card Executivo de Status da Infraestrutura & Scrapers */}
          <VelzonCard
            title="Status da Coleta & Infraestrutura"
            subtitle="Central unificada e autônoma de ingestão multi-canal"
            className="border-t-4 border-t-[#405189]"
            badge={
              <VelzonBadge variant="success" size="sm" icon={<Activity className="w-3 h-3" />}>
                Operacional
              </VelzonBadge>
            }
            actions={
              <Link
                href="/admin/scrapers"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#405189] hover:bg-[#34426f] text-white transition shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Central de Scrapers</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </Link>
            }
          >
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase">Fontes Ativas</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                    {infra?.activeConnectors ?? 0} / {infra?.totalConnectors ?? 36}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase">Fontes Saudáveis</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {infra?.healthyCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase">Latência Média</span>
                  <span className="text-base font-bold text-sky-600 dark:text-sky-400">
                    {infra?.avgLatencyMs ? `${(infra.avgLatencyMs / 1000).toFixed(1)}s` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase">Supervisão</span>
                  <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                    SSE Stream Ao Vivo
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                <p className="leading-relaxed">
                  As tarefas de varredura, monitoramento individual de latência, expurgo e terminal SSE foram centralizadas em uma tela exclusiva para máxima estabilidade.
                </p>
                <Link
                  href="/admin/scrapers"
                  className="shrink-0 text-xs font-semibold text-[#405189] dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Abrir Central de Scrapers &rarr;
                </Link>
              </div>
            </div>
          </VelzonCard>

          {/* Card: Funil & Pipeline do Kanban Geral */}
          <VelzonCard
            title="Pipeline & Funil do Kanban de Vagas"
            subtitle="Distribuição de oportunidades por estágio de evolução"
            actions={
              <Link
                href="/admin/vagas"
                className="text-xs font-semibold text-[#405189] dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Ver Todas as Vagas &rarr;
              </Link>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pendentes</span>
                  </div>
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {pendingJobs.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40">
                  <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 mb-1">
                    <Send className="w-3.5 h-3.5" />
                    <span>Em Processo</span>
                  </div>
                  <span className="text-lg font-bold text-sky-800 dark:text-sky-200">
                    {appliedJobs.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Entrevistas</span>
                  </div>
                  <span className="text-lg font-bold text-amber-800 dark:text-amber-200">
                    {interviewJobs.toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 mb-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Propostas</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                    {offerJobs.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Proporcional do Funil */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Volume ativo em processo: {activePipelineTotal.toLocaleString('pt-BR')}</span>
                  <span>{rejectedJobs.toLocaleString('pt-BR')} rejeitadas / arquivadas</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${activePipelineTotal ? (pendingJobs / activePipelineTotal) * 100 : 0}%` }}
                    className="bg-slate-400"
                    title={`Pendentes: ${pendingJobs}`}
                  />
                  <div
                    style={{ width: `${activePipelineTotal ? (appliedJobs / activePipelineTotal) * 100 : 0}%` }}
                    className="bg-sky-500"
                    title={`Em Processo: ${appliedJobs}`}
                  />
                  <div
                    style={{ width: `${activePipelineTotal ? (interviewJobs / activePipelineTotal) * 100 : 0}%` }}
                    className="bg-amber-500"
                    title={`Entrevistas: ${interviewJobs}`}
                  />
                  <div
                    style={{ width: `${activePipelineTotal ? (offerJobs / activePipelineTotal) * 100 : 0}%` }}
                    className="bg-emerald-500"
                    title={`Propostas: ${offerJobs}`}
                  />
                </div>
              </div>
            </div>
          </VelzonCard>

          {/* Card: Top Empresas com Oportunidades */}
          <VelzonCard
            title="Top Empresas Contratantes"
            subtitle="Organizações com maior concentração de oportunidades mapeadas"
            actions={
              <Link
                href="/admin/empresas"
                className="text-xs font-semibold text-[#405189] dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Gerenciar Empresas &rarr;
              </Link>
            }
          >
            {jobs?.topCompanies && jobs.topCompanies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {jobs.topCompanies.map((item, idx) => (
                  <div
                    key={item.company || idx}
                    className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="p-1.5 rounded-md bg-[#405189]/10 text-[#405189] dark:text-indigo-300 shrink-0">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate" title={item.company}>
                        {item.company}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                      {item.count} vagas
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center font-mono">
                Nenhuma empresa com vagas ativas computada no momento.
              </p>
            )}
          </VelzonCard>
        </div>

        {/* Coluna Direita (4 Colunas) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card: Distribuição por Canal */}
          <VelzonCard
            title="Distribuição por Canal"
            subtitle="Volume de vagas coletadas por fonte"
          >
            {loading ? (
              <div className="py-8 flex justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <PlatformDistribution platformCounts={jobs?.platformCounts || {}} />
            )}
          </VelzonCard>

          {/* Card: Atalhos Rápidos de Gestão */}
          <VelzonCard
            title="Gestão & Operações"
            subtitle="Atalhos diretos para os módulos administrativos"
          >
            <div className="space-y-2 text-xs">
              <Link
                href="/admin/vagas"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group font-medium text-slate-700 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-[#405189]" />
                  <span>Kanban & Disparo de Vagas</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/empresas"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group font-medium text-slate-700 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-sky-500" />
                  <span>Módulo B2B & Empresas</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/usuarios"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group font-medium text-slate-700 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Usuários, Planos & Suporte</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/pagamentos"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group font-medium text-slate-700 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  <span>Financeiro & Assinaturas</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/logs"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group font-medium text-slate-700 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Logs de Auditoria do Sistema</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </VelzonCard>

          {/* Card Informativo de Segurança */}
          <div className="p-4 rounded-lg bg-[#405189]/5 border border-[#405189]/20 space-y-1.5">
            <div className="flex items-center gap-2 text-[#405189] dark:text-indigo-400 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Sessão Isolada & Protegida</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              O ecossistema administrativo opera com token dedicado <code>admin_session</code> assinado com <code>ADMIN_JWT_SECRET</code>, dissociado da autenticação de candidatos.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
