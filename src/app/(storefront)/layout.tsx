import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-body antialiased selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <CartDrawer />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
    </div>
  );
}
