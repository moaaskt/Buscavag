'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { VelzonCard } from '@/components/admin/ui/VelzonCard';
import { VelzonBadge } from '@/components/admin/ui/VelzonBadge';
import { VelzonStatWidget } from '@/components/admin/ui/VelzonStatWidget';
import { VelzonModal } from '@/components/admin/ui/VelzonModal';
import { VelzonInput, VelzonTextarea, VelzonSelect, VelzonLabel } from '@/components/admin/ui';
import {
  Send,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Sparkles,
  Bot,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';
import type { MessagingLogEntry, MessagingStats } from '@/db/adminMessagingRepository';

export default function AdminMensageriaPage() {
  const [activeTab, setActiveTab] = useState<'telegram' | 'whatsapp' | 'historico'>('telegram');

  // Estado Estatísticas Globais
  const [stats, setStats] = useState<MessagingStats>({
    totalSent: 0,
    telegramCount: 0,
    whatsappCount: 0,
    failedCount: 0,
    successRate: 100,
  });

  // Estado Conectores
  const [connectors, setConnectors] = useState<{
    telegram: { isConfigured: boolean; chatId?: string; hasToken: boolean; mode: string };
    whatsapp: {
      provider: string;
      isConfigured: boolean;
      apiUrl?: string;
      instance?: string;
      defaultRecipient?: string;
      minScore: number;
      metaPhoneNumberId?: string;
      isMetaCloudReady?: boolean;
    };
  }>({
    telegram: { isConfigured: false, hasToken: false, mode: 'mock' },
    whatsapp: { provider: 'mock', isConfigured: false, minScore: 80 },
  });

  // Estado Histórico de Logs
  const [logs, setLogs] = useState<MessagingLogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Filtros Histórico
  const [search, setSearch] = useState('');
  const [canalFilter, setCanalFilter] = useState<'all' | 'telegram' | 'whatsapp'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'failed'>('all');

  // Disparo Manual Modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testCanal, setTestCanal] = useState<'telegram' | 'whatsapp'>('telegram');
  const [testDestinatario, setTestDestinatario] = useState('');
  const [testMensagem, setTestMensagem] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<{ success: boolean; message: string } | null>(null);

  // Modal Inspeção de Log
  const [selectedLog, setSelectedLog] = useState<MessagingLogEntry | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Reenvio de Mensagem
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Pitch Generator Interativo (WhatsApp Tab)
  const [pitchForm, setPitchForm] = useState({
    title: 'Desenvolvedor Full Stack Sênior',
    company: 'TechCorp Brasil',
    platform: 'LinkedIn Posts',
    url: 'https://exemplo.com/vaga/123',
    directContact: 'recrutamento@techcorp.com.br',
    candidateName: 'Moacir Neto',
    targetRole: 'Desenvolvedor Full Stack Especialista',
    primaryStack: 'Node.js, TypeScript, React, Next.js, Python',
  });
  const [generatedPitch, setGeneratedPitch] = useState('');

  // 1. Busca Dados e Logs
  const fetchMessagingData = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search.trim()) params.set('search', search.trim());
      if (canalFilter !== 'all') params.set('canal', canalFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/mensageria?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs || []);
        setTotalLogs(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.stats) setStats(data.stats);
        if (data.connectors) setConnectors(data.connectors);
      }
    } catch (err) {
      console.error('Erro ao buscar dados de mensageria:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [page, search, canalFilter, statusFilter]);

  useEffect(() => {
    fetchMessagingData();
  }, [fetchMessagingData]);

  // Gerador dinâmico de Pitch para a aba do WhatsApp
  const handleGeneratePitch = () => {
    const { title, company, platform, url, directContact, candidateName, targetRole, primaryStack } = pitchForm;
    const isDirect = Boolean(directContact.trim());
    
    let intro = `Olá, time de recrutamento da ${company || 'Empresa'}!\n\nMe interessei muito pela vaga de ${title || 'Oportunidade'}.`;
    if (isDirect) {
      intro = `Olá! Vi a oportunidade de ${title} na ${company} e estou encaminhando minha apresentação diretamente conforme indicado.`;
    }

    const techArray = primaryStack.split(',').map((s) => s.trim()).filter(Boolean);
    const techText = techArray.length > 0 ? techArray.slice(0, 4).join(', ') : 'Node.js e React';

    const body = `Atuo como ${targetRole || 'Desenvolvedor Full Stack'}, com foco técnico em ${techText}, desenvolvendo soluções eficientes, escaláveis e com código limpo.`;

    const cta = isDirect
      ? `Fico à total disposição para encaminhar meu currículo detalhado e agendar uma conversa!\n\nContato direto: ${directContact}\nLink da vaga: ${url}`
      : `Fico à total disposição para conversarmos sobre como posso agregar valor aos desafios da equipe!\n\nLink da vaga: ${url}`;

    const pitch = `${intro}\n\n${body}\n\n${cta}\n\nAtenciosamente,\n${candidateName || 'Candidato'}`;
    setGeneratedPitch(pitch);
  };

  // Disparo de Teste Manual
  const handleSendTestMessage = async () => {
    if (!testMensagem.trim()) return;
    setSendingTest(true);
    setTestResponse(null);

    try {
      const res = await fetch('/api/admin/mensageria/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canal: testCanal,
          destinatario: testDestinatario.trim() || undefined,
          mensagem: testMensagem,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResponse({
          success: true,
          message: data.mock
            ? 'Disparo simulado com sucesso (Mock Mode). Log registrado!'
            : `Mensagem enviada com sucesso! ID: ${data.messageId || 'OK'}`,
        });
        fetchMessagingData();
      } else {
        setTestResponse({
          success: false,
          message: data.error || 'Erro no envio da mensagem de teste.',
        });
      }
    } catch (err: any) {
      setTestResponse({
        success: false,
        message: err.message || 'Erro inesperado na requisição.',
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Reenvio de Mensagem Falhada
  const handleResend = async (logId: string) => {
    setResendingId(logId);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/admin/mensageria/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback('Mensagem reenviada com sucesso!');
        fetchMessagingData();
      } else {
        setActionFeedback(`Falha ao reenviar: ${data.error || data.message}`);
      }
    } catch (err: any) {
      setActionFeedback(`Erro ao reenviar: ${err.message}`);
    } finally {
      setResendingId(null);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
              <Send className="w-7 h-7 text-[#405189]" />
              Hub de Mensageria & Notificações
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestão integrada dos canais Telegram, WhatsApp (Meta Cloud API oficial), disparos de teste e auditoria de entrega.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setTestCanal('telegram');
                setTestDestinatario('');
                setTestMensagem('Olá! Esta é uma notificação de teste enviada pelo painel administrativo BuscaVag.');
                setTestResponse(null);
                setTestModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#405189] hover:bg-[#364473] text-white shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              Disparo Manual de Teste
            </button>
            <button
              onClick={fetchMessagingData}
              disabled={loadingLogs}
              className="p-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-[#405189]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert Global */}
        {actionFeedback && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-medium flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span>{actionFeedback}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Fechar
            </button>
          </div>
        )}

        {/* 4 VelzonStatWidget Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <VelzonStatWidget
            title="Total de Notificações"
            value={stats.totalSent.toLocaleString('pt-BR')}
            icon={<Send className="w-6 h-6" />}
            variant="primary"
            trend={{
              value: `${stats.successRate}% Sucesso`,
              isPositive: stats.successRate >= 95,
              label: 'histórico total',
            }}
          />

          <VelzonStatWidget
            title="Alertas Telegram"
            value={stats.telegramCount.toLocaleString('pt-BR')}
            icon={<Bot className="w-6 h-6" />}
            variant="info"
            trend={{
              value: connectors.telegram.isConfigured ? 'Conectado' : 'Mock',
              isPositive: connectors.telegram.isConfigured,
              label: connectors.telegram.chatId || 'modo simulado',
            }}
          />

          <VelzonStatWidget
            title="Notificações WhatsApp"
            value={stats.whatsappCount.toLocaleString('pt-BR')}
            icon={<MessageSquare className="w-6 h-6" />}
            variant="success"
            trend={{
              value: connectors.whatsapp.provider.toUpperCase(),
              isPositive: connectors.whatsapp.isMetaCloudReady,
              label: connectors.whatsapp.metaPhoneNumberId || 'provedor ativo',
            }}
          />

          <VelzonStatWidget
            title="Falhas de Envio"
            value={stats.failedCount.toLocaleString('pt-BR')}
            icon={<AlertTriangle className="w-6 h-6" />}
            variant={stats.failedCount > 0 ? 'danger' : 'success'}
            trend={{
              value: stats.failedCount > 0 ? 'Atenção' : '0 erros',
              isPositive: stats.failedCount === 0,
              label: 'auditoria',
            }}
          />
        </div>

        {/* Abas Velzon */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('telegram')}
              className={`py-3.5 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'telegram'
                  ? 'border-[#405189] text-[#405189]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Bot className="w-4 h-4" />
              Canal Telegram
              <VelzonBadge
                variant={connectors.telegram.isConfigured ? 'success' : 'info'}
                size="sm"
              >
                {connectors.telegram.mode.toUpperCase()}
              </VelzonBadge>
            </button>

            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`py-3.5 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'whatsapp'
                  ? 'border-[#405189] text-[#405189]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Canal WhatsApp (Meta Cloud API)
              <VelzonBadge
                variant={connectors.whatsapp.provider === 'meta_cloud' ? 'primary' : 'warning'}
                size="sm"
              >
                {connectors.whatsapp.provider.toUpperCase()}
              </VelzonBadge>
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`py-3.5 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'historico'
                  ? 'border-[#405189] text-[#405189]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              Histórico & Auditoria de Entrega
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {totalLogs}
              </span>
            </button>
          </nav>
        </div>

        {/* ABA 1: CANAL TELEGRAM */}
        {activeTab === 'telegram' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <VelzonCard
                title={
                  <span className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#405189]" />
                    Status do Conector Telegram
                  </span>
                }
              >
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-slate-500">Status Operacional:</span>
                    <VelzonBadge
                      variant={connectors.telegram.isConfigured ? 'success' : 'warning'}
                    >
                      {connectors.telegram.isConfigured ? 'Conectado (Live)' : 'Modo Simulado (Mock)'}
                    </VelzonBadge>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-slate-500">Token do Bot:</span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {connectors.telegram.hasToken ? 'Configurado (TELEGRAM_BOT_TOKEN)' : 'Não informado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-slate-500">Chat ID Padrão:</span>
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {connectors.telegram.chatId || 'TELEGRAM_CHAT_ID não definido'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Throttling Ativo:</span>
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> 800ms anti-ETIMEDOUT
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setTestCanal('telegram');
                        setTestDestinatario('');
                        setTestMensagem('🚀 <b>[TESTE TELEGRAM]</b> O BuscaVag Bot está ativo e respondendo normalmente!');
                        setTestResponse(null);
                        setTestModalOpen(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-lg text-sm font-semibold bg-[#405189] hover:bg-[#364473] text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Disparar Alerta de Teste
                    </button>
                  </div>
                </div>
              </VelzonCard>

              <VelzonCard
                title={
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Diretrizes de Formatação & Privacidade
                  </span>
                }
              >
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    • <b>Formato Oficial:</b> Alertas usam tags HTML seguras (<code>&lt;b&gt;</code>, <code>&lt;i&gt;</code>, <code>&lt;a&gt;</code>).
                  </p>
                  <p>
                    • <b>Privacidade Rigorosa:</b> Informações internas de análise do candidato (<code>resumeTips</code>) são estritamente ocultadas para evitar exposição indevida.
                  </p>
                  <p>
                    • <b>Resiliência:</b> Se o bot não estiver configurado em variáveis de ambiente, a mensageria entra em fallback simulado seguro sem quebrar o fluxo de scraping.
                  </p>
                </div>
              </VelzonCard>
            </div>

            <div className="lg:col-span-2">
              <VelzonCard
                title={
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-sky-600" />
                    Preview de Alerta de Vaga em Tempo Real
                  </span>
                }
              >
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-sans shadow-md border border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800">
                      <Bot className="w-4 h-4 text-sky-400" />
                      <span className="font-semibold text-sky-400">BuscaVag Bot</span> • Notificação Automática
                    </div>
                    <div className="text-sm space-y-2">
                      <p className="font-bold text-amber-400">🚨 NOVA VAGA ENCONTRADA!</p>
                      <p>📌 <b>Título:</b> Desenvolvedor(a) Full Stack TypeScript / React</p>
                      <p>🏢 <b>Empresa:</b> InovaTech Soluções</p>
                      <p>🌐 <b>Plataforma:</b> GUPY</p>
                      <p>📍 <b>Local:</b> Remoto (Brasil)</p>
                      <p>📅 <b>Publicado em:</b> 29/09/2026</p>
                      <p>🏷️ <b>Categoria:</b> Desenvolvimento Full Stack</p>
                      <p className="text-emerald-400 font-medium">⭐ <b>Score Geral:</b> 94/100 (Alta Aderência)</p>
                      <p className="text-xs text-slate-300 pl-2 border-l border-slate-700">
                        📊 <i>Stack: 95/100 | Nível: 90/100 | Local: 95/100</i>
                      </p>
                      <p className="text-amber-300 text-xs">⚠️ <b>Gaps / Requisitos adicionais:</b> Docker, Kubernetes</p>
                      <p className="text-xs text-slate-300">💡 <b>Parecer IA:</b> Candidato possui perfeita aderência em TypeScript e Next.js com forte alinhamento ao modelo remoto.</p>
                      <div className="pt-2">
                        <span className="text-sky-400 underline font-medium cursor-pointer">
                          🔗 Clique aqui para ver a vaga
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                    <span>Template verificado com sanitização HTML e proteção contra XSS e injeção de tags.</span>
                    <button
                      onClick={() => handleCopyText(`🚨 NOVA VAGA ENCONTRADA!\n📌 Título: Desenvolvedor Full Stack\n🏢 Empresa: InovaTech Soluções\n⭐ Score: 94/100`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors font-medium"
                    >
                      {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedText ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                  </div>
                </div>
              </VelzonCard>
            </div>
          </div>
        )}

        {/* ABA 2: CANAL WHATSAPP (META CLOUD API) */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <VelzonCard
                  title={
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      Conector WhatsApp (Meta Cloud API)
                    </span>
                  }
                >
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-slate-500">Provedor Ativo:</span>
                      <VelzonBadge
                        variant={connectors.whatsapp.provider === 'meta_cloud' ? 'primary' : 'info'}
                      >
                        {connectors.whatsapp.provider.toUpperCase()}
                      </VelzonBadge>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-slate-500">Meta Phone Number ID:</span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {connectors.whatsapp.metaPhoneNumberId || 'META_PHONE_NUMBER_ID'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-slate-500">Destinatário Padrão:</span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {connectors.whatsapp.defaultRecipient || 'WHATSAPP_DEFAULT_RECIPIENT'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-slate-500">Threshold Mínimo de Score:</span>
                      <span className="font-semibold text-slate-800">{connectors.whatsapp.minScore}/100</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Integração Oficial:</span>
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Meta Graph v18.0 REST
                      </span>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setTestCanal('whatsapp');
                          setTestDestinatario(connectors.whatsapp.defaultRecipient || '');
                          setTestMensagem('🚀 *[TESTE WHATSAPP - BUSCAVAG]*\n\nConexão com a Meta Cloud API oficial ativa e validada com sucesso!');
                          setTestResponse(null);
                          setTestModalOpen(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-lg text-sm font-semibold bg-[#405189] hover:bg-[#364473] text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Disparar Teste WhatsApp
                      </button>
                    </div>
                  </div>
                </VelzonCard>

                <VelzonCard
                  title={
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#405189]" />
                      Provedores Suportados
                    </span>
                  }
                >
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100">
                      <p className="font-semibold text-indigo-900">1. Meta Cloud API (Recomendado)</p>
                      <p className="mt-0.5 text-slate-600">API direta e oficial do WhatsApp Business sem depender de servidores intermediários.</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="font-semibold text-slate-800">2. Evolution API & Webhook</p>
                      <p className="mt-0.5 text-slate-600">Suporte mantido com chave de API e instância customizada para integrações legadas.</p>
                    </div>
                  </div>
                </VelzonCard>
              </div>

              {/* Gerador de Pitch Dinâmico */}
              <div className="lg:col-span-2 space-y-6">
                <VelzonCard
                  title={
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Gerador de Pitch / Apresentação Contextualizado
                    </span>
                  }
                >
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Simule a geração de pitches personalizados de candidatura com precedência de cargo e regras anti-alucinação de tecnologias.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <VelzonLabel required>Título da Vaga</VelzonLabel>
                        <VelzonInput
                          type="text"
                          value={pitchForm.title}
                          onChange={(e) => setPitchForm({ ...pitchForm, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <VelzonLabel required>Empresa</VelzonLabel>
                        <VelzonInput
                          type="text"
                          value={pitchForm.company}
                          onChange={(e) => setPitchForm({ ...pitchForm, company: e.target.value })}
                        />
                      </div>
                      <div>
                        <VelzonLabel>Contato Direto (Opcional)</VelzonLabel>
                        <VelzonInput
                          type="text"
                          value={pitchForm.directContact}
                          onChange={(e) => setPitchForm({ ...pitchForm, directContact: e.target.value })}
                          placeholder="Ex: recrutador@empresa.com"
                        />
                      </div>
                      <div>
                        <VelzonLabel required>Nome do Candidato</VelzonLabel>
                        <VelzonInput
                          type="text"
                          value={pitchForm.candidateName}
                          onChange={(e) => setPitchForm({ ...pitchForm, candidateName: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <VelzonLabel required>Stack Real do Candidato (Separada por vírgula)</VelzonLabel>
                        <VelzonInput
                          type="text"
                          value={pitchForm.primaryStack}
                          onChange={(e) => setPitchForm({ ...pitchForm, primaryStack: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={handleGeneratePitch}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#405189] hover:bg-[#364473] text-white transition-all shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Gerar Pitch do Candidato
                      </button>
                    </div>

                    {generatedPitch && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs whitespace-pre-wrap relative border border-slate-800 shadow-md">
                        <button
                          onClick={() => handleCopyText(generatedPitch)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Copiar Pitch"
                        >
                          {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {generatedPitch}
                      </div>
                    )}
                  </div>
                </VelzonCard>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: HISTÓRICO & AUDITORIA DE ENTREGA */}
        {activeTab === 'historico' && (
          <div className="space-y-4">
            {/* Barra de Filtros Velzon */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#1f2430] border border-[#e9ebec] dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="w-full md:w-80">
                <VelzonInput
                  type="text"
                  placeholder="Buscar em mensagens, destinatários..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Canal:</span>
                  <VelzonSelect
                    value={canalFilter}
                    onChange={(e) => {
                      setCanalFilter(e.target.value as any);
                      setPage(1);
                    }}
                    className="w-36"
                  >
                    <option value="all">Todos os Canais</option>
                    <option value="telegram">Telegram</option>
                    <option value="whatsapp">WhatsApp</option>
                  </VelzonSelect>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                  <VelzonSelect
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setPage(1);
                    }}
                    className="w-44"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="delivered">Entregues (Sucesso)</option>
                    <option value="failed">Falhas (Erros)</option>
                  </VelzonSelect>
                </div>
              </div>
            </div>

            {/* Tabela Velzon */}
            <div className="rounded-xl border border-[#e9ebec] dark:border-slate-800 bg-white dark:bg-[#1f2430] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f9fa] dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-[#e9ebec] dark:border-slate-800 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Canal</th>
                      <th className="py-3 px-4">Destinatário</th>
                      <th className="py-3 px-4">Status & Provedor</th>
                      <th className="py-3 px-4">Mensagem / Conteúdo</th>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loadingLogs ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#405189]" />
                          Carregando logs de mensageria...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          Nenhum registro de disparo encontrado.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <VelzonBadge
                              variant={log.canal === 'telegram' ? 'info' : log.canal === 'whatsapp' ? 'success' : 'dark'}
                            >
                              {log.canal.toUpperCase()}
                            </VelzonBadge>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                            {log.destinatario || 'Canal Padrão'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <VelzonBadge
                                variant={log.status === 'delivered' ? 'success' : 'danger'}
                              >
                                {log.status === 'delivered' ? 'ENTREGUE' : 'FALHOU'}
                              </VelzonBadge>
                              {log.isMock && (
                                <span className="text-[10px] text-slate-400 font-mono">Modo Simulado</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate" title={log.mensagem}>
                            <span className="text-slate-800">{log.preview || log.mensagem}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {log.status === 'failed' && (
                                <button
                                  onClick={() => handleResend(log.id)}
                                  disabled={resendingId === log.id}
                                  className="p-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                                  title="Reenviar Mensagem"
                                >
                                  <RotateCcw className={`w-3.5 h-3.5 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                title="Inspecionar Payload & Metadata"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="py-3 px-4 border-t border-slate-200 bg-[#f8f9fa] flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Mostrando <b>{logs.length}</b> de <b>{totalLogs}</b> disparos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-600 font-semibold px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DISPARO MANUAL DE TESTE */}
        <VelzonModal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          title="Disparo Manual de Mensagem de Teste"
        >
          <div className="space-y-4">
            <div>
              <VelzonLabel required>Canal de Destino</VelzonLabel>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTestCanal('telegram')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                    testCanal === 'telegram'
                      ? 'border-[#405189] bg-indigo-50 dark:bg-indigo-950/40 text-[#405189] dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  Telegram
                </button>
                <button
                  type="button"
                  onClick={() => setTestCanal('whatsapp')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                    testCanal === 'whatsapp'
                      ? 'border-[#405189] bg-indigo-50 dark:bg-indigo-950/40 text-[#405189] dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
            </div>

            <div>
              <VelzonLabel>
                Destinatário (Chat ID ou Telefone com DDI/DDD)
              </VelzonLabel>
              <VelzonInput
                type="text"
                value={testDestinatario}
                onChange={(e) => setTestDestinatario(e.target.value)}
                placeholder={testCanal === 'telegram' ? 'Deixe vazio para canal padrão' : 'Ex: 5511999998888'}
              />
            </div>

            <div>
              <VelzonLabel required>Texto da Mensagem</VelzonLabel>
              <VelzonTextarea
                rows={4}
                value={testMensagem}
                onChange={(e) => setTestMensagem(e.target.value)}
                placeholder="Digite a mensagem de teste..."
              />
            </div>

            {testResponse && (
              <div
                className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  testResponse.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResponse.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                <span>{testResponse.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={sendingTest || !testMensagem.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#405189] hover:bg-[#364473] text-white flex items-center gap-2 disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-spin' : ''}`} />
                {sendingTest ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        </VelzonModal>

        {/* MODAL: INSPEÇÃO DE PAYLOAD / LOG */}
        <VelzonModal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Inspeção de Disparo - ${selectedLog?.canal?.toUpperCase() || 'Log'}`}
        >
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">ID do Registro:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <VelzonBadge variant={selectedLog.status === 'delivered' ? 'success' : 'danger'}>
                    {selectedLog.status.toUpperCase()}
                  </VelzonBadge>
                </div>
                <div>
                  <span className="text-slate-500 block">Destinatário:</span>
                  <span className="font-semibold text-slate-800">{selectedLog.destinatario || 'Canal Padrão'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data / Hora:</span>
                  <span className="text-slate-700">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Metadata Completa (JSON)</label>
                  <button
                    onClick={() => handleCopyText(selectedLog.metadata || '{}')}
                    className="inline-flex items-center gap-1 text-[11px] text-[#405189] hover:underline font-semibold"
                  >
                    {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedText ? 'Copiado!' : 'Copiar JSON'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.metadata || '{}'), null, 2);
                    } catch {
                      return selectedLog.metadata || '{}';
                    }
                  })()}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </VelzonModal>
      </div>
    </AdminLayout>
  );
}
