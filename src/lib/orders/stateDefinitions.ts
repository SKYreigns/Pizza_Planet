// =============================================================================
// Pizza Planet — Canonical Order Presentation Mapping (Gate 3: SYS-07.5)
// Authoritative single source of truth for UI display labels, badge colors, and icons.
// Source of truth: PRD.md §Order Lifecycle, DatabaseDesign.md §2.1
// =============================================================================

import type { OrderStatus, OrderStateDefinition } from '@/types/order-status'
import { ALL_ORDER_STATES, isTerminalState, type OrderStateCategory } from './states'

export { ALL_ORDER_STATES, isTerminalState }
export type { OrderStateCategory }

export const ORDER_STATE_DEFINITIONS: Record<OrderStatus, OrderStateDefinition> = {
  pending_payment: {
    state: 'pending_payment',
    label: 'Pending Payment',
    category: 'initial',
    color: 'amber',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-500/20 dark:border-amber-500/30',
    description: 'Order placed and awaiting online payment confirmation or COD verification.',
    isTerminal: false,
  },
  confirmed: {
    state: 'confirmed',
    label: 'Confirmed',
    category: 'initial',
    color: 'blue',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-500/20 dark:border-blue-500/30',
    description: 'Payment verified and order accepted into the fulfillment pipeline.',
    isTerminal: false,
  },
  preparing: {
    state: 'preparing',
    label: 'Preparing in Kitchen',
    category: 'in_progress',
    color: 'orange',
    badgeBg: 'bg-orange-500/10 dark:bg-orange-500/20',
    badgeText: 'text-orange-700 dark:text-orange-300',
    badgeBorder: 'border-orange-500/20 dark:border-orange-500/30',
    description: 'Kitchen staff are actively preparing and baking your order.',
    isTerminal: false,
  },
  ready: {
    state: 'ready',
    label: 'Ready for Pickup / Delivery',
    category: 'in_progress',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-500/20 dark:border-emerald-500/30',
    description: 'Order is boxed and ready at counter or for rider pickup.',
    isTerminal: false,
  },
  out_for_delivery: {
    state: 'out_for_delivery',
    label: 'Out for Delivery',
    category: 'fulfillment',
    color: 'purple',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-500/20 dark:border-purple-500/30',
    description: 'Delivery rider is en route to customer destination.',
    isTerminal: false,
  },
  delivered: {
    state: 'delivered',
    label: 'Delivered',
    category: 'terminal',
    color: 'green',
    badgeBg: 'bg-green-500/10 dark:bg-green-500/20',
    badgeText: 'text-green-700 dark:text-green-300',
    badgeBorder: 'border-green-500/20 dark:border-green-500/30',
    description: 'Order successfully delivered or picked up by customer.',
    isTerminal: true,
  },
  cancelled: {
    state: 'cancelled',
    label: 'Cancelled',
    category: 'terminal',
    color: 'red',
    badgeBg: 'bg-red-500/10 dark:bg-red-500/20',
    badgeText: 'text-red-700 dark:text-red-300',
    badgeBorder: 'border-red-500/20 dark:border-red-500/30',
    description: 'Order cancelled prior to completion.',
    isTerminal: true,
  },
  rejected: {
    state: 'rejected',
    label: 'Rejected',
    category: 'terminal',
    color: 'destructive',
    badgeBg: 'bg-destructive/10 dark:bg-destructive/20',
    badgeText: 'text-destructive dark:text-destructive-foreground',
    badgeBorder: 'border-destructive/20 dark:border-destructive/30',
    description: 'Order rejected due to payment failure, stockout, or kitchen closure.',
    isTerminal: true,
  },
}

export function getOrderStateDefinition(status: OrderStatus): OrderStateDefinition {
  return ORDER_STATE_DEFINITIONS[status] || ORDER_STATE_DEFINITIONS.pending_payment
}
