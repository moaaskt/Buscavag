'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Copy, Check } from 'lucide-react';
import { VelzonModal } from '@/components/admin/ui/VelzonModal';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showTotpInput, setShowTotpInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup 2FA State
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupData, setSetupData] = useState<{
    adminId: string;
    email: string;
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          totpCode: showTotpInput ? totpCode : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requireTotp) {
          setShowTotpInput(true);
        }
        setError(data.error || 'Falha ao autenticar.');
        return;
      }

      // Requer configuração inicial de 2FA
      if (data.requireSetupTotp) {
        const setupRes = await fetch(`/api/admin/auth/setup-totp?adminId=${data.adminId}`);
        const setupJson = await setupRes.json();
        if (setupJson.success) {
          setSetupData({
            adminId: data.adminId,
            email: data.email,
            secret: setupJson.data.secret,
            qrCodeDataUrl: setupJson.data.qrCodeDataUrl,
          });
          setSetupModalOpen(true);
          return;
        }
      }

      if (data.success) {
        router.push('/admin');
        router.refresh();
      }
    } catch (err: any) {
      setError('Erro de conexão ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    setSetupError(null);
    setSetupLoading(true);

    try {
      const res = await fetch('/api/admin/auth/setup-totp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: setupData.adminId,
          secret: setupData.secret,
          totpCode: setupCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSetupError(data.error || 'Código inválido. Tente novamente.');
        return;
      }

      setSetupModalOpen(false);
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setSetupError('Erro ao confirmar configuração de 2FA.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#27262C] flex items-center justify-center p-6 selection:bg-[#10B981]/30 selection:text-white font-sans">
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0 1000px #27262c inset !important;
          box-shadow: 0 0 0 1000px #27262c inset !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
      `}</style>

      {/* ========================================================================= */}
      {/* VETORES E FORMAS GEOMÉTRICAS DO FIGMA */}
      {/* ========================================================================= */}

      {/* Círculo Grande Translúcido (nó 1:5) - Esquerda */}
      <div
        className="pointer-events-none absolute -left-[585px] top-[102px] w-[914px] h-[914px] z-0 select-none hidden md:block"
        aria-hidden="true"
      >
        <Image
          src="/images/figma/ellipse1.svg"
          alt=""
          width={914}
          height={914}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* Círculo Grande Translúcido - Mobile */}
      <div
        className="pointer-events-none absolute -left-[280px] top-[30px] w-[460px] h-[460px] z-0 select-none md:hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/figma/ellipse1.svg"
          alt=""
          width={460}
          height={460}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* Círculo Pequeno Sólido Esmeralda (nó 1:6) */}
      <div
        className="pointer-events-none absolute left-[30px] md:left-[118px] top-[50px] md:top-[167px] w-[44px] md:w-[76px] h-[44px] md:h-[76px] z-0 select-none"
        aria-hidden="true"
      >
        <Image
          src="/images/figma/ellipse2.svg"
          alt=""
          width={76}
          height={76}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* Vetor Subtract (nó 1:17) - Canto Superior Direito com Ranhuras Diagonais */}
      {/* Tamanho contido e equilibrado com 4-5 listras visíveis */}
      <div
        className="pointer-events-none absolute -right-[460px] -top-[460px] w-[920px] h-[920px] z-0 select-none hidden xl:block"
        aria-hidden="true"
      >
        <Image
          src="/images/figma/subtract.svg"
          alt=""
          width={920}
          height={920}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* Vetor Subtract - Telas Médias / Laptops */}
      <div
        className="pointer-events-none absolute -right-[360px] -top-[360px] w-[720px] h-[720px] z-0 select-none hidden md:block xl:hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/figma/subtract.svg"
          alt=""
          width={720}
          height={720}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* Vetor Subtract - Mobile */}
      <div
        className="pointer-events-none absolute -right-[210px] -top-[210px] w-[460px] h-[460px] z-0 select-none md:hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/figma/subtract.svg"
          alt=""
          width={460}
          height={460}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* ========================================================================= */}
      {/* POLÍGONOS GEOMÉTRICOS - CANTO INFERIOR DIREITO (EXATAMENTE COMO NA FOTO 2) */}
      {/* ========================================================================= */}
      {/* Desktop / Tablet */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-0 select-none hidden md:block"
        aria-hidden="true"
      >
        {/* Polígono 3 (nó 1:27 - camada inferior direita, corta a borda da tela) */}
        <div className="absolute -right-[15px] -bottom-[25px] w-[250px] h-[250px]">
          <Image
            src="/images/figma/polygon3.svg"
            alt=""
            width={281}
            height={283}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Polígono 2 (nó 1:25 - camada intermediária) */}
        <div className="absolute right-[35px] bottom-[15px] w-[250px] h-[250px]">
          <Image
            src="/images/figma/polygon2.svg"
            alt=""
            width={281}
            height={283}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Polígono 1 (nó 1:20 - o triângulo principal com ponta alta à esquerda) */}
        <div className="absolute right-[85px] bottom-[55px] w-[250px] h-[250px]">
          <Image
            src="/images/figma/polygon1.svg"
            alt=""
            width={281}
            height={283}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Polígonos - Mobile */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-0 select-none md:hidden"
        aria-hidden="true"
      >
        {/* Polígono 3 Mobile */}
        <div className="absolute -right-[10px] -bottom-[15px] w-[160px] h-[160px]">
          <Image
            src="/images/figma/polygon3.svg"
            alt=""
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        </div>
        {/* Polígono 2 Mobile */}
        <div className="absolute right-[15px] bottom-[8px] w-[160px] h-[160px]">
          <Image
            src="/images/figma/polygon2.svg"
            alt=""
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        </div>
        {/* Polígono 1 Mobile */}
        <div className="absolute right-[40px] bottom-[30px] w-[160px] h-[160px]">
          <Image
            src="/images/figma/polygon1.svg"
            alt=""
            width={200}
            height={200}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORMULÁRIO CENTRAL EXATAMENTE COMO NO FIGMA (largura 531px) */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full max-w-[531px]">
        {/* Título "login" vetorizado exato do Figma (nó 1:30) */}
        <div className="mb-[70px] md:mb-[110px]">
          <Image
            src="/images/figma/login-title.svg"
            alt="login"
            width={185}
            height={94}
            className="w-[140px] md:w-[185px] h-auto select-none"
            priority
          />
        </div>

        {/* Mensagem de Erro Discreta */}
        {error && (
          <div className="mb-6 p-3 rounded bg-rose-950/40 border border-rose-600/50 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-[46px] md:space-y-[52px]">
          {/* Campo Username (nó 1:31 e nó 1:28) */}
          <div className="relative">
            <label
              htmlFor="username"
              className="block text-[#999999] text-base md:text-lg font-normal mb-2 tracking-normal select-none"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-white text-base md:text-lg focus:outline-none border-0 p-0 shadow-none ring-0 leading-normal"
              autoComplete="username"
            />
            {/* Linha branca inferior (nó 1:28) */}
            <div className="w-full h-[1px] md:h-[1.5px] bg-white/70 mt-2" />
          </div>

          {/* Campo Password (nó 1:32 e nó 1:29) */}
          <div className="relative">
            <label
              htmlFor="password"
              className="block text-[#999999] text-base md:text-lg font-normal mb-2 tracking-normal select-none"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-white text-base md:text-lg focus:outline-none border-0 p-0 shadow-none ring-0 leading-normal"
              autoComplete="current-password"
            />
            {/* Linha branca inferior (nó 1:29) */}
            <div className="w-full h-[1px] md:h-[1.5px] bg-white/70 mt-2" />
          </div>

          {/* Campo Condicional TOTP / 2FA */}
          {showTotpInput && (
            <div className="relative animate-in fade-in duration-200">
              <label
                htmlFor="totp"
                className="block text-[#10B981] text-sm md:text-base font-normal mb-2"
              >
                Código 2FA (6 dígitos)
              </label>
              <input
                id="totp"
                type="text"
                maxLength={6}
                autoFocus
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-transparent text-white text-lg font-mono tracking-[0.3em] focus:outline-none border-0 p-0 shadow-none ring-0"
              />
              <div className="w-full h-[1px] bg-[#10B981] mt-2" />
            </div>
          )}

          {/* Botão de Login Exato do Figma (nó 1:34) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] md:h-[48px] bg-[rgba(16,185,129,0.31)] hover:bg-[rgba(16,185,129,0.42)] active:bg-[rgba(16,185,129,0.5)] text-white text-base md:text-lg font-normal rounded-[3px] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <span>login</span>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 2FA PRIMEIRO ACESSO */}
      {/* ========================================================================= */}
      <VelzonModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        title="Configuração de 2FA Obrigatória"
        description="Escaneie o código com seu aplicativo autenticador para proteger sua conta."
        maxWidth="md"
      >
        {setupData && (
          <form onSubmit={handleConfirmSetup} className="space-y-4">
            {setupError && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-700 text-xs">
                {setupError}
              </div>
            )}

            <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
              <img
                src={setupData.qrCodeDataUrl}
                alt="QR Code TOTP"
                className="w-48 h-48 rounded"
              />
              <span className="text-[11px] text-slate-400 mt-2 font-mono">
                {setupData.email}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 font-mono">
                Chave Manual (Caso não consiga escanear)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={setupData.secret}
                  className="flex-1 py-1.5 px-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
                />
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                  title="Copiar chave secreta"
                >
                  {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-mono">
                Digite o código de 6 dígitos gerado pelo aplicativo:
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full py-2 text-base font-mono tracking-widest text-center bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={setupLoading || setupCode.length !== 6}
              className="w-full py-2.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              {setupLoading ? 'Validando...' : 'Ativar 2FA e Entrar no Painel'}
            </button>
          </form>
        )}
      </VelzonModal>
    </div>
  );
}
