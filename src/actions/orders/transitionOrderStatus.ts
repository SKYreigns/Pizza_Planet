'use server'

// =============================================================================
// Pizza Planet — Canonical Order Transition Server Action (Gate 3: SYS-07)
// Authoritative single endpoint for all order state transitions.
// Source of truth: API-Specification.md §6, MASTER_IMPLEMENTATION_CONFORMANCE_BLUEPRINT.md
// =============================================================================

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { getKitchenSession } from '@/lib/auth/getKitchenSession'
import { evaluateOrderTransition } from '@/lib/orders/transitionEngine'
import { emitDomainEvent } from '@/lib/orders/domainEvents'
import { ALL_ORDER_STATES } from '@/lib/orders/stateDefinitions'
import type { ActionResponse } from '@/types/order'
import type { TransitionOrderInput, TransitionOrderResult, OrderStatus, ActorRole } from '@/types/order-status'

const TransitionInputSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
  targetStatus: z.enum(ALL_ORDER_STATES as [string, ...string[]]) as unknown as z.ZodType<OrderStatus>,
  reason: z.string().max(500).optional(),
  correlationId: z.string().max(100).optional(),
})

/**
 * Authoritative Server Action executing order status transitions.
 * Enforces Role Permissions, Legal State Graph, Business Rules, Audit Logging, and Event Emission.
 */
export async function transitionOrderStatus(
  rawInput: TransitionOrderInput
): Promise<ActionResponse<TransitionOrderResult>> {
  // 1. Input validation
  const parseResult = TransitionInputSchema.safeParse(rawInput)
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map(i => i.message).join('; '),
      code: 'INVALID_INPUT',
    }
  }

  const { orderId, targetStatus, reason, correlationId } = parseResult.data

  // 2. Resolve Actor Role & ID
  let actorId: string | null = null
  let actorRole: ActorRole = 'system'

  const userRes = await getCurrentUser()
  if (userRes.success) {
    actorId = userRes.data.id
    actorRole = userRes.data.role as ActorRole
  } else {
    // Check if kitchen KDS session is active
    const kitchenRes = await getKitchenSession()
    if (kitchenRes.success) {
      actorId = kitchenRes.data.id
      actorRole = 'kitchen'
    } else {
      // Anonymous caller without session is unauthorized for transitions
      return {
        success: false,
        error: 'Authentication required to transition order status.',
        code: 'UNAUTHORIZED',
      }
    }
  }

  // 3. Fetch current order state from DB
  const supabase = await createClient()
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, order_type, customer_id')
    .eq('id', orderId)
    .single()

  if (fetchErr || !order) {
    return {
      success: false,
      error: fetchErr?.message || 'Order not found.',
      code: 'ORDER_NOT_FOUND',
    }
  }

  const currentStatus = order.status as OrderStatus
  const orderType = order.order_type as 'delivery' | 'pickup'
  const customerId = order.customer_id as string | null

  // 4. Run through Transition Engine
  const evaluation = evaluateOrderTransition({
    orderId,
    currentStatus,
    targetStatus,
    orderType,
    customerId,
    actorId,
    actorRole,
    reason,
    correlationId,
  })

  if (!evaluation.success || !evaluation.result) {
    return {
      success: false,
      error: evaluation.error || 'Transition evaluation failed.',
      code: evaluation.code || 'TRANSITION_REJECTED',
    }
  }

  // If no-op (currentStatus === targetStatus), return clean result immediately without DB write
  if (evaluation.noop) {
    return {
      success: true,
      data: evaluation.result,
    }
  }

  // 5. Execute DB Transaction
  // Note: Updating orders.status automatically triggers trg_orders_log_status_change
  // which inserts into public.order_status_log!
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status: targetStatus,
    })
    .eq('id', orderId)

  if (updateErr) {
    // Handle SQL trigger exceptions gracefully (e.g. if DB trigger rejected illegal jump)
    return {
      success: false,
      error: updateErr.message,
      code: updateErr.code || 'DB_UPDATE_FAILED',
    }
  }

  // 6. Emit Domain Event asynchronously
  if (evaluation.domainEvent) {
    await emitDomainEvent(supabase, evaluation.domainEvent)
  }

  return {
    success: true,
    data: evaluation.result,
  }
}
