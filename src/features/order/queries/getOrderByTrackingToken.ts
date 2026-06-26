import { createAdminClient } from '@/lib/supabase/server'
import type { OrderSummary, OrderItemSummary, DeliveryAddress, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@/types/order'

// =============================================================================
// getOrderByTrackingToken — server-side query used by tracking & confirmation pages
// Public: accessible without authentication (via unique token)
// Source of truth: DatabaseDesign.md §2.3, API-Specification.md §8
// =============================================================================

export async function getOrderByTrackingToken(
  trackingToken: string,
): Promise<OrderSummary | null> {
  // Use admin client to bypass RLS, since tracking tokens are unauthenticated
  // and we've disabled public anon select access to orders for security.
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      short_id,
      order_type,
      customer_name,
      customer_phone,
      delivery_address,
      status,
      payment_method,
      payment_status,
      subtotal,
      tax,
      delivery_fee,
      discount_amount,
      total_amount,
      tracking_token,
      special_instructions,
      created_at,
      order_items (
        id,
        product_id,
        product_name_snapshot,
        variant_id,
        quantity,
        unit_price,
        total_price,
        special_instructions,
        order_item_customizations (
          option_id,
          option_name_snapshot,
          price_snapshot
        )
      )
    `)
    .eq('tracking_token', trackingToken)
    .single()

  if (error || !data) return null

  const order = data as {
    id: string
    short_id: string
    order_type: string
    customer_name: string
    customer_phone: string
    delivery_address: DeliveryAddress | null
    status: string
    payment_method: string
    payment_status: string
    subtotal: number
    tax: number
    delivery_fee: number
    discount_amount: number
    total_amount: number
    tracking_token: string
    special_instructions: string | null
    created_at: string
    order_items: Array<{
      id: string
      product_id: string
      product_name_snapshot: string
      variant_id: string | null
      quantity: number
      unit_price: number
      total_price: number
      special_instructions: string | null
      order_item_customizations: Array<{
        option_id: string
        option_name_snapshot: string
        price_snapshot: number
      }>
    }>
  }

  const items: OrderItemSummary[] = order.order_items.map((item) => ({
    id: item.id,
    productId: item.product_id,
    productNameSnapshot: item.product_name_snapshot,
    variantId: item.variant_id,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    specialInstructions: item.special_instructions,
    customizations: item.order_item_customizations.map((c) => ({
      optionId: c.option_id,
      optionNameSnapshot: c.option_name_snapshot,
      priceSnapshot: c.price_snapshot,
    })),
  }))

  return {
    id: order.id,
    shortId: order.short_id,
    orderType: order.order_type as OrderType,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    deliveryAddress: order.delivery_address,
    status: order.status as OrderStatus,
    paymentMethod: order.payment_method as PaymentMethod,
    paymentStatus: order.payment_status as PaymentStatus,
    subtotal: order.subtotal,
    tax: order.tax,
    deliveryFee: order.delivery_fee,
    discountAmount: order.discount_amount,
    totalAmount: order.total_amount,
    trackingToken: order.tracking_token,
    specialInstructions: order.special_instructions,
    createdAt: order.created_at,
    items,
  }
}
