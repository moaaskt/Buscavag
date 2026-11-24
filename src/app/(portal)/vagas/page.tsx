import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, MapPin } from 'lucide-react';
import { PublicJobRepository } from '@/db/publicJobRepository';
import { buildVagasHref } from '@/utils/publicJobFormatters';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
        <section aria-label="Lista de vagas" className="flex flex-col gap-3">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="group relative rounded-xl border border-border/80 bg-card p-4 sm:p-5 transition-colors hover:border-border hover:bg-muted/30"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/90">{job.company}</span>
                      {job.location && (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{job.location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {(job.workModel || job.requiredSeniority || job.salary) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {job.workModel && <Badge variant="secondary">{job.workModel}</Badge>}
                      {job.requiredSeniority && (
                        <Badge variant="outline">{job.requiredSeniority}</Badge>
                      )}
                      {job.salary && <Badge variant="outline">{job.salary}</Badge>}
                    </div>
                  )}

                  <p className="font-mono text-xs text-muted-foreground">
                    via {job.platformLabel}
                    {job.publishedAtLabel ? ` • ${job.publishedAtLabel}` : ''}
                  </p>
                </div>

                {job.safeUrl && (
                  <div className="relative z-10 shrink-0">
                    <a
                      href={job.safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
                    >
                      <span>Candidatar-se</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
