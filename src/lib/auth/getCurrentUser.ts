// =============================================================================
// getCurrentUser — Pizza Planet
// Server-side authenticated user retrieval.
// Always use this function in Server Actions and Server Components.
// Never call supabase.auth.getUser() directly outside of this module.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import type { AuthResult, AuthenticatedUser, UserProfile, UserRole } from '@/types/auth'

// ---------------------------------------------------------------------------
// Profile fetch (isolated so it can be mocked in tests without re-exporting)
// ---------------------------------------------------------------------------

async function fetchProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, avatar_url, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as UserProfile
}

// ---------------------------------------------------------------------------
// Primary export
// ---------------------------------------------------------------------------

/**
 * Retrieves the currently authenticated user and their profile from the database.
 *
 * Pipeline:
 * 1. Call `supabase.auth.getUser()` — validates the JWT, refreshes if needed.
 * 2. If no user, return `NO_SESSION` error.
 * 3. Fetch the user's row from `public.profiles`.
 * 4. If profile is missing (edge case: auth user exists but trigger failed),
 *    return `MISSING_PROFILE` error.
 * 5. Return the merged `AuthenticatedUser`.
 *
 * @returns AuthResult<AuthenticatedUser>
 */
export async function getCurrentUser(): Promise<AuthResult<AuthenticatedUser>> {
  let supabase: Awaited<ReturnType<typeof createClient>>

  try {
    supabase = await createClient()
  } catch {
    return {
      success: false,
      error: { code: 'NO_SESSION', message: 'Failed to initialise Supabase client.' },
    }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    // Supabase returns an error when the token is expired and cannot be refreshed
    return {
      success: false,
      error: {
        code: 'EXPIRED_SESSION',
        message: authError.message ?? 'Session has expired. Please sign in again.',
      },
    }
  }

  if (!user) {
    return {
      success: false,
      error: { code: 'NO_SESSION', message: 'No active session.' },
    }
  }

  const profile = await fetchProfile(supabase, user.id)

  if (!profile) {
    return {
      success: false,
      error: {
        code: 'MISSING_PROFILE',
        message: 'User account exists but profile record is missing.',
      },
    }
  }

  return {
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: profile.role as UserRole,
      profile,
    },
  }
}

/**
 * Variant that throws a redirect-safe error string instead of returning
 * an AuthResult. Useful in `page.tsx` Server Components where you want to
 * redirect on failure without dealing with the discriminated union.
 *
 * Callers must handle the thrown error or use `requireRole` instead.
 */
export async function getCurrentUserOrThrow(): Promise<AuthenticatedUser> {
  const result = await getCurrentUser()
  if (!result.success) {
    throw new Error(result.error.code)
  }
  return result.data
}
