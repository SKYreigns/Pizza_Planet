import { type ReactNode } from 'react'
import { requireOwner } from '@/lib/auth'

interface AdminLayoutProps {
  children: ReactNode
}

/**
 * Admin route group layout.
 * Enforces `owner` role — redirects to /auth/login on failure.
 * All admin pages inherit this protection automatically.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  // requireOwner redirects if no session or wrong role — never reaches
  // the render phase without a valid owner session.
  const user = await requireOwner()

  return (
    <div className="min-h-screen flex bg-muted text-foreground">
      <aside
        className="w-64 bg-card border-r border-border flex flex-col hidden md:flex"
        aria-label="Admin navigation"
      >
        <div className="p-6 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Pizza Planet
          </p>
          <p className="text-sm font-bold text-foreground truncate">
            {user.profile.full_name || user.email || 'Owner'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {user.role}
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1" aria-label="Admin menu">
          <a
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            Dashboard
          </a>
          <a
            href="/admin/orders"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            Orders
          </a>
          <a
            href="/admin/menu"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            Menu
          </a>
          <a
            href="/admin/analytics"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            Analytics
          </a>
          <a
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            Settings
          </a>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4">
          <span className="font-semibold text-foreground">Admin Dashboard</span>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
