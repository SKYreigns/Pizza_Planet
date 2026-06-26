// =============================================================================
// Role Definitions — Pizza Planet
// Source of truth: PRD.md §User Roles, API-Specification.md §2
// =============================================================================

import type { UserRole } from '@/types/auth'

// ---------------------------------------------------------------------------
// Route group ownership
// ---------------------------------------------------------------------------

/**
 * Route prefixes that are publicly accessible (no auth required).
 * Matches the storefront route group and auth pages.
 */
export const PUBLIC_ROUTES: readonly string[] = [
  '/',
  '/menu',
  '/cart',
  '/checkout',
  '/track',
  '/auth',
]

/**
 * Route prefixes that require at minimum a customer session.
 */
export const CUSTOMER_ROUTES: readonly string[] = [
  '/profile',
  '/orders',
]

/**
 * Route prefixes that require an owner session.
 */
export const OWNER_ROUTES: readonly string[] = [
  '/admin',
]

/**
 * Route prefixes accessible to kitchen staff.
 */
export const KITCHEN_ROUTES: readonly string[] = [
  '/kitchen',
]

/**
 * Route prefixes accessible to delivery staff.
 */
export const DELIVERY_ROUTES: readonly string[] = [
  '/delivery',
]

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

/**
 * Ordered from least to most privileged.
 * A higher-index role inherits all lower-index route access.
 */
export const ROLE_HIERARCHY: readonly UserRole[] = [
  'guest',
  'customer',
  'delivery',
  'kitchen',
  'owner',
]

/**
 * Returns true if `actual` meets or exceeds `required` in the hierarchy.
 */
export function meetsRoleRequirement(
  actual: UserRole,
  required: UserRole,
): boolean {
  const actualIndex = ROLE_HIERARCHY.indexOf(actual)
  const requiredIndex = ROLE_HIERARCHY.indexOf(required)
  if (actualIndex === -1 || requiredIndex === -1) return false
  return actualIndex >= requiredIndex
}

// ---------------------------------------------------------------------------
// Route → required role mapping
// ---------------------------------------------------------------------------

export interface RouteGuard {
  /** URL path prefix this guard applies to */
  prefix: string
  /** Minimum role required to access this prefix */
  requiredRole: UserRole
  /** Where to redirect when access is denied */
  redirectTo: string
}

export const ROUTE_GUARDS: readonly RouteGuard[] = [
  {
    prefix: '/admin',
    requiredRole: 'owner',
    redirectTo: '/auth/login',
  },
  {
    prefix: '/kitchen',
    requiredRole: 'kitchen',
    redirectTo: '/auth/kitchen',
  },
  {
    prefix: '/delivery',
    requiredRole: 'delivery',
    redirectTo: '/auth/login',
  },
  {
    prefix: '/profile',
    requiredRole: 'customer',
    redirectTo: '/auth/login',
  },
  {
    prefix: '/orders',
    requiredRole: 'customer',
    redirectTo: '/auth/login',
  },
]

/**
 * Finds the first guard whose prefix matches the given pathname.
 * Returns `null` for public/unguarded routes.
 */
export function getRouteGuard(pathname: string): RouteGuard | null {
  return (
    ROUTE_GUARDS.find((guard) => pathname.startsWith(guard.prefix)) ?? null
  )
}

// ---------------------------------------------------------------------------
// Role display metadata (used in admin UI)
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  guest: 'Guest',
  customer: 'Customer',
  kitchen: 'Kitchen Staff',
  delivery: 'Delivery Rider',
  owner: 'Owner / Admin',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  guest: 'Unauthenticated — browse and checkout only',
  customer: 'Registered — order history, saved addresses, favorites',
  kitchen: 'Kitchen staff — view queue, update preparation status',
  delivery: 'Delivery rider — view assigned orders, update delivery status',
  owner: 'Full access — all features, analytics, settings',
}
