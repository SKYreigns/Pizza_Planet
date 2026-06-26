import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Unauthorised',
  description: 'You do not have permission to access this page.',
  robots: { index: false, follow: false },
}

interface UnauthorizedPageProps {
  searchParams: Promise<{ code?: string }>
}

const errorMessages: Record<string, { title: string; body: string }> = {
  MISSING_PROFILE: {
    title: 'Account setup incomplete',
    body: 'Your account was created but the profile setup did not complete. Please contact support.',
  },
  FORBIDDEN: {
    title: 'Access denied',
    body: 'You do not have the required permissions to view this page.',
  },
  EXPIRED_SESSION: {
    title: 'Session expired',
    body: 'Your session has expired. Please sign in again.',
  },
  DEFAULT: {
    title: 'Unauthorised',
    body: 'You do not have permission to access this page.',
  },
}

/**
 * Generic unauthorised error page.
 * Displayed when a user has a valid session but insufficient role, or when
 * a profile record is missing.
 */
export default async function UnauthorizedPage({
  searchParams,
}: UnauthorizedPageProps) {
  const params = await searchParams
  const code = params.code ?? 'DEFAULT'
  const message = errorMessages[code] ?? errorMessages.DEFAULT

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div
          className="text-6xl mb-6"
          aria-hidden="true"
          role="img"
        >
          🚫
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          {message.title}
        </h1>
        <p className="text-muted-foreground mb-8">{message.body}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            Go to Home
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-lg border border-border text-foreground font-semibold px-6 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
