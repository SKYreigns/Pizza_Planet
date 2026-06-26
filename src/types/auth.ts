// =============================================================================
// Auth Types — Pizza Planet
// Shared type definitions for authentication and authorization.
// Source of truth: DatabaseDesign.md §2.1 Enums, API-Specification.md §2
// =============================================================================

export type UserRole = 'guest' | 'customer' | 'kitchen' | 'delivery' | 'owner'

export interface UserProfile {
  id: string
  role: UserRole
  full_name: string
  phone: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Authenticated session bundling the Supabase user with the resolved profile.
 * Server Components and Server Actions always receive this shape.
 */
export interface AuthenticatedUser {
  id: string
  email: string | undefined
  role: UserRole
  profile: UserProfile
}

/**
 * Lightweight representation used in Client Components / Providers
 * to avoid sending the full profile to the browser unnecessarily.
 */
export interface SessionUser {
  id: string
  email: string | undefined
  role: UserRole
  full_name: string
  avatar_url: string | null
}

/**
 * Canonical error codes returned by auth helpers.
 * Maps 1-to-1 with API-Specification.md §18 standard codes.
 */
export type AuthErrorCode =
  | 'NO_SESSION'
  | 'EXPIRED_SESSION'
  | 'MISSING_PROFILE'
  | 'INVALID_ROLE'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'

export interface AuthError {
  code: AuthErrorCode
  message: string
}

/** Discriminated union returned by every auth helper */
export type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; error: AuthError }
