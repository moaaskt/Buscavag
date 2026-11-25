import React from 'react';
import Link from 'next/link';
import { Building2, Clock, ExternalLink, MapPin } from 'lucide-react';
import type { PublicJobItem } from '@/db/publicJobRepository';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatPlatformLabel,
  formatRelativePublishedAtPtBr,
  getSafeExternalJobUrl,
  normalizeOptionalJobField,
} from '@/utils/publicJobFormatters';

interface PublicJobCardProps {
  job: PublicJobItem;
}

export function PublicJobCard({ job }: PublicJobCardProps) {
  const safeExternalUrl = job.safeUrl ?? getSafeExternalJobUrl(job.url);
  const platformLabel = job.platformLabel || formatPlatformLabel(job.platform);
  const publishedAtLabel =
    job.publishedAtLabel || formatRelativePublishedAtPtBr(job.publishedAt, job.createdAt);

  const location = normalizeOptionalJobField(job.location);
  const workModel = normalizeOptionalJobField(job.workModel);
  const requiredSeniority = normalizeOptionalJobField(job.requiredSeniority);
  const salary = normalizeOptionalJobField(job.salary);
  const techTags = Array.isArray(job.techStack) ? job.techStack.slice(0, 3) : [];
  const hasBadges = Boolean(workModel || requiredSeniority || salary || techTags.length > 0);

  return (
    <article className="group relative rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-colors hover:border-border hover:bg-muted/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2.5">
          <h2 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
            <Link
              href={`/vagas/${job.slug}`}
              prefetch={false}
              className="after:absolute after:inset-0 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {job.title}
            </Link>
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/90 min-w-0">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{job.company}</span>
            </span>

            {location && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[240px]">{location}</span>
              </span>
            )}
          </div>

          {hasBadges && (
            <div className="flex flex-wrap items-center gap-1.5">
              {workModel && <Badge variant="secondary">{workModel}</Badge>}
              {requiredSeniority && <Badge variant="outline">{requiredSeniority}</Badge>}
              {salary && (
                <Badge variant="outline" className="font-mono">
                  {salary}
                </Badge>
              )}
              {techTags.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
            <span>via {platformLabel}</span>
            {publishedAtLabel && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{publishedAtLabel}</span>
              </span>
            )}
          </div>
        </div>

        {safeExternalUrl && (
          <div className="relative z-10 shrink-0 pt-1 sm:pt-0">
            <a
              href={safeExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Candidatar-se para ${job.title} em ${platformLabel}`}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-1.5 w-full sm:w-auto'
              )}
            >
              <span>Candidatar-se</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
