// =============================================================================
// Middleware — Pizza Planet
// Runs on every request (except static assets).
// Responsibilities:
//   1. Refresh Supabase session cookie so it never silently expires.
//   2. Enforce route guards based on the user's role.
//   3. Redirect unauthenticated / unauthorised users to the correct page.
// =============================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getRouteGuard, meetsRoleRequirement } from '@/lib/auth/roles'
import { verifyKitchenCookie } from '@/lib/auth/kitchenCookieSigner'
import type { UserRole } from '@/types/auth'

// ---------------------------------------------------------------------------
// Session refresh helper
// Must be done before any auth decision so the cookie is always fresh.
// The returned supabase client and response are used together: any cookies
// written by getUser() are attached to supabaseResponse before we return it.
// ---------------------------------------------------------------------------

function buildSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  return { supabase, getResponse: () => supabaseResponse }
}

async function hasValidKitchenCookie(request: NextRequest): Promise<boolean> {
  try {
    const cookieVal = request.cookies.get('pp_kitchen_session')?.value
    if (!cookieVal) return false
    const verifiedPayload = await verifyKitchenCookie(cookieVal)
    if (!verifiedPayload) return false
    const parsed = JSON.parse(verifiedPayload)
    return Boolean(parsed.staffId && parsed.name)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Role resolution from profiles table
// Runs only on guarded routes to avoid an unnecessary DB query per request.
// ---------------------------------------------------------------------------

async function resolveRole(
  supabase: ReturnType<typeof buildSupabaseMiddlewareClient>['supabase'],
  userId: string,
): Promise<UserRole> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  return (data?.role as UserRole | undefined) ?? 'guest'
}

// ---------------------------------------------------------------------------
// Middleware entry point
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabase, getResponse } = buildSupabaseMiddlewareClient(request)

  // Always refresh the session — this is the Supabase SSR requirement.
  // IMPORTANT: do not move this after the guard checks.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Gate 2: Store Operating Rules Guard — Block navigation to checkout when store is closed
  if (pathname.startsWith('/checkout')) {
    const { data: settings } = await supabase
      .from('store_settings')
      .select('is_open')
      .eq('id', 1)
      .single()

    if (settings && settings.is_open === false) {
      const menuUrl = new URL('/menu', request.url)
      menuUrl.searchParams.set('reason', 'store_closed')
      return NextResponse.redirect(menuUrl)
    }
  }

  // Resolve the applicable route guard (null = public route)
  const guard = getRouteGuard(pathname)

  // Public route — no further checks needed
  if (!guard) {
    return getResponse()
  }

  // Special KDS station bypass: If accessing /kitchen with valid PIN station cookie, allow!
  if (guard.prefix === '/kitchen' && (await hasValidKitchenCookie(request))) {
    return getResponse()
  }

  // Guarded route — user must be signed in
  if (!user) {
    const loginUrl = new URL(guard.redirectTo, request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // User is signed in — resolve their role from the profiles table
  const role = await resolveRole(supabase, user.id)

  // Role check against the guard
  if (!meetsRoleRequirement(role, guard.requiredRole)) {
    // Signed in but wrong role → redirect to the guard's redirect target
    // with a reason parameter for the login page to display
    const redirectUrl = new URL(guard.redirectTo, request.url)
    redirectUrl.searchParams.set('reason', 'insufficient_role')
    return NextResponse.redirect(redirectUrl)
  }

  // All checks passed — forward the (now session-refreshed) response
  return getResponse()
}

// ---------------------------------------------------------------------------
// Matcher — exclude Next.js internals and static assets
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
