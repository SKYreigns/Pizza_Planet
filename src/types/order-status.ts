// =============================================================================
// Pizza Planet — Canonical Order Status & State Machine Types (Gate 3: SYS-07)
// Authoritative single source of truth for all order lifecycle states.
// Source of truth: PRD.md, DatabaseDesign.md §2.1, API-Specification.md §6
// =============================================================================

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected'

export type OrderStateCategory =
  | 'initial'
  | 'in_progress'
  | 'fulfillment'
  | 'terminal'

export interface OrderStateDefinition {
  state: OrderStatus
  label: string
  category: OrderStateCategory
  color: string // Tailwind color class for badges/UI
  badgeBg: string
  badgeText: string
  badgeBorder: string
  description: string
  isTerminal: boolean
}

export type ActorRole = 'customer' | 'owner' | 'kitchen' | 'delivery' | 'system'

export interface TransitionRule {
  from: OrderStatus
  allowedNextStates: OrderStatus[]
  forbiddenStates: OrderStatus[]
  terminalStates: OrderStatus[]
  rollbackStates: OrderStatus[]
  cancelledStates: OrderStatus[]
  rejectedStates: OrderStatus[]
  expiredStates: OrderStatus[]
}

export interface DomainEventPayload {
  eventId: string
  eventType: string
  orderId: string
  oldStatus: OrderStatus
  newStatus: OrderStatus
  actorId: string | null
  actorRole: ActorRole
  reason?: string
  correlationId?: string
  timestamp: string
}

export interface TransitionOrderInput {
  orderId: string
  targetStatus: OrderStatus
  reason?: string
  correlationId?: string
}

export interface TransitionOrderResult {
  orderId: string
  oldStatus: OrderStatus
  newStatus: OrderStatus
  transitionedAt: string
  actorId: string | null
  actorRole: ActorRole
  eventId: string
}
