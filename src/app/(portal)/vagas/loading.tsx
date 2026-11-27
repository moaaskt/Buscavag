import { Skeleton } from '@/components/ui/skeleton';
import { JobCardSkeletonList } from '@/components/portal/JobCardSkeleton';

export default function VagasLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 sm:w-96" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <Skeleton className="h-10 w-full rounded-md" />

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
      </div>

      <JobCardSkeletonList count={6} />
    </div>
  );
}
