import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function JobCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-5 w-3/4 sm:w-2/3" />

          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          <Skeleton className="h-3.5 w-40" />
        </div>

        <div className="shrink-0 pt-1 sm:pt-0">
          <Skeleton className="h-7 w-full sm:w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function JobCardSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando vagas"
      className="flex flex-col gap-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <JobCardSkeleton key={index} />
      ))}
    </div>
  );
}
