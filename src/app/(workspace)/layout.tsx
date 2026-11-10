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
          <div className="flex flex-1 flex-col overflow-hidden bg-background min-w-0">
            <WorkspaceHeader />
            <ConflictBanner />
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto w-full max-w-[1600px]">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </WorkspaceSessionProvider>
  );
}
