'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Terminal,
  Radio,
  Search,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  FileText,
  FileCode,
  Pause,
  Play,
} from 'lucide-react';
import { LogLevel } from '@/types/log';
import { ScraperEvent } from '@/services/scraperLogger';

export interface TerminalLogItem extends ScraperEvent {}

export interface TerminalFilterState {
  level: 'ALL' | LogLevel;
  searchTerm: string;
}

/**
 * Pure functions exportadas para permitir testes determinísticos e reuso
 */
export function filterLogs(
  logs: TerminalLogItem[],
  filter: { level: 'ALL' | LogLevel; searchTerm: string }
): TerminalLogItem[] {
  const term = filter.searchTerm.trim().toLowerCase();

  return logs.filter((log) => {
    // Filtro por nível
    if (filter.level !== 'ALL' && log.level !== filter.level) {
      return false;
    }

    // Filtro textual
    if (term) {
      const matchMessage = log.message.toLowerCase().includes(term);
      const matchScraper = (log.scraperName || '').toLowerCase().includes(term);
      const matchDetails = (log.details || '').toLowerCase().includes(term);
      const matchRunId = (log.runId || '').toLowerCase().includes(term);
      if (!matchMessage && !matchScraper && !matchDetails && !matchRunId) {
        return false;
      }
    }

    return true;
  });
}

export function formatLogsAsTxt(logs: TerminalLogItem[]): string {
  return logs
    .map((log) => {
      const time = log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString();
      const level = (log.level || 'INFO').padEnd(5);
      const scraper = `[${log.scraperName || 'System'}]`;
      const details = log.details ? `\n  Details: ${log.details}` : '';
      return `${time} ${level} ${scraper} ${log.message}${details}`;
    })
    .join('\n');
}

export function formatLogsAsJson(logs: TerminalLogItem[]): string {
  return JSON.stringify(logs, null, 2);
}

export function addLogToBuffer(
  currentLogs: TerminalLogItem[],
  newLog: TerminalLogItem,
  maxBuffer: number = 1000
): TerminalLogItem[] {
  const updated = [...currentLogs, newLog];
  if (updated.length > maxBuffer) {
    return updated.slice(updated.length - maxBuffer);
  }
  return updated;
}

interface ScraperLiveTerminalProps {
  streamUrl?: string;
  maxBuffer?: number;
  initialCollapsed?: boolean;
  className?: string;
}

