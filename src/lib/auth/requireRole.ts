// =============================================================================
// requireRole — Pizza Planet
// Server-side role enforcement helper for Server Actions and Server Components.
// Import this in any Server Action that needs role-gating.
// =============================================================================

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { getKitchenSession } from '@/lib/auth/getKitchenSession'
import { isOneOf, hasPermission } from '@/lib/auth/permissions'
import { meetsRoleRequirement } from '@/lib/auth/roles'
import type {
  AuthResult,
  AuthenticatedUser,
  AuthErrorCode,
  UserRole,
} from '@/types/auth'
import type { Permission } from '@/lib/auth/permissions'

// ---------------------------------------------------------------------------
// Core enforcement — returns AuthResult (non-throwing)
// Use this in Server Actions that return ActionResponse<T>
// ---------------------------------------------------------------------------

/**
 * Verifies the current session exists and the user's role is one of
 * the allowed roles. Returns an AuthResult — does NOT redirect or throw.
 *
 * Use in Server Actions so callers receive a typed error envelope.
 *
 * @example
 * const auth = await enforceRole(['owner'])
 * if (!auth.success) return { success: false, error: auth.error.code }
 */
export async function enforceRole(
  allowedRoles: readonly UserRole[],
): Promise<AuthResult<AuthenticatedUser>> {
  const result = await getCurrentUser()

  if (!result.success) return result

  if (!isOneOf(result.data.role, allowedRoles)) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      },
    }
  }

  return result
}

/**
 * Verifies the current session exists and the user's role meets the
 * minimum hierarchy level. Returns an AuthResult — does NOT redirect or throw.
 */
export async function enforceMinimumRole(
  minimumRole: UserRole,
): Promise<AuthResult<AuthenticatedUser>> {
  const result = await getCurrentUser()

  if (!result.success) return result

  if (!meetsRoleRequirement(result.data.role, minimumRole)) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `This action requires at least the '${minimumRole}' role.`,
      },
    }
  }

  return result
}

/**
 * Verifies the current session exists and the user holds a specific permission.
 * Returns an AuthResult — does NOT redirect or throw.
 */
export async function enforcePermission(
  permission: Permission,
): Promise<AuthResult<AuthenticatedUser>> {
  const result = await getCurrentUser()

  if (!result.success) return result

  if (!hasPermission(result.data.role, permission)) {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `Missing required permission: '${permission}'.`,
      },
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Page-level enforcement — throws redirect (use in Server Component pages)
// ---------------------------------------------------------------------------

/**
 * Enforces that the current user is authenticated and holds one of the
 * allowed roles. On failure, redirects to the given URL.
 *
 * Use in Server Component `page.tsx` files where a redirect is the
 * correct failure response (not a returned error envelope).
 *
 * @example
 * // In app/(admin)/admin/dashboard/page.tsx
 * const user = await requireRole(['owner'], '/auth/login')
 */
export async function requireRole(
  allowedRoles: readonly UserRole[],
  redirectTo: string = '/auth/login',
): Promise<AuthenticatedUser> {
  const result = await enforceRole(allowedRoles)

  if (!result.success) {
    const code: AuthErrorCode = result.error.code

    if (code === 'NO_SESSION' || code === 'EXPIRED_SESSION') {
      redirect(redirectTo)
    }

    if (code === 'MISSING_PROFILE') {
      redirect('/auth/error?code=MISSING_PROFILE')
    }

    if (code === 'FORBIDDEN' || code === 'INVALID_ROLE') {
      redirect('/auth/unauthorized')
    }

    redirect(redirectTo)
  }

  return result.data
}

/**
 * Enforces that the current user is authenticated (any role including customer).
 * Redirects to login on failure. Returns the authenticated user.
 *
 * @example
 * // In app/(storefront)/profile/page.tsx
 * const user = await requireAuth()
 */
export async function requireAuth(
  redirectTo: string = '/auth/login',
): Promise<AuthenticatedUser> {
  return requireRole(['customer', 'owner', 'kitchen', 'delivery'], redirectTo)
}

/**
 * Enforces the owner role. Convenience wrapper over `requireRole`.
 */
export async function requireOwner(): Promise<AuthenticatedUser> {
  return requireRole(['owner'], '/auth/login')
}

/**
 * Enforces kitchen or owner access. Convenience wrapper.
 */
export async function requireKitchen(): Promise<AuthenticatedUser> {
  const kitchenSession = await getKitchenSession()
  if (kitchenSession.success) {
    return kitchenSession.data
  }
  return requireRole(['kitchen', 'owner'], '/auth/kitchen')
}

/**
 * Enforces delivery or owner access. Convenience wrapper.
 */
export async function requireDelivery(): Promise<AuthenticatedUser> {
  return requireRole(['delivery', 'owner'], '/auth/login')
}
