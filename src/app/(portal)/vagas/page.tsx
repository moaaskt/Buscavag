import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicJobRepository } from '@/db/publicJobRepository';
import { buildVagasHref } from '@/utils/publicJobFormatters';
import { PublicJobCard } from '@/components/portal/PublicJobCard';
import { buttonVariants } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vagas de Tecnologia e Programação | Buscavag',
  description:
    'Catálogo público e gratuito de vagas de desenvolvimento de software, engenharia e tecnologia no Brasil.',
};

interface VagasPageProps {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}

export default async function VagasPage({ searchParams }: VagasPageProps) {
  const resolved = await searchParams;
  const rawQ = Array.isArray(resolved.q) ? resolved.q[0] : resolved.q;
  const rawPage = Array.isArray(resolved.page) ? resolved.page[0] : resolved.page;

  const q = (rawQ ?? '').trim().slice(0, 120);
  const parsedPage = Number.parseInt(rawPage ?? '1', 10);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const repo = new PublicJobRepository();
  const result = repo.searchPublicJobs({ q, page, limit: 24 });
  const { jobs, pagination } = result;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <header className="space-y-2 border-b border-border/80 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Vagas de Tecnologia e Programação
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {pagination.totalCount}{' '}
            {pagination.totalCount === 1 ? 'oportunidade ativa' : 'oportunidades ativas'}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Catálogo público aberto, sem cadastro obrigatório, com vagas deduplicadas e curadoria anti-ruído.
        </p>
      </header>

      {jobs.length === 0 ? (
        <section className="rounded-xl border border-border/80 bg-card p-6 text-center space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            {q
              ? `Nenhuma vaga encontrada para "${q}"`
              : 'Nenhuma vaga disponível nesta página'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Tente buscar outro termo ou retornar para o início do catálogo.
          </p>
          <div>
            <Link href={buildVagasHref()} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Ver todas as vagas
            </Link>
          </div>
        </section>
      ) : (
        <section aria-label="Lista de vagas">
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <PublicJobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
