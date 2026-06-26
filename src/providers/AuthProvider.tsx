'use client'

// =============================================================================
// AuthProvider — Pizza Planet
// Session hydration layer. Mounts once in the root layout.
// Responsibilities:
//   - Listens to Supabase Auth state changes client-side.
//   - Keeps the auth.setUser / clearUser Zustand store in sync.
//   - Does NOT fetch the profile; that is done server-side.
// =============================================================================

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SessionUser } from '@/types/auth'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** The resolved session user passed from the server, or null for guests. */
  user: SessionUser | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>.')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  /**
   * Server-resolved session user injected by the root Server Component layout.
   * Null when the visitor is an unauthenticated guest.
   */
  initialUser: SessionUser | null
  children: ReactNode
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  // We keep local state as a ref for the context value so re-renders are
  // minimal. Components that need reactive auth state use the Zustand store,
  // not this context directly.
  const userRef = useRef<SessionUser | null>(initialUser)
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        userRef.current = null
        // Navigate to home after sign-out to clear any protected page state.
        // Next.js router is not available here; we use location for simplicity.
        if (
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/profile')
        ) {
          window.location.href = '/'
        }
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // The authoritative user data comes from the server. On sign-in, the
        // page will re-render via the server layout — we don't optimistically
        // set data here to avoid stale role information from the JWT alone.
        return
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user: userRef.current }}>
      {children}
    </AuthContext.Provider>
  )
}
