import { requireAuth } from '@/lib/auth'
import { SignOutButton } from '@/components/auth/SignOutButton'

/**
 * Customer profile page. Requires any authenticated role.
 * The middleware already enforces the session; requireAuth is the
 * server-component-level double check per EngineeringStandards §7.2.
 */
export default async function ProfilePage() {
  const user = await requireAuth()

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <section className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Name
          </p>
          <p className="text-lg font-medium text-foreground">
            {user.profile.full_name || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Phone
          </p>
          <p className="text-lg font-medium text-foreground">
            {user.profile.phone || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Email
          </p>
          <p className="text-lg font-medium text-foreground">
            {user.email || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Account type
          </p>
          <p className="text-lg font-medium text-foreground capitalize">
            {user.role}
          </p>
        </div>
        <div className="pt-6 border-t border-border flex justify-end">
          <SignOutButton variant="destructive" className="w-full sm:w-auto" />
        </div>
      </section>
    </div>
  )
}
