import React from 'react';
import { PublicHeader } from '@/components/portal/PublicHeader';
import { PublicFooter } from '@/components/portal/PublicFooter';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased overflow-x-hidden">
      <PublicHeader />
      <main className="flex-1 w-full">{children}</main>
      <PublicFooter />
    </div>
  );
}
