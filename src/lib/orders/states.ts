// =============================================================================
// Pizza Planet — Canonical Order Domain States (Gate 3: SYS-07.5)
// Pure domain state metadata completely decoupled from UI presentation styling.
// Source of truth: PRD.md §Order Lifecycle, ORDER_AGGREGATE_ARCHITECTURE.md
// =============================================================================

import type { OrderStatus } from '@/types/order-status'

export type OrderStateCategory = 'initial' | 'in_progress' | 'fulfillment' | 'terminal'

export interface PureOrderStateDefinition {
  state: OrderStatus
  category: OrderStateCategory
  isTerminal: boolean
}

export const ALL_ORDER_STATES: readonly OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'rejected',
] as const

export const TERMINAL_STATES: readonly OrderStatus[] = [
  'delivered',
  'cancelled',
  'rejected',
] as const

export const PURE_STATE_DEFINITIONS: Record<OrderStatus, PureOrderStateDefinition> = {
  pending_payment: { state: 'pending_payment', category: 'initial', isTerminal: false },
  confirmed: { state: 'confirmed', category: 'initial', isTerminal: false },
  preparing: { state: 'preparing', category: 'in_progress', isTerminal: false },
  ready: { state: 'ready', category: 'in_progress', isTerminal: false },
  out_for_delivery: { state: 'out_for_delivery', category: 'fulfillment', isTerminal: false },
  delivered: { state: 'delivered', category: 'terminal', isTerminal: true },
  cancelled: { state: 'cancelled', category: 'terminal', isTerminal: true },
  rejected: { state: 'rejected', category: 'terminal', isTerminal: true },
}

export function isTerminalState(status: OrderStatus): boolean {
  return PURE_STATE_DEFINITIONS[status]?.isTerminal ?? false
}
