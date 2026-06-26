// =============================================================================
// Order & Checkout Types — Pizza Planet
// Source of truth: DatabaseDesign.md §2.3, API-Specification.md §6–7
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

export type PaymentMethod = 'online' | 'cod'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type OrderType = 'delivery' | 'pickup'

// ─── Delivery Address (stored as JSONB in orders.delivery_address) ───────────

export interface DeliveryAddress {
  flat: string
  landmark: string
  area: string
  city: string
  pincode: string
}

// ─── Cart item payload sent from client to Server Action ─────────────────────

export interface CheckoutCartItem {
  productId: string
  variantId: string | null
  quantity: number
  /** Unit price in Paisa as computed on the client — will be re-validated server-side */
  clientUnitPrice: number
  options: Array<{ optionId: string; priceSnapshot: number }>
}

// ─── Full checkout form payload ───────────────────────────────────────────────

export interface CheckoutFormData {
  customerName: string
  customerPhone: string
  customerEmail: string
  orderType: OrderType
  paymentMethod: PaymentMethod
  deliveryAddress: DeliveryAddress | null
  specialInstructions: string
  items: CheckoutCartItem[]
  idempotencyKey?: string
}

// ─── Server Action response from createOrder ─────────────────────────────────

export interface CreateOrderResult {
  orderId: string
  orderNumber: string
  trackingToken: string
  totalAmount: number
}

// ─── Generic Server Action response envelope (API-Specification §18) ─────────

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

// ─── Order summary returned from tracking/confirmation ───────────────────────

export interface OrderItemSummary {
  id: string
  productId: string
  productNameSnapshot: string
  variantId: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  specialInstructions: string | null
  customizations: Array<{
    optionId: string
    optionNameSnapshot: string
    priceSnapshot: number
  }>
}

export interface OrderSummary {
  id: string
  shortId: string
  orderType: OrderType
  customerName: string
  customerPhone: string
  deliveryAddress: DeliveryAddress | null
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  subtotal: number
  tax: number
  deliveryFee: number
  discountAmount: number
  totalAmount: number
  trackingToken: string
  specialInstructions: string | null
  createdAt: string
  items: OrderItemSummary[]
}
