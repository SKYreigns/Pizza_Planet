// =============================================================================
// Pizza Planet — Canonical Order Transition & Role Permission Matrix (Gate 3: SYS-07)
// Authoritative executable graph defining allowed transitions and RBAC rules.
// Source of truth: PRD.md §Order Lifecycle, DatabaseDesign.md §2.1
// =============================================================================

import type { OrderStatus, ActorRole, TransitionRule } from '@/types/order-status'
import { ALL_ORDER_STATES, TERMINAL_STATES, isTerminalState } from './states'

export { TERMINAL_STATES }

export const TRANSITION_MATRIX: Record<OrderStatus, TransitionRule> = {
  pending_payment: {
    from: 'pending_payment',
    allowedNextStates: ['confirmed', 'cancelled', 'rejected'],
    forbiddenStates: ['preparing', 'ready', 'out_for_delivery', 'delivered'],
    terminalStates: ['cancelled', 'rejected'],
    rollbackStates: [],
    cancelledStates: ['cancelled'],
    rejectedStates: ['rejected'],
    expiredStates: ['rejected'],
  },
  confirmed: {
    from: 'confirmed',
    allowedNextStates: ['preparing', 'cancelled', 'rejected'],
    forbiddenStates: ['pending_payment', 'ready', 'out_for_delivery', 'delivered'],
    terminalStates: ['cancelled', 'rejected'],
    rollbackStates: ['pending_payment'],
    cancelledStates: ['cancelled'],
    rejectedStates: ['rejected'],
    expiredStates: ['rejected'],
  },
  preparing: {
    from: 'preparing',
    allowedNextStates: ['ready', 'cancelled'],
    forbiddenStates: ['pending_payment', 'out_for_delivery', 'delivered', 'rejected'],
    terminalStates: ['cancelled'],
    rollbackStates: ['confirmed'],
    cancelledStates: ['cancelled'],
    rejectedStates: [],
    expiredStates: [],
  },
  ready: {
    from: 'ready',
    allowedNextStates: ['out_for_delivery', 'delivered', 'cancelled'],
    forbiddenStates: ['pending_payment', 'rejected'],
    terminalStates: ['delivered', 'cancelled'],
    rollbackStates: ['preparing'],
    cancelledStates: ['cancelled'],
    rejectedStates: [],
    expiredStates: [],
  },
  out_for_delivery: {
    from: 'out_for_delivery',
    allowedNextStates: ['delivered', 'cancelled'],
    forbiddenStates: ['pending_payment', 'confirmed', 'rejected'],
    terminalStates: ['delivered', 'cancelled'],
    rollbackStates: ['ready'],
    cancelledStates: ['cancelled'],
    rejectedStates: [],
    expiredStates: [],
  },
  delivered: {
    from: 'delivered',
    allowedNextStates: [],
    forbiddenStates: ALL_ORDER_STATES.filter(s => s !== 'delivered'),
    terminalStates: ['delivered'],
    rollbackStates: [],
    cancelledStates: [],
    rejectedStates: [],
    expiredStates: [],
  },
  cancelled: {
    from: 'cancelled',
    allowedNextStates: [],
    forbiddenStates: ALL_ORDER_STATES.filter(s => s !== 'cancelled'),
    terminalStates: ['cancelled'],
    rollbackStates: [],
    cancelledStates: ['cancelled'],
    rejectedStates: [],
    expiredStates: [],
  },
  rejected: {
    from: 'rejected',
    allowedNextStates: [],
    forbiddenStates: ALL_ORDER_STATES.filter(s => s !== 'rejected'),
    terminalStates: ['rejected'],
    rollbackStates: [],
    cancelledStates: [],
    rejectedStates: ['rejected'],
    expiredStates: [],
  },
}

/**
 * Role permission matrix defining which actor roles may execute each status jump.
 * Key format: `${from}->${to}`
 */
export const ROLE_PERMISSION_MATRIX: Record<string, readonly ActorRole[]> = {
  'pending_payment->confirmed': ['system', 'owner', 'customer'],
  'pending_payment->cancelled': ['customer', 'owner', 'system'],
  'pending_payment->rejected': ['owner', 'system'],

  'confirmed->preparing': ['kitchen', 'owner', 'system'],
  'confirmed->cancelled': ['customer', 'owner', 'system'],
  'confirmed->rejected': ['kitchen', 'owner', 'system'],

  'preparing->ready': ['kitchen', 'owner', 'system'],
  'preparing->cancelled': ['owner', 'system'], // Customer cannot cancel during food preparation!
  'preparing->confirmed': ['owner', 'system'], // Rollback

  'ready->out_for_delivery': ['delivery', 'owner', 'system'],
  'ready->delivered': ['owner', 'system', 'delivery', 'kitchen', 'customer'], // Customer counter pickup allowed
  'ready->cancelled': ['owner', 'system'],
  'ready->preparing': ['owner', 'system'], // Rollback

  'out_for_delivery->delivered': ['delivery', 'owner', 'system'],
  'out_for_delivery->cancelled': ['owner', 'system', 'delivery'],
  'out_for_delivery->ready': ['owner', 'system'], // Rollback
}

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true // No-op transition allowed by matrix validator
  if (isTerminalState(from)) return false
  const rule = TRANSITION_MATRIX[from]
  if (!rule) return false
  return rule.allowedNextStates.includes(to) || rule.rollbackStates.includes(to)
}

export function isAllowedActorForTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: ActorRole,
  isOwnOrder: boolean
): boolean {
  if (from === to) return true
  const key = `${from}->${to}`
  const allowedRoles = ROLE_PERMISSION_MATRIX[key]
  if (!allowedRoles) return false

  if (allowedRoles.includes(role)) {
    // If actor is customer, they can ONLY transition if it is their own order
    if (role === 'customer' && !isOwnOrder) {
      return false
    }
    return true
  }

  return false
}

export function validateTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: ActorRole,
  isOwnOrder: boolean
): { valid: boolean; error?: string; code?: string } {
  if (from === to) {
    return { valid: true }
  }

  if (isTerminalState(from)) {
    return {
      valid: false,
      error: `Order is currently in a terminal state ('${from}') and cannot be transitioned to '${to}'.`,
      code: 'TERMINAL_STATE_LOCKED',
    }
  }

  if (!isValidTransition(from, to)) {
    return {
      valid: false,
      error: `Illegal state transition: cannot transition order from '${from}' to '${to}'.`,
      code: 'ILLEGAL_TRANSITION',
    }
  }

  if (!isAllowedActorForTransition(from, to, role, isOwnOrder)) {
    return {
      valid: false,
      error: `Role permission denied: actor with role '${role}' is not authorized to transition order from '${from}' to '${to}'.`,
      code: 'UNAUTHORIZED_ROLE_TRANSITION',
    }
  }

  return { valid: true }
}
