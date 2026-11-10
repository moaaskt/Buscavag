'use client';

import React, { useState } from 'react';
import { useWorkspaceSession } from './WorkspaceSessionContext';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { AlertTriangleIcon, ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ConflictBanner() {
  const { session } = useWorkspaceSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!session || !session.identityConflict) {
    return null;
  }

  return (
    <>
      <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Conflito de Sessões Ativas:</strong> Sessões de candidato e administrador detectadas simultaneamente.
              A visualização administrativa está bloqueada preventivamente até que você defina a identidade ativa.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            className="h-7 border-amber-500/40 bg-card hover:bg-amber-500/20 text-foreground text-xs font-medium gap-1.5 shrink-0"
          >
            Resolver Conflito
            <ArrowRightIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ConflictResolutionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

