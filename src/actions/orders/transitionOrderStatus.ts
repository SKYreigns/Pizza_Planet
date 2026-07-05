'use server'

// =============================================================================
// Pizza Planet — Canonical Order Transition Server Action Adapter (Gate 3: SYS-07.5)
// Authoritative thin endpoint adapter delegating to OrderApplicationService.
// Source of truth: API-Specification.md §6, ORDER_AGGREGATE_ARCHITECTURE.md
// =============================================================================

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import { getKitchenSession } from '@/lib/auth/getKitchenSession'
import { orderApplicationService, isOrderServiceError } from '@/lib/orders/service'
import { ALL_ORDER_STATES } from '@/lib/orders/states'
import type { ActionResponse } from '@/types/order'
import type { TransitionOrderInput, TransitionOrderResult, OrderStatus, ActorRole } from '@/types/order-status'

const TransitionInputSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
  targetStatus: z.enum(ALL_ORDER_STATES as [string, ...string[]]) as unknown as z.ZodType<OrderStatus>,
  expectedVersion: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
  correlationId: z.string().max(100).optional(),
  causationId: z.string().max(100).optional(),
  idempotencyKey: z.string().max(150).optional(),
})

/**
 * Authoritative Server Action adapter executing order status transitions.
 * Resolves authentication context and delegates domain orchestration to OrderApplicationService.
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

  const { orderId, targetStatus, expectedVersion, reason, correlationId, causationId, idempotencyKey } = parseResult.data

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

  // 3. Delegate to Application Service
  const supabase = await createClient()
  const result = await orderApplicationService.transitionOrder(
    supabase,
    {
      orderId,
      targetStatus,
      expectedVersion,
      reason,
      correlationId,
      causationId,
      idempotencyKey,
    },
    actorId,
    actorRole
  )

  if (isOrderServiceError(result)) {
    return {
      success: false,
      error: result.error,
      code: result.code,
    }
  }

  return {
    success: true,
    data: result,
  }
}
