// =============================================================================
// Permissions — Pizza Planet
// Centralised permission checking. All authorization decisions flow
// through this module. No ad-hoc role checks in components or actions.
// Source of truth: PRD.md §Role-Based Access Matrix, API-Specification.md §2
// =============================================================================

import type { UserRole } from '@/types/auth'
import { meetsRoleRequirement } from '@/lib/auth/roles'

// ---------------------------------------------------------------------------
// Permission definitions
// Mirrors PRD.md Role-Based Access Matrix exactly.
// ---------------------------------------------------------------------------

export type Permission =
  // Storefront
  | 'menu:read'
  | 'pizza:customize'
  | 'cart:manage'
  | 'order:create'
  // Customer account
  | 'order:read_own'
  | 'order:track'
  | 'address:manage'
  | 'profile:manage'
  // Kitchen operations
  | 'kitchen:read_queue'
  | 'kitchen:update_status'
  // Delivery operations
  | 'delivery:read_queue'
  | 'delivery:update_status'
  | 'delivery:read_customer_contact'
  // Admin / Owner
  | 'admin:read_all_orders'
  | 'admin:manage_orders'
  | 'admin:manage_menu'
  | 'admin:manage_categories'
  | 'admin:manage_coupons'
  | 'admin:manage_users'
  | 'admin:manage_settings'
  | 'admin:read_analytics'
  | 'admin:manage_delivery_staff'

/**
 * The complete permission set for each role.
 * Owner implicitly holds every permission.
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  guest: [
    'menu:read',
    'pizza:customize',
    'cart:manage',
    'order:create',
    'order:track',
  ],

  customer: [
    'menu:read',
    'pizza:customize',
    'cart:manage',
    'order:create',
    'order:track',
    'order:read_own',
    'address:manage',
    'profile:manage',
  ],

  kitchen: [
    'kitchen:read_queue',
    'kitchen:update_status',
  ],

  delivery: [
    'delivery:read_queue',
    'delivery:update_status',
    'delivery:read_customer_contact',
  ],

  owner: [
    'menu:read',
    'pizza:customize',
    'cart:manage',
    'order:create',
    'order:track',
    'order:read_own',
    'address:manage',
    'profile:manage',
    'kitchen:read_queue',
    'kitchen:update_status',
    'delivery:read_queue',
    'delivery:update_status',
    'delivery:read_customer_contact',
    'admin:read_all_orders',
    'admin:manage_orders',
    'admin:manage_menu',
    'admin:manage_categories',
    'admin:manage_coupons',
    'admin:manage_users',
    'admin:manage_settings',
    'admin:read_analytics',
    'admin:manage_delivery_staff',
  ],
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the full set of permissions granted to a role.
 */
export function getPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.guest
}

/**
 * Returns true if `role` holds the given `permission`.
 *
 * @example
 * hasPermission('owner', 'admin:manage_menu') // true
 * hasPermission('kitchen', 'admin:manage_menu') // false
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as Permission[]).includes(permission)
}

/**
 * Returns true if `role` holds ALL listed permissions.
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Returns true if `role` holds ANY of the listed permissions.
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * Returns true if `role` is at least `minimumRole` in the hierarchy.
 * Convenience wrapper over `meetsRoleRequirement`.
 */
export function isAtLeast(role: UserRole, minimumRole: UserRole): boolean {
  return meetsRoleRequirement(role, minimumRole)
}

/**
 * Returns true if the role is strictly one of the allowed roles.
 */
export function isOneOf(role: UserRole, allowed: readonly UserRole[]): boolean {
  return (allowed as UserRole[]).includes(role)
}
