'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Falha ao realizar login');
        setLoading(false);
        return;
      }

      setSuccess(true);
      window.dispatchEvent(new CustomEvent('buscavag:auth-changed'));
      setTimeout(() => {
        router.push('/candidate');
        router.refresh();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-14rem)] py-8 px-4 w-full">
      <div className="w-full max-w-md">
          {/* Card Glassmorphism */}
          <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/70 p-6 sm:p-8 shadow-xl shadow-zinc-950/5 dark:shadow-2xl dark:shadow-black/50 backdrop-blur-xl overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-teal-500/10 dark:bg-cyan-500/15 blur-3xl pointer-events-none" />

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Portal do Candidato</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Acesse sua conta
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
                Faça login para gerenciar seu perfil, currículo e vagas salvas
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                <span>Login realizado com sucesso! Redirecionando...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 pl-9 pr-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 pl-9 pr-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold py-2.5 px-4 text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-950/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Painel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
              Ainda não tem conta?{' '}
              <Link
                href="/register"
                className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors"
              >
                Cadastre-se gratuitamente
              </Link>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium hover:underline transition-colors font-mono"
              >
                <span>⚡ Acessar Painel Admin (/admin/login)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
        </div>
      </div>
    </div>
  );
}

