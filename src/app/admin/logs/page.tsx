'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { VelzonCard } from '@/components/admin/ui/VelzonCard';
import { VelzonBadge } from '@/components/admin/ui/VelzonBadge';
import { VelzonStatWidget } from '@/components/admin/ui/VelzonStatWidget';
import { VelzonModal } from '@/components/admin/ui/VelzonModal';
import { VelzonInput, VelzonSelect } from '@/components/admin/ui';
import {
  ScrollText,
  Search,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Info,
  ShieldAlert,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Activity,
  Layers,
  Send,
  UserCheck,
} from 'lucide-react';
import type { LogEntry, LogStatsSummary, LogTipo, LogNivel } from '@/db/logRepository';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<LogTipo | 'ALL'>('ALL');
  const [nivel, setNivel] = useState<LogNivel | 'ALL'>('ALL');
  const [origem, setOrigem] = useState<string>('ALL');
  const [period, setPeriod] = useState<string>('24h');

  // Dados auxiliares dinâmicos
  const [originsList, setOriginsList] = useState<string[]>([]);
  const [stats, setStats] = useState<LogStatsSummary>({
    total24h: 0,
    acoes24h: 0,
    warnings24h: 0,
    errors24h: 0,
    security24h: 0,
    byType: {},
    byLevel: {},
  });

  // Modal de Inspeção de Metadata
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (tipo !== 'ALL') params.set('tipo', tipo);
      if (nivel !== 'ALL') params.set('nivel', nivel);
      if (origem !== 'ALL') params.set('origem', origem);
      if (period !== 'ALL') params.set('period', period);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
        if (data.origins) setOriginsList(data.origins);
      }
    } catch (err) {
      console.error('Error fetching admin logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, tipo, nivel, origem, period, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCopyJson = () => {
    if (!selectedLog) return;
    let formatted = '';
    try {
      formatted = selectedLog.metadata
        ? JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)
        : '{}';
    } catch {
      formatted = selectedLog.metadata || '{}';
    }
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNivelBadge = (level: LogNivel) => {
    switch (level) {
      case 'info':
        return <VelzonBadge variant="info">INFO</VelzonBadge>;
      case 'warning':
        return <VelzonBadge variant="warning">AVISO</VelzonBadge>;
      case 'error':
        return <VelzonBadge variant="danger">ERRO</VelzonBadge>;
      case 'security':
        return <VelzonBadge variant="primary">SEGURANÇA</VelzonBadge>;
      default:
        return <VelzonBadge variant="dark">{level}</VelzonBadge>;
    }
  };

  const getTipoBadge = (type: LogTipo) => {
    switch (type) {
      case 'acao':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <UserCheck className="w-3 h-3" />
            Ação Admin
          </span>
        );
      case 'mensageria':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Send className="w-3 h-3" />
            Mensageria
          </span>
        );
      case 'sistema':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Layers className="w-3 h-3" />
            Sistema
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AdminLayout>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e9ebec] dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Central Unificada de Logs & Auditoria
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Rastreamento integrado de eventos de sistema, ações de operadores e mensageria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#e9ebec] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Logs</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <VelzonStatWidget
          title="Eventos (24h)"
          value={stats.total24h.toLocaleString('pt-BR')}
          icon={<ScrollText className="w-6 h-6" />}
          variant="primary"
          trend={{ value: `${total}`, label: 'total filtrado' }}
        />
        <VelzonStatWidget
          title="Ações Administrativas"
          value={stats.acoes24h.toLocaleString('pt-BR')}
          icon={<UserCheck className="w-6 h-6" />}
          variant="info"
          trend={{ value: 'Auditável', isPositive: true, label: 'tempo real' }}
        />
        <VelzonStatWidget
          title="Avisos / Alertas"
          value={stats.warnings24h.toLocaleString('pt-BR')}
          icon={<AlertTriangle className="w-6 h-6" />}
          variant="warning"
          trend={{ value: 'Atenção', label: 'monitoramento' }}
        />
        <VelzonStatWidget
          title="Falhas / Erros"
          value={stats.errors24h.toLocaleString('pt-BR')}
          icon={<XCircle className="w-6 h-6" />}
          variant="danger"
          trend={{
            value: stats.errors24h > 0 ? `${stats.errors24h} erros` : 'Zero falhas',
            isPositive: stats.errors24h === 0,
            label: 'status de erro',
          }}
        />
      </div>

      {/* Barra de Filtros & Operações */}
      <VelzonCard noPadding>
        <div className="p-4 md:p-5 border-b border-[#e9ebec] dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Busca Textual */}
            <div className="lg:col-span-2">
              <VelzonInput
                type="text"
                placeholder="Buscar por mensagem ou origem..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Filtro de Tipo */}
            <div>
              <VelzonSelect
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as any);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="sistema">Sistema</option>
                <option value="acao">Ações Admin</option>
                <option value="mensageria">Mensageria</option>
              </VelzonSelect>
            </div>

            {/* Filtro de Nível */}
            <div>
              <VelzonSelect
                value={nivel}
                onChange={(e) => {
                  setNivel(e.target.value as any);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos os Níveis</option>
                <option value="info">Info</option>
                <option value="warning">Avisos</option>
                <option value="error">Erros</option>
                <option value="security">Segurança</option>
              </VelzonSelect>
            </div>

            {/* Dropdown Dinâmico de Origem */}
            <div>
              <VelzonSelect
                value={origem}
                onChange={(e) => {
                  setOrigem(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todas as Origens</option>
                {originsList.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </VelzonSelect>
            </div>

            {/* Filtro de Período */}
            <div>
              <VelzonSelect
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setPage(1);
                }}
              >
                <option value="1h">Última 1 hora</option>
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="ALL">Histórico Completo</option>
              </VelzonSelect>
            </div>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono border-b border-[#e9ebec] dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Nível</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Origem</th>
                <th className="py-3 px-4">Mensagem</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec] dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#405189]" />
                    Carregando trilha de logs unificada...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ScrollText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    Nenhum log encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getNivelBadge(log.nivel)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{getTipoBadge(log.tipo)}</td>
                    <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap font-medium">
                      {log.origem}
                    </td>
                    <td className="py-3 px-4 max-w-md truncate" title={log.mensagem}>
                      {log.mensagem}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#405189]/10 hover:bg-[#405189]/20 text-[#405189] dark:text-indigo-300 text-[11px] font-semibold transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspecionar</span>
                      </button>
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
            Mostrando {logs.length > 0 ? (page - 1) * 50 + 1 : 0} até{' '}
            {Math.min(page * 50, total)} de {total} registros
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

      {/* Modal de Inspeção com Formatador JSON (Refinamento #1) */}
      <VelzonModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={
          <div className="flex items-center gap-2">
            <span>Inspeção de Payload do Log</span>
            {selectedLog && getNivelBadge(selectedLog.nivel)}
          </div>
        }
        description={
          selectedLog
            ? `Origem: ${selectedLog.origem} • ${formatDate(selectedLog.created_at)}`
            : undefined
        }
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#405189]/30 bg-[#405189]/10 hover:bg-[#405189]/20 text-[#405189] dark:text-indigo-300 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'JSON Copiado!' : 'Copiar JSON'}</span>
            </button>
            <button
              onClick={() => setSelectedLog(null)}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Mensagem
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-100 p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono">
                {selectedLog.mensagem}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Metadados Estruturados (JSON)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ID: {selectedLog.id}
                </span>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 max-h-80">
                {(() => {
                  try {
                    return selectedLog.metadata
                      ? JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)
                      : '{\n  "metadata": null\n}';
                  } catch {
                    return selectedLog.metadata || '{}';
                  }
                })()}
              </pre>
            </div>
          </div>
        )}
      </VelzonModal>
    </AdminLayout>
  );
}
