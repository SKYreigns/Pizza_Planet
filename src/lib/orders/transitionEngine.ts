// =============================================================================
// Pizza Planet — Canonical Order Transition Engine (Gate 3: SYS-07.5)
// Authoritative single validation path for all order lifecycle updates.
// Source of truth: PRD.md §Order Lifecycle, EngineeringStandards.md §6
// =============================================================================

import type { OrderStatus, ActorRole, TransitionOrderResult } from '@/types/order-status'
import { isTerminalState } from './states'
import { isValidTransition, isAllowedActorForTransition, validateTransition } from './transitionMatrix'
import { buildDomainEvent, type OrderDomainEventType } from './domainEvents'

export interface TransitionEngineInput {
  orderId: string
  currentStatus: OrderStatus
  targetStatus: OrderStatus
  orderType: 'delivery' | 'pickup'
  customerId: string | null
  actorId: string | null
  actorRole: ActorRole
  aggregateVersion?: number
  reason?: string
  correlationId?: string
  causationId?: string
}

export interface TransitionEngineResult {
  success: boolean
  noop?: boolean
  error?: string
  code?: string
  result?: TransitionOrderResult
  domainEvent?: ReturnType<typeof buildDomainEvent>
  auditRecord?: {
    order_id: string
    old_status: OrderStatus
    new_status: OrderStatus
    changed_by: string | null
    role: string
    note?: string
  }
}

/**
 * Pure business logic engine evaluating transition legality.
 * Produces validated payloads for database transaction execution.
 */
export function evaluateOrderTransition(input: TransitionEngineInput): TransitionEngineResult {
  const {
    orderId,
    currentStatus,
    targetStatus,
    orderType,
    customerId,
    actorId,
    actorRole,
    aggregateVersion = 1,
    reason,
    correlationId,
    causationId,
  } = input

  // 1. Check no-op
  if (currentStatus === targetStatus) {
    const domainEvent = buildDomainEvent(
      orderId,
      currentStatus,
      targetStatus,
      actorId,
      actorRole,
      aggregateVersion,
      reason,
      correlationId,
      causationId
    )
    return {
      success: true,
      noop: true,
      result: {
        orderId,
        oldStatus: currentStatus,
        newStatus: targetStatus,
        version: aggregateVersion,
        transitionedAt: new Date().toISOString(),
        actorId,
        actorRole,
        eventId: domainEvent.eventId,
        noop: true,
      },
    }
  }

  // 2. Evaluate Matrix & Role constraints
  const isOwnOrder = Boolean(actorId && customerId && actorId === customerId)
  const validation = validateTransition(currentStatus, targetStatus, actorRole, isOwnOrder)

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      code: validation.code,
    }
  }

  // 3. Domain Business Rule Constraints
  if (targetStatus === 'out_for_delivery' && orderType === 'pickup') {
    return {
      success: false,
      error: "Business rule violation: pickup orders cannot transition to 'out_for_delivery'. They transition from 'ready' directly to 'delivered' upon customer pickup.",
      code: 'INVALID_ORDER_TYPE_TRANSITION',
    }
  }

  // 4. Build payloads for version + 1 mutation
  const nextVersion = aggregateVersion + 1
  const domainEvent = buildDomainEvent(
    orderId,
    currentStatus,
    targetStatus,
    actorId,
    actorRole,
    nextVersion,
    reason,
    correlationId,
    causationId
  )

  const auditRecord = {
    order_id: orderId,
    old_status: currentStatus,
    new_status: targetStatus,
    changed_by: actorId,
    role: actorRole,
    note: reason,
  }

  return {
    success: true,
    noop: false,
    result: {
      orderId,
      oldStatus: currentStatus,
      newStatus: targetStatus,
      version: nextVersion,
      transitionedAt: new Date().toISOString(),
      actorId,
      actorRole,
      eventId: domainEvent.eventId,
      noop: false,
    },
    domainEvent,
    auditRecord,
  }
}
