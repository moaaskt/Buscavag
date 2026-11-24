import React from 'react';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
