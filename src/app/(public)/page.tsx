'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardStats } from '@/db/repository';
import { ProcessedJob } from '@/types/job';
import { JobModal } from '@/components/JobModal';
import { JobListHoverEffect } from '@/components/ui/card-hover-effect';
import { cn } from '@/lib/utils';
import {
  Layers,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  BarChart3,
  ChevronRight,
  Compass,
  UserPlus,
  LogIn,
  CheckCircle2,
  RefreshCw,
  Crown
} from 'lucide-react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  tier: 'free' | 'premium';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<ProcessedJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ProcessedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, authRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/jobs?onlyApproved=true'),
        fetch('/api/auth/me'),
      ]);

      const statsData = await statsRes.json();
      const jobsData = await jobsRes.json();
      const authData = await authRes.json();

      if (statsData.success) setStats(statsData.data);
      if (jobsData.success) setRecentJobs(jobsData.data.slice(0, 5));
      if (authData.authenticated && authData.user) {
        setUser(authData.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleAuthChange = () => {
      fetchData();
    };

    window.addEventListener('buscavag:auth-changed', handleAuthChange);
    return () => {
      window.removeEventListener('buscavag:auth-changed', handleAuthChange);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (selectedJob && selectedJob.id === id) {
          setSelectedJob({
            ...selectedJob,
            applicationStatus: newStatus as any,
          });
        }
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const totalJobs = stats?.totalJobs ?? 0;
  const approvedJobs = stats?.approvedJobs ?? 0;
  const discardedJobs = Math.max(0, totalJobs - approvedJobs);
  const approvalRate =
    totalJobs > 0 ? Math.round((approvedJobs / totalJobs) * 100) : 0;
  const avgScore = stats?.avgScore ?? 0;

  // Active platform sources count
  const activeSourcesCount = stats?.platformCounts && Object.keys(stats.platformCounts).length > 0
    ? Object.keys(stats.platformCounts).length
    : (loading ? '-' : 0);

  // Highest match job for Top Match indicator
  const topMatchJob = recentJobs.length > 0 ? recentJobs[0] : null;
  const topMatchScore = topMatchJob ? (topMatchJob.overallScore ?? topMatchJob.scoreIa ?? 0) : 0;
  const topMatchLabel = topMatchJob
    ? `${topMatchScore}% (${topMatchJob.category || 'Tech'})`
    : (loading ? 'Carregando...' : 'Nenhum match');

  // Status Funnel items
  const funnelItems = [
    {
      key: 'pending',
      label: 'Inbox / Pendente',
      barColor: 'bg-zinc-400 dark:bg-zinc-400',
      textColor: 'text-zinc-400',
    },
    {
      key: 'applied',
      label: 'Candidaturas Enviadas',
      barColor: 'bg-emerald-500 dark:bg-emerald-400',
      textColor: 'text-emerald-500 dark:text-emerald-400',
    },
    {
      key: 'interview',
      label: 'Em Processo / Entrevista',
      barColor: 'bg-amber-500 dark:bg-amber-400',
      textColor: 'text-amber-500 dark:text-amber-400',
    },
    {
      key: 'offer',
      label: 'Propostas Recebidas',
      barColor: 'bg-teal-500 dark:bg-teal-400',
      textColor: 'text-teal-500 dark:text-teal-400',
    },
    {
      key: 'rejected',
      label: 'Descartadas',
      barColor: 'bg-zinc-600 dark:bg-zinc-600',
      textColor: 'text-zinc-500',
    },
  ];

  const appliedCount = stats?.statusCounts?.applied ?? 0;

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-300">
      {/* Top Bar & Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="flex flex-col gap-1.5 max-w-3xl">
          <div className="flex items-center gap-2">
          
          </div>

          {user ? (
            <>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Olá, {user.name}
              </h1>
              <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Resumo das vagas captadas no mercado e pontuadas com inteligência artificial para o seu perfil profissional.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Encontre as Melhores Vagas Tech & IA
              </h1>
              <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Centralizamos as principais oportunidades de desenvolvimento, IA e dados de dezenas de fontes em um único lugar.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center flex-wrap gap-2.5 shrink-0 pt-2 md:pt-0">
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            type="button"
            className="h-9 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-2 text-xs md:text-sm font-medium shadow-sm disabled:opacity-60"
          >
            <RefreshCw 
              className={cn(
                "w-4 h-4 transition-colors",
                (refreshing || loading) ? "animate-spin text-emerald-500" : "text-zinc-500 dark:text-zinc-400"
              )} 
            />
            <span>Atualizar</span>
          </button>

          {user ? (
            <Link
              href="/candidate?tab=recommended"
              className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-emerald-600/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Minhas Recomendações</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/register"
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-emerald-600/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Criar Conta Grátis</span>
              </Link>
              <Link
                href="/login"
                className="h-9 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs md:text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Guest Banner CTA */}
      {!user && !authLoading && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900/40 p-6 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs w-fit">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Match Perfeito com Inteligência Artificial</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
                Descubra seu índice de compatibilidade em cada vaga
              </h2>
              <p className="text-sm text-zinc-300">
                Crie sua conta, envie seu currículo em PDF/DOCX e nossa IA analisará suas habilidades técnicas e experiências para indicar as oportunidades ideais para sua carreira.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/register"
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2"
              >
                <span>Criar Conta Gratuita</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="h-10 px-4 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Conhecer Planos</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4 Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-zinc-900/70 rounded-xl p-4 md:p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
              Total Coletadas
            </span>
            <Layers className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {totalJobs}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">vagas na base</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/50">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{activeSourcesCount} canais</span>
            <span>conectados</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-zinc-900/70 rounded-xl p-4 md:p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
              Vagas Aprovadas
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Tech Filtradas
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {approvedJobs}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">qualificadas</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/50">
            <span>Filtro de qualidade</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">IA Anti-Spam</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-zinc-900/70 rounded-xl p-4 md:p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
              Taxa de Aproveitamento
            </span>
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {approvalRate}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">das vagas varridas</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/50">
            <span>{discardedJobs} ruídos eliminados</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-zinc-900/70 rounded-xl p-4 md:p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium">
              Score Médio de Qualidade
            </span>
            <BarChart3 className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {avgScore}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">aderência tech</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/50 truncate">
            <span>Top Destaque:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">
              {topMatchLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Analytical Blocks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
        {/* Bloco 1: Funil de Candidaturas (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900/70 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Funil de Oportunidades
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Fluxo de triagem e candidaturas
              </p>
            </div>
            <Link
              href="/jobs"
              className="font-mono text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
            >
              <span>Explorar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            {funnelItems.map((item) => {
              const count = stats?.statusCounts?.[item.key] ?? 0;
              const pct = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
              return (
                <div key={item.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300">{item.label}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      <span className={item.textColor}>{count}</span>{' '}
                      <span className="text-zinc-400 dark:text-zinc-600">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between font-mono text-xs text-zinc-500 dark:text-zinc-400">
            <span>Candidaturas registradas</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">
              {appliedCount} aplicadas
            </span>
          </div>
        </div>

        {/* Bloco 2: Distribuição por Categoria (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900/70 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Distribuição por Categoria
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Segmentação das áreas de tecnologia
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            {stats && Object.keys(stats.categoryCounts).length > 0 ? (
              Object.entries(stats.categoryCounts).map(([category, count], idx) => {
                const pct = totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0;
                const barColors = [
                  'bg-zinc-300 dark:bg-zinc-200',
                  'bg-emerald-500 dark:bg-emerald-400',
                  'bg-indigo-500 dark:bg-indigo-400',
                  'bg-amber-500 dark:bg-amber-400',
                  'bg-purple-500 dark:bg-purple-400',
                ];
                const barColor = barColors[idx % barColors.length];

                return (
                  <div key={category} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {category}
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                        {count} {count === 1 ? 'vaga' : 'vagas'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">
                Nenhuma categoria registrada ainda.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between font-mono text-xs text-zinc-500 dark:text-zinc-400">
            <span>Principais Stacks</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Frontend • Backend • Full Stack
            </span>
          </div>
        </div>

        {/* Bloco 3: Top Empresas Anunciando (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900/70 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Top Empresas
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Maior volume de vagas ativas
            </p>
          </div>

          <div className="flex flex-col gap-1.5 pt-1 divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {stats && stats.topCompanies.length > 0 ? (
              stats.topCompanies.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 text-xs first:pt-0 last:pb-0"
                >
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate max-w-[140px]">
                    {c.company}
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                    {c.count} {c.count === 1 ? 'vaga' : 'vagas'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">
                Nenhuma empresa mapeada ainda.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between font-mono text-xs text-zinc-500 dark:text-zinc-400">
            <span>Empresas Ativas</span>
            <span className="text-zinc-800 dark:text-zinc-200">
              {stats?.topCompanies?.length ?? 0} principais
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Vagas em Destaque */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg md:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Oportunidades em Destaque
            </h2>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Vagas com alta aderência técnica e recentes no mercado
            </p>
          </div>
          <Link
            href="/jobs"
            className="font-mono text-xs text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dense Minimalist Job Cards List */}
        {loading ? (
          <div className="p-10 text-center text-zinc-500 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
            <span className="text-xs font-mono">Carregando oportunidades...</span>
          </div>
        ) : recentJobs.length > 0 ? (
          <JobListHoverEffect
            jobs={recentJobs}
            onSelect={(j: ProcessedJob) => setSelectedJob(j)}
          />
        ) : (
          <div className="p-8 text-center text-zinc-500 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
            <p className="text-xs font-mono">Nenhuma vaga encontrada recentemente.</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Vaga */}
      <JobModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
