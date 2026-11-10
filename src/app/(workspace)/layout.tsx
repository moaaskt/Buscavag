'use client';

import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkspaceSessionProvider } from '@/components/workspace/WorkspaceSessionContext';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { ConflictBanner } from '@/components/workspace/ConflictBanner';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceSessionProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          <WorkspaceSidebar />
          <div className="flex flex-1 flex-col overflow-hidden bg-background">
            <WorkspaceHeader />
            <ConflictBanner />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="mx-auto max-w-7xl w-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </WorkspaceSessionProvider>
  );
}