export function ScraperLiveTerminal({
  streamUrl = '/api/admin/scraper/stream',
  maxBuffer = 1000,
  initialCollapsed = false,
  className = '',
}: ScraperLiveTerminalProps) {
  const [logs, setLogs] = useState<TerminalLogItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'error' | 'disconnected'
  >('connecting');
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | LogLevel>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const userScrolledUpRef = useRef(false);

  // Contadores por nível de severidade
  const counts = useMemo(() => {
    let info = 0;
    let warn = 0;
    let error = 0;
    for (const log of logs) {
      if (log.level === 'INFO') info++;
      else if (log.level === 'WARN') warn++;
      else if (log.level === 'ERROR') error++;
    }
    return {
      ALL: logs.length,
      INFO: info,
      WARN: warn,
      ERROR: error,
    };
  }, [logs]);

  // Logs filtrados
  const filteredLogs = useMemo(() => {
    return filterLogs(logs, { level: selectedLevel, searchTerm });
  }, [logs, selectedLevel, searchTerm]);

  // Conexão SSE
  useEffect(() => {
    let es: EventSource | null = null;
    let isMounted = true;

    try {
      es = new EventSource(streamUrl);
      eventSourceRef.current = es;
      setConnectionStatus('connecting');

      es.onopen = () => {
        if (!isMounted) return;
        setConnectionStatus('connected');
      };

      es.onmessage = (event) => {
        if (!isMounted) return;
        try {
          if (!event.data || event.data.startsWith(':')) return; // ignora heartbeat
          const parsed = JSON.parse(event.data) as TerminalLogItem;
          setLogs((prev) => addLogToBuffer(prev, parsed, maxBuffer));
        } catch (err) {
          console.error('[ScraperLiveTerminal] Erro ao processar mensagem SSE:', err);
        }
      };

      es.onerror = () => {
        if (!isMounted) return;
        setConnectionStatus('error');
      };
    } catch (err) {
      setConnectionStatus('error');
    }

    return () => {
      isMounted = false;
      if (es) {
        es.close();
      }
    };
  }, [streamUrl, maxBuffer]);

  // Auto-scroll para o fim quando novos logs chegarem
  useEffect(() => {
    if (autoScroll && !userScrolledUpRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  // Detecta se o usuário rolou para cima
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    userScrolledUpRef.current = !isAtBottom;
  };

  const scrollToBottom = () => {
    userScrolledUpRef.current = false;
    setAutoScroll(true);
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Limpeza de buffer
  const handleClear = () => {
    setLogs([]);
    setExpandedLogIds(new Set());
  };

  // Toggle expansão de detalhes
  const toggleDetails = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Exportação em TXT
  const handleExportTxt = () => {
    const content = formatLogsAsTxt(filteredLogs);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraper-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Exportação em JSON
  const handleExportJson = () => {
    const content = formatLogsAsJson(filteredLogs);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraper-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`rounded-xl border border-slate-700/60 bg-[#0d1117] text-slate-100 shadow-xl overflow-hidden transition-all duration-200 ${className}`}
      data-testid="scraper-live-terminal"
    >
      {/* Top Bar do Terminal */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#161b22] border-b border-slate-800">
        {/* Esquerda: Identificação e Status SSE */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#405189]/20 text-[#687fe3]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
                Terminal Live SSE
                <span className="text-[10px] font-normal text-slate-400 capitalize">
                  ({filteredLogs.length} exibidos / {logs.length} buffer)
                </span>
              </h3>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${
              connectionStatus === 'connected'
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                : connectionStatus === 'connecting'
                ? 'bg-amber-950/60 border-amber-700 text-amber-300'
                : 'bg-rose-950/60 border-rose-700 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            {connectionStatus === 'connected'
              ? 'Ao Vivo'
              : connectionStatus === 'connecting'
              ? 'Conectando...'
              : 'Desconectado'}
          </div>
        </div>

        {/* Direita: Controles e Ações */}
        <div className="flex items-center gap-2">
          {/* Toggle AutoScroll */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll ativo (clique para pausar)' : 'Auto-scroll pausado (clique para ativar)'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono border transition ${
              autoScroll
                ? 'bg-sky-950/60 border-sky-700 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDown className={`w-3 h-3 ${autoScroll ? 'text-sky-400' : 'text-slate-500'}`} />
            Auto-Scroll
          </button>

          {/* Exportar TXT */}
          <button
            type="button"
            onClick={handleExportTxt}
            disabled={filteredLogs.length === 0}
            title="Exportar logs filtrados em formato .txt"
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition disabled:opacity-40 cursor-pointer"
          >
            <FileText className="w-3 h-3 text-slate-400" />
            .TXT
          </button>

          {/* Exportar JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            disabled={filteredLogs.length === 0}
            title="Exportar logs filtrados em formato .json"
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition disabled:opacity-40 cursor-pointer"
          >
            <FileCode className="w-3 h-3 text-slate-400" />
            .JSON
          </button>

          {/* Limpar Buffer */}
          <button
            type="button"
            onClick={handleClear}
            disabled={logs.length === 0}
            title="Limpar buffer de logs da tela"
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Colapsar/Expandir */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir terminal' : 'Recolher terminal'}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Corpo do Terminal (se não colapsado) */}
      {!isCollapsed && (
        <>
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0e131a] border-b border-slate-800/80 text-xs">
            {/* Chips de Severidade */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedLevel('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  selectedLevel === 'ALL'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                TODOS ({counts.ALL})
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel('INFO')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition flex items-center gap-1 ${
                  selectedLevel === 'INFO'
                    ? 'bg-sky-900/80 text-sky-200 font-bold border border-sky-700'
                    : 'text-sky-400 hover:bg-sky-950/30'
                }`}
              >
                INFO ({counts.INFO})
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel('WARN')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition flex items-center gap-1 ${
                  selectedLevel === 'WARN'
                    ? 'bg-amber-900/80 text-amber-200 font-bold border border-amber-700'
                    : 'text-amber-400 hover:bg-amber-950/30'
                }`}
              >
                WARN ({counts.WARN})
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel('ERROR')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition flex items-center gap-1 ${
                  selectedLevel === 'ERROR'
                    ? 'bg-rose-900/80 text-rose-200 font-bold border border-rose-700'
                    : 'text-rose-400 hover:bg-rose-950/30'
                }`}
              >
                ERROR ({counts.ERROR})
              </button>
            </div>

            {/* Input de Busca Textual */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar por mensagem, conector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1 text-[11px] font-mono bg-slate-900 border border-slate-700/80 rounded text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Console Output Screen */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="p-3 font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent select-text bg-[#0d1117]"
          >
            {filteredLogs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                <Terminal className="w-8 h-8 opacity-40 mb-2" />
                <p className="font-mono text-xs">
                  {logs.length === 0
                    ? 'Aguardando fluxo de eventos dos conectores...'
                    : 'Nenhum log corresponde aos filtros ativos.'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedLevel('ALL');
                    }}
                    className="mt-2 text-xs text-sky-400 hover:underline"
                  >
                    Limpar pesquisa
                  </button>
                )}
              </div>
            ) : (
              filteredLogs.map((log, index) => {
                const isExpanded = expandedLogIds.has(log.id || `idx-${index}`);
                const logTime = log.timestamp
                  ? new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '--:--:--';

                return (
                  <div
                    key={log.id || `log-${index}`}
                    className="group flex flex-col rounded px-2 py-1 hover:bg-slate-800/40 transition-colors border border-transparent hover:border-slate-800"
                  >
                    <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
                      {/* Timestamp */}
                      <span className="text-slate-500 shrink-0 text-[10px] select-none pt-0.5">
                        {logTime}
                      </span>

                      {/* Level Badge */}
                      <span
                        className={`shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase select-none ${
                          log.level === 'ERROR'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : log.level === 'WARN'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-sky-950/80 text-sky-300 border border-sky-800'
                        }`}
                      >
                        {log.level}
                      </span>

                      {/* Scraper Name */}
                      <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-900/60 select-none">
                        {log.scraperName || 'System'}
                      </span>

                      {/* Message Content */}
                      <span className="flex-1 text-slate-200 break-words font-mono">
                        {log.message}
                      </span>

                      {/* Detalhes Toggle */}
                      {log.details && (
                        <button
                          type="button"
                          onClick={() => toggleDetails(log.id || `idx-${index}`)}
                          className="shrink-0 text-[10px] text-slate-400 hover:text-sky-300 underline select-none"
                        >
                          {isExpanded ? 'Ocultar' : 'Detalhes'}
                        </button>
                      )}
                    </div>

                    {/* Bloco de Detalhes expandido */}
                    {isExpanded && log.details && (
                      <pre className="mt-1.5 p-2 rounded bg-black/50 border border-slate-800 text-[10px] text-slate-300 whitespace-pre-wrap break-all overflow-x-auto">
                        {log.details}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Barra inferior caso o usuário tenha rolado para cima */}
          {userScrolledUpRef.current && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-t border-slate-800 text-[11px] text-slate-400">
              <span>Rolagem pausada manualmente para inspeção.</span>
              <button
                type="button"
                onClick={scrollToBottom}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
              >
                <ArrowDown className="w-3 h-3" />
                Rolar para o fim
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
