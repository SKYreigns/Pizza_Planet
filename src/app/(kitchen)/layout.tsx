import { type ReactNode } from 'react'
import { requireKitchen } from '@/lib/auth'

interface KitchenLayoutProps {
  children: ReactNode
}

/**
 * Kitchen Display System layout.
 * Enforces `kitchen` or `owner` role.
 * Fullscreen, no distracting navigation — optimised for tablet mounting.
 */
export default async function KitchenLayout({ children }: KitchenLayoutProps) {
  const user = await requireKitchen()

  return (
    <div className="min-h-screen bg-cosmic-slate text-cream flex flex-col">
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
          <span className="font-bold text-lg tracking-tight">
            Pizza Planet — Kitchen
          </span>
        </div>
        <span className="text-sm text-white/60">
          {user.profile.full_name || user.email}
        </span>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
