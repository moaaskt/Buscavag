'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLinkIcon, ClockIcon, ArrowRightIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatusPlaceholderCardProps {
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  targetPhase: string;
  legacyRoute: string;
  legacyTitle: string;
  features: string[];
}

export function StatusPlaceholderCard({
  title,
  category,
  description,
  icon: IconComponent,
  targetPhase,
  legacyRoute,
  legacyTitle,
  features,
}: StatusPlaceholderCardProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/60">
                <ClockIcon className="h-2.5 w-2.5" />
                {targetPhase}
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <Link href={legacyRoute}>
          <Button size="sm" className="gap-2 text-xs shrink-0 font-medium">
            <span>Acessar {legacyTitle}</span>
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Capacidades Integradas nesta Área (v25.0)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-foreground/90"
            >
              <ArrowRightIcon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span className="leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

