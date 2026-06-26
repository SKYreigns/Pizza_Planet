import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Pizza Planet account.',
  robots: { index: false, follow: false },
}

interface LoginPageProps {
  searchParams: Promise<{ next?: string; reason?: string }>
}

/**
 * Admin login page. If the user is already signed in with the owner role,
 * redirect immediately to /admin. Prevents back-navigation to login.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const result = await getCurrentUser()

  if (result.success && result.data.role === 'owner') {
    redirect(params.next ?? '/admin')
  }

  const reasonMessages: Record<string, string> = {
    insufficient_role:
      'You do not have permission to access that page. Please sign in with an admin account.',
  }

  const reasonMessage = params.reason ? reasonMessages[params.reason] : null

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Pizza Planet
          </h1>
          <p className="text-muted-foreground text-sm">Admin sign-in</p>
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
          <LoginForm next={params.next} />
        </div>
      </div>
    </main>
  )
}
