// =============================================================================
// Pizza Planet — Canonical Order State Definitions (Gate 3: SYS-07)
// Authoritative single source of truth for display labels, UI colors, and descriptions.
// Source of truth: PRD.md §Order Lifecycle, DatabaseDesign.md §2.1
// =============================================================================

import type { OrderStatus, OrderStateDefinition } from '@/types/order-status'

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
    description: 'Order cooked, boxed, and ready at the counter or for driver dispatch.',
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
    description: 'Delivery rider has collected the order and is en route to customer.',
    isTerminal: false,
  },
  delivered: {
    state: 'delivered',
    label: 'Delivered',
    category: 'terminal',
    color: 'green',
    badgeBg: 'bg-green-600/10 dark:bg-green-600/20',
    badgeText: 'text-green-800 dark:text-green-300',
    badgeBorder: 'border-green-600/20 dark:border-green-600/30',
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

export function getOrderStateDefinition(status: OrderStatus): OrderStateDefinition {
  return ORDER_STATE_DEFINITIONS[status] || ORDER_STATE_DEFINITIONS.pending_payment
}

export function isTerminalState(status: OrderStatus): boolean {
  return ORDER_STATE_DEFINITIONS[status]?.isTerminal ?? false
}
