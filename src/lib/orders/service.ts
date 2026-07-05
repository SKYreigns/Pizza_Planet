// =============================================================================
// Pizza Planet — Canonical Order Application Service (Gate 3: SYS-07.5)
// Authoritative orchestrator for Aggregate Root operations, OCC, and Outbox.
// Source of truth: ORDER_AGGREGATE_ARCHITECTURE.md, PRD.md
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TransitionOrderInput, TransitionOrderResult, ActorRole, OrderAggregate } from '@/types/order-status'
import { orderRepository } from './repository'
import { evaluateOrderTransition } from './transitionEngine'
import { emitDomainEvent } from './domainEvents'

export interface OrderServiceError {
  error: string
  code: string
}

export type OrderServiceTransitionResponse = TransitionOrderResult | OrderServiceError

export function isOrderServiceError(res: any): res is OrderServiceError {
  return res && typeof res === 'object' && 'error' in res && 'code' in res && !('oldStatus' in res)
}

function computeRequestHash(payload: any): string {
  const str = JSON.stringify(payload)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return `req_${Math.abs(hash).toString(36)}_${str.length}_${str.substring(0, 15)}`
}

export class OrderApplicationService {
  /**
   * Loads an Order Aggregate by its ID.
   */
  public async getOrderById(supabase: SupabaseClient<any, 'public', any>, orderId: string): Promise<OrderAggregate | null> {
    return orderRepository.findOrderById(supabase, orderId)
  }

  /**
   * Loads an Order Aggregate by its tracking token.
   */
  public async getOrderByTrackingToken(supabase: SupabaseClient<any, 'public', any>, trackingToken: string): Promise<OrderAggregate | null> {
    return orderRepository.findByTrackingToken(supabase, trackingToken)
  }

  /**
   * Authoritative orchestration pipeline for order status transitions:
   * 1. Loads current aggregate version from repository
   * 2. Evaluates state machine transition rules via pure domain engine
   * 3. Executes atomic database transaction (OCC, idempotency, audit log, outbox event)
   * 4. Dispatches post-commit non-blocking WebSocket events
   */
  public async transitionOrder(
    supabase: SupabaseClient<any, 'public', any>,
    input: TransitionOrderInput,
    actorId: string | null,
    actorRole: ActorRole
  ): Promise<OrderServiceTransitionResponse> {
    // 1. Load aggregate
    const aggregate = await orderRepository.findOrderById(supabase, input.orderId)
    if (!aggregate) {
      return { error: `Order (${input.orderId}) not found.`, code: 'ORDER_NOT_FOUND' }
    }

    // 2. Compute request fingerprint for idempotency deduplication
    const requestHash = input.idempotencyKey ? computeRequestHash({ input, actorId, actorRole }) : undefined

    // 3. Evaluate transition legality via pure domain engine
    const evalResult = evaluateOrderTransition({
      orderId: input.orderId,
      currentStatus: aggregate.status,
      targetStatus: input.targetStatus,
      orderType: aggregate.orderType,
      customerId: aggregate.customerId,
      actorId,
      actorRole,
      aggregateVersion: aggregate.version,
      reason: input.reason,
      correlationId: input.correlationId,
      causationId: input.causationId,
    })

    if (!evalResult.success || !evalResult.result) {
      return {
        error: evalResult.error || 'Transition evaluation failed.',
        code: evalResult.code || 'TRANSITION_INVALID',
      }
    }

    // 4. Persist atomic transition via repository (executes RPC transaction block)
    const expectedVersion = input.expectedVersion ?? aggregate.version
    const saveResult = await orderRepository.saveTransition(supabase, {
      orderId: input.orderId,
      expectedVersion,
      targetStatus: input.targetStatus,
      actorId,
      actorRole,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      outboxEvent: evalResult.domainEvent,
    })

    if (!saveResult.success) {
      return {
        error: saveResult.error || 'Database transaction failed.',
        code: saveResult.code || 'TX_FAILED',
      }
    }

    // 5. Post-Commit non-blocking WebSocket broadcast for instant UI synchronization
    if (evalResult.domainEvent && !saveResult.noop) {
      emitDomainEvent(supabase, evalResult.domainEvent).catch(() => {})
    }

    return {
      orderId: input.orderId,
      oldStatus: saveResult.oldStatus || aggregate.status,
      newStatus: saveResult.newStatus || input.targetStatus,
      version: saveResult.version ?? evalResult.result.version,
      transitionedAt: evalResult.result.transitionedAt,
      actorId,
      actorRole,
      eventId: evalResult.result.eventId,
      noop: saveResult.noop || evalResult.noop,
    }
  }
}

export const orderApplicationService = new OrderApplicationService()
