// =============================================================================
// Pizza Planet — Canonical Order Status & Aggregate Types (Gate 3: SYS-07.5)
// Authoritative single source of truth for all order lifecycle states & aggregate model.
// Source of truth: PRD.md, DatabaseDesign.md §2.1, ORDER_AGGREGATE_ARCHITECTURE.md
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
  eventVersion: string
  aggregateVersion: number
  schemaVersion: number
  orderId: string
  oldStatus: OrderStatus
  newStatus: OrderStatus
  actorId: string | null
  actorRole: ActorRole
  reason?: string
  correlationId?: string
  causationId?: string
  occurredAt: string
  timestamp: string
}

export interface TransitionOrderInput {
  orderId: string
  targetStatus: OrderStatus
  expectedVersion?: number
  reason?: string
  correlationId?: string
  causationId?: string
  idempotencyKey?: string
}

export interface TransitionOrderResult {
  orderId: string
  oldStatus: OrderStatus
  newStatus: OrderStatus
  version: number
  transitionedAt: string
  actorId: string | null
  actorRole: ActorRole
  eventId: string
  noop?: boolean
}

export interface OrderAggregate {
  id: string
  shortId: string
  orderType: 'delivery' | 'pickup'
  customerId: string | null
  customerName: string
  customerPhone: string
  status: OrderStatus
  version: number
  paymentMethod: string
  paymentStatus: string
  subtotal: number
  tax: number
  deliveryFee: number
  totalAmount: number
  trackingToken: string
  createdAt: string
}
