import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Cookie-based Supabase client for Server Components, Server Actions,
 * and Route Handlers. Respects RLS using the visitor's session cookie.
 *
 * This is the standard client for all server-side reads and authenticated
 * mutations. Do NOT use this for admin operations that need to bypass RLS.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookies are read-only.
            // The middleware handles session refresh, so this is safe to ignore.
          }
        },
      },
    },
  )
}

/**
 * Service-role Supabase client that bypasses RLS.
 *
 * SECURITY — only call this after explicit authentication AND authorisation
 * checks. Never expose this client or its key to the browser.
 *
 * Permitted use sites (per EngineeringStandards §7.2):
 *   - Server Actions after role verification
 *   - API Route Handlers for webhook processing
 *
 * @see src/lib/auth/requireRole.ts for the gating helpers
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Admin operations require this env var to be configured on the server.',
    )
  }

  return createSupabaseAdminClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
