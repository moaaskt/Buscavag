import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { PublicJobRepository } from '@/db/publicJobRepository';
import { PublicJobCard } from '@/components/portal/PublicJobCard';
import { PublicSearchBar } from '@/components/portal/PublicSearchBar';
import { PublicEmptyState } from '@/components/portal/PublicEmptyState';
import { PublicPagination } from '@/components/portal/PublicPagination';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Vagas de Tecnologia e Programação
        </h1>
        <p className="text-sm text-muted-foreground">
          Catálogo público aberto, sem cadastro obrigatório ou paywall, com oportunidades deduplicadas e curadoria anti-ruído.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-10 w-full rounded-md" />}>
        <PublicSearchBar initialQuery={q} />
      </Suspense>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
        <span>
          {result.pagination.totalCount} oportunidade
          {result.pagination.totalCount === 1 ? '' : 's'} ativa
          {result.pagination.totalCount === 1 ? '' : 's'}
        </span>
        {q.length > 0 && (
          <Badge variant="secondary" className="font-mono text-xs">
            Filtro: &ldquo;{q}&rdquo;
          </Badge>
        )}
      </div>

      {result.jobs.length === 0 ? (
        <PublicEmptyState
          query={q}
          page={result.pagination.page}
          totalPages={result.pagination.totalPages}
        />
      ) : (
        <section aria-label="Lista de vagas">
          <div className="flex flex-col gap-3">
            {result.jobs.map((job) => (
              <PublicJobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {result.jobs.length > 0 && result.pagination.totalCount > 0 && (
        <PublicPagination
          page={result.pagination.page}
          totalPages={result.pagination.totalPages}
          totalCount={result.pagination.totalCount}
          q={q}
        />
      )}
    </div>
  );
}
