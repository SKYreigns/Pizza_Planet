// =============================================================================
// Pizza Planet — Canonical Order Domain Events (Gate 3: SYS-07.5)
// Authoritative versioned event generator and publisher for decoupled downstream consumers.
// Source of truth: PRD.md §Realtime, SystemArchitecture.md §Event Architecture
// =============================================================================

import type { OrderStatus, ActorRole, DomainEventPayload } from '@/types/order-status'
import type { SupabaseClient } from '@supabase/supabase-js'

export type OrderDomainEventType =
  | 'OrderCreated'
  | 'OrderConfirmed'
  | 'KitchenAccepted'
  | 'PreparingStarted'
  | 'OrderReady'
  | 'DriverAssigned'
  | 'PickedUp'
  | 'Delivered'
  | 'OrderCancelled'
  | 'OrderRejected'
  | 'RefundRequired'

export function getDomainEventType(oldStatus: OrderStatus, newStatus: OrderStatus): OrderDomainEventType {
  if (newStatus === 'confirmed') return 'OrderConfirmed'
  if (newStatus === 'preparing') return 'PreparingStarted'
  if (newStatus === 'ready') return 'OrderReady'
  if (newStatus === 'out_for_delivery') return 'PickedUp'
  if (newStatus === 'delivered') return 'Delivered'
  if (newStatus === 'cancelled') return 'OrderCancelled'
  if (newStatus === 'rejected') return 'OrderRejected'
  return 'OrderConfirmed'
}

export function buildDomainEvent(
  orderId: string,
  oldStatus: OrderStatus,
  newStatus: OrderStatus,
  actorId: string | null,
  actorRole: ActorRole,
  aggregateVersion: number,
  reason?: string,
  correlationId?: string,
  causationId?: string
): DomainEventPayload & { eventType: OrderDomainEventType } {
  const eventType = getDomainEventType(oldStatus, newStatus)
  const eventId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const now = new Date().toISOString()

  return {
    eventId,
    eventType,
    eventVersion: '1.0',
    aggregateVersion,
    schemaVersion: 1,
    orderId,
    oldStatus,
    newStatus,
    actorId,
    actorRole,
    reason,
    correlationId,
    causationId,
    occurredAt: now,
    timestamp: now,
  }
}

/**
 * Emits the domain event to Supabase realtime channels.
 * Does not block transaction if downstream listeners fail.
 */
export async function emitDomainEvent(
  supabase: SupabaseClient<any, 'public', any>,
  event: DomainEventPayload & { eventType: OrderDomainEventType }
): Promise<void> {
  try {
    // 1. Broadcast via Supabase Realtime channel for instant UI updates (KDS, Track, Driver App)
    await supabase.channel(`order-events-${event.orderId}`).send({
      type: 'broadcast',
      event: event.eventType,
      payload: event,
    })

    // 2. Also broadcast on global kitchen/admin order channel
    await supabase.channel('global-order-events').send({
      type: 'broadcast',
      event: event.eventType,
      payload: event,
    })
  } catch (err) {
    console.warn(`[DomainEvents] Non-fatal error broadcasting event ${event.eventType} for order ${event.orderId}:`, err)
  }
}
