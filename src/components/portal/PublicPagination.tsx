import Link from 'next/link';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { buildVagasHref, computePaginationPages } from '@/utils/publicJobFormatters';

export interface PublicPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  q?: string;
}

export function PublicPagination({
  page,
  totalPages,
  totalCount,
  q,
}: PublicPaginationProps) {
  if (totalPages <= 0 || totalCount <= 0) {
    return null;
  }

  const safePage = Math.min(totalPages, Math.max(1, Math.trunc(page) || 1));
  const pages = computePaginationPages(safePage, totalPages);
  const prevTarget = page > totalPages ? totalPages : safePage - 1;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60 pt-5">
      <div className="font-mono text-xs text-muted-foreground">
        Página {safePage} de {totalPages} • {totalCount} oportunidade
        {totalCount === 1 ? '' : 's'} ativa{totalCount === 1 ? '' : 's'}
      </div>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              {safePage > 1 ? (
                <PaginationPrevious
                  render={<Link href={buildVagasHref({ q, page: prevTarget })} />}
                />
              ) : (
                <PaginationPrevious
                  aria-disabled="true"
                  tabIndex={-1}
                  className="pointer-events-none opacity-50"
                />
              )}
            </PaginationItem>

            {pages.map((item, idx) => (
              <PaginationItem key={item === 'ellipsis' ? `ellipsis-${idx}` : `page-${item}`}>
                {item === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    isActive={item === safePage}
                    render={<Link href={buildVagasHref({ q, page: item })} />}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              {safePage < totalPages ? (
                <PaginationNext
                  render={<Link href={buildVagasHref({ q, page: safePage + 1 })} />}
                />
              ) : (
                <PaginationNext
                  aria-disabled="true"
                  tabIndex={-1}
                  className="pointer-events-none opacity-50"
                />
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
