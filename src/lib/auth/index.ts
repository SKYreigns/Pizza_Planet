// =============================================================================
// Auth Helpers — Pizza Planet
// Barrel of convenience utilities consumed by providers, actions, and pages.
// =============================================================================

export { getCurrentUser, getCurrentUserOrThrow } from '@/lib/auth/getCurrentUser'
export {
  enforceRole,
  enforceMinimumRole,
  enforcePermission,
  requireRole,
  requireAuth,
  requireOwner,
  requireKitchen,
  requireDelivery,
} from '@/lib/auth/requireRole'
export {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isAtLeast,
  isOneOf,
  getPermissionsForRole,
} from '@/lib/auth/permissions'
export {
  getRouteGuard,
  meetsRoleRequirement,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  PUBLIC_ROUTES,
  CUSTOMER_ROUTES,
  OWNER_ROUTES,
  KITCHEN_ROUTES,
  DELIVERY_ROUTES,
  ROUTE_GUARDS,
} from '@/lib/auth/roles'
export type { Permission } from '@/lib/auth/permissions'
export type {
  UserRole,
  UserProfile,
  AuthenticatedUser,
  SessionUser,
  AuthError,
  AuthErrorCode,
  AuthResult,
} from '@/types/auth'
