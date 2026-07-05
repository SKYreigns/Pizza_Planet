// =============================================================================
// Pizza Planet — Canonical Order Repository (Gate 3: SYS-07.5)
// Exclusive persistence layer encapsulating queries, mutations, OCC, and outbox writes.
// Source of truth: ORDER_AGGREGATE_ARCHITECTURE.md, PRD.md
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrderAggregate, OrderStatus, ActorRole } from '@/types/order-status'

export interface SaveTransitionParams {
  orderId: string
  expectedVersion?: number
  targetStatus: OrderStatus
  actorId: string | null
  actorRole: ActorRole
  reason?: string
  idempotencyKey?: string
  requestHash?: string
  outboxEvent?: any
}

export interface SaveTransitionResult {
  success: boolean
  noop?: boolean
  version?: number
  error?: string
  code?: string
  oldStatus?: OrderStatus
  newStatus?: OrderStatus
}

export class OrderRepository {
  /**
   * Retrieves an Order Aggregate by its primary UUID.
   * Encapsulates raw table structure and returns clean domain aggregate.
   */
  public async findOrderById(supabase: SupabaseClient<any, 'public', any>, orderId: string): Promise<OrderAggregate | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToAggregate(data)
    } catch (err) {
      return null
    }
  }

  /**
   * Retrieves an Order Aggregate by its public tracking token UUID.
   */
  public async findByTrackingToken(supabase: SupabaseClient<any, 'public', any>, trackingToken: string): Promise<OrderAggregate | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tracking_token', trackingToken)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapToAggregate(data)
    } catch (err) {
      return null
    }
  }

  /**
   * Persists an order status transition, outbox event, and audit record atomically
   * via PostgreSQL RPC function `execute_order_transition_tx`.
   * Enforces Optimistic Concurrency Control (OCC) and Idempotency.
   */
  public async saveTransition(
    supabase: SupabaseClient<any, 'public', any>,
    params: SaveTransitionParams
  ): Promise<SaveTransitionResult> {
    try {
      const { data, error } = await supabase.rpc('execute_order_transition_tx', {
        p_order_id: params.orderId,
        p_expected_version: params.expectedVersion ?? null,
        p_new_status: params.targetStatus,
        p_actor_id: params.actorId ?? null,
        p_actor_role: params.actorRole,
        p_note: params.reason ?? null,
        p_idempotency_key: params.idempotencyKey ?? null,
        p_request_hash: params.requestHash ?? null,
        p_outbox_event: params.outboxEvent ?? null,
      })

      if (error) {
        // Parse SQL exception error code / message for structured domain feedback
        const msg = error.message || 'Database transaction failed'
        const code = error.code || 'TX_FAILED'

        if (msg.includes('CONCURRENT_MODIFICATION') || code === 'PZ003' || code === '40001') {
          return { success: false, error: msg, code: 'CONCURRENT_MODIFICATION' }
        }
        if (msg.includes('IDEMPOTENCY_KEY_MISMATCH') || code === 'PZ009') {
          return { success: false, error: msg, code: 'IDEMPOTENCY_KEY_MISMATCH' }
        }
        if (msg.includes('ORDER_NOT_FOUND') || code === 'PZ004') {
          return { success: false, error: msg, code: 'ORDER_NOT_FOUND' }
        }
        if (msg.includes('PZ001') || msg.includes('TERMINAL_STATE_LOCKED')) {
          return { success: false, error: msg, code: 'TERMINAL_STATE_LOCKED' }
        }
        if (msg.includes('PZ002') || msg.includes('ILLEGAL_TRANSITION')) {
          return { success: false, error: msg, code: 'ILLEGAL_TRANSITION' }
        }

        return { success: false, error: msg, code }
      }

      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Empty transaction response from repository', code: 'TX_EMPTY_RESULT' }
      }

      return {
        success: Boolean((data as any).success),
        noop: Boolean((data as any).noop),
        version: (data as any).version,
        oldStatus: (data as any).oldStatus,
        newStatus: (data as any).newStatus,
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Repository transaction exception', code: 'REPO_EXCEPTION' }
    }
  }

  private mapToAggregate(row: any): OrderAggregate {
    return {
      id: row.id,
      shortId: row.short_id || row.id.substring(0, 8),
      orderType: row.order_type || 'delivery',
      customerId: row.customer_id || null,
      customerName: row.customer_name || 'Guest Customer',
      customerPhone: row.customer_phone || '',
      status: (row.status || 'pending_payment') as OrderStatus,
      version: row.version ?? 1,
      paymentMethod: row.payment_method || 'online',
      paymentStatus: row.payment_status || 'pending',
      subtotal: row.subtotal || 0,
      tax: row.tax ?? row.tax_amount ?? 0,
      deliveryFee: row.delivery_fee || 0,
      totalAmount: row.total_amount || 0,
      trackingToken: row.tracking_token || '',
      createdAt: row.created_at || new Date().toISOString(),
    }
  }
}

export const orderRepository = new OrderRepository()
