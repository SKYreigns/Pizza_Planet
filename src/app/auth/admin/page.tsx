import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import AdminLoginForm from './AdminLoginForm'

export const metadata: Metadata = {
  title: 'Owner Admin Sign In',
  description: 'Secure administrative sign in for Pizza Planet.',
  robots: { index: false, follow: false },
}

interface AdminPageProps {
  searchParams: Promise<{ next?: string; reason?: string }>
}

export default async function AdminLoginPage({ searchParams }: AdminPageProps) {
  const params = await searchParams
  const result = await getCurrentUser()

  if (result.success && result.data.role === 'owner') {
    redirect(params.next ?? '/admin')
  }

  const reasonMessages: Record<string, string> = {
    insufficient_role:
      'You do not have owner permission to access the administrative dashboard.',
  }

  const reasonMessage = params.reason ? reasonMessages[params.reason] : null

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pizza Planet
          </h1>
          <p className="text-muted-foreground text-sm">Owner & Administrative Portal</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          {reasonMessage && (
            <div
              role="alert"
              className="mb-6 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 text-sm"
            >
              {reasonMessage}
            </div>
          )}
          <AdminLoginForm next={params.next} />
        </div>
      </div>
    </main>
  )
}
