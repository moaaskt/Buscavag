import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { buildVagasHref } from '@/utils/publicJobFormatters';

export const POPULAR_TECH_TERMS = ['React', 'Node.js', 'Python', 'Java'] as const;

export interface PublicEmptyStateProps {
  query?: string;
  page?: number;
  totalPages?: number;
}

export function PublicEmptyState({
  query,
  page,
  totalPages,
}: PublicEmptyStateProps) {
  const trimmedQuery = query?.trim() || '';
  const currentPage = page ?? 1;
  const isOutOfBoundsPage =
    currentPage > 1 &&
    (totalPages === undefined || totalPages === 0 || currentPage > totalPages);

  const heading = isOutOfBoundsPage
    ? 'Nenhuma vaga disponível nesta página'
    : trimmedQuery
      ? `Nenhuma vaga encontrada para "${trimmedQuery}"`
      : 'Nenhuma oportunidade ativa encontrada no momento';

  const helperText = isOutOfBoundsPage
    ? 'A página solicitada está além do limite atual de resultados. Volte para a página 1 ou escolha uma tecnologia popular abaixo.'
    : trimmedQuery
      ? 'Tente buscar por outro termo, tecnologia ou empresa, ou explore uma das stacks populares abaixo.'
      : 'Experimente buscar por uma das stacks populares abaixo para explorar oportunidades de tecnologia.';

  return (
    <div className="rounded-xl border border-border/80 bg-card/50 px-6 py-12 text-center space-y-4">
      <SearchX className="mx-auto h-10 w-10 text-muted-foreground" />

      <div className="space-y-1.5 max-w-md mx-auto">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {helperText}
        </p>
      </div>

      {(currentPage > 1 || trimmedQuery.length > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {currentPage > 1 && (
            <Link
              href={buildVagasHref({ q: trimmedQuery, page: 1 })}
              className={buttonVariants({ variant: 'default', size: 'sm' })}
            >
              Voltar para a página 1
            </Link>
          )}
          {trimmedQuery.length > 0 && (
            <Link
              href="/vagas"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Ver todas as vagas
            </Link>
          )}
        </div>
      )}

      <div className="space-y-2 pt-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Sugestões populares
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {POPULAR_TECH_TERMS.map((term) => (
            <Link
              key={term}
              href={buildVagasHref({ q: term, page: 1 })}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {term}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
