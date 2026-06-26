import { ReactNode } from 'react';

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1">{children}</main>
    </div>
  );
}
