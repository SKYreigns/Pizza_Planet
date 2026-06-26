import { type ReactNode } from 'react'
import { requireDelivery } from '@/lib/auth'

interface DeliveryLayoutProps {
  children: ReactNode
}

/**
 * Delivery rider view layout.
 * Enforces `delivery` or `owner` role.
 * Minimal mobile header — optimised for on-the-road use.
 */
export default async function DeliveryLayout({ children }: DeliveryLayoutProps) {
  const user = await requireDelivery()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <span className="font-bold text-foreground">🏍️ Pizza Planet Delivery</span>
        <span className="text-sm text-muted-foreground truncate max-w-[140px]">
          {user.profile.full_name || user.email}
        </span>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
