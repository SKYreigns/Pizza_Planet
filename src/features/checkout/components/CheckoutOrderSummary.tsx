'use client'

// =============================================================================
// CheckoutOrderSummary — read-only cart preview in the sidebar during checkout
// Source of truth: PRD.md CJ-4 Payment Summary
// =============================================================================

import Image from 'next/image'
import { useCartStore } from '@/stores/cart-store'
import { cn } from '@/lib/utils'
import { DELIVERY_FEE_PAISA, FREE_DELIVERY_THRESHOLD, TAX_RATE } from '@/lib/constants/pricing'


export function CheckoutOrderSummary() {
  const items = useCartStore((state) => state.items)
  const subtotal = useCartStore((state) => state.getSubtotal())

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE_PAISA
  const tax = Math.round(subtotal * TAX_RATE)
  const estimatedTotal = subtotal + deliveryFee + tax

  const fmt = (p: number) => `₹${Math.round(p / 100)}`

  return (
    <aside
      aria-label="Order preview"
      className="liquid-glass-surface rounded-2xl p-6 space-y-5 sticky top-6"
    >
      <h2 className="font-bold text-lg">Your Order</h2>

      {/* Item list */}
      <ul className="space-y-3" role="list">
        {items.map((item) => (
          <li key={item.cartItemId} className="flex items-center gap-3">
            {/* Thumbnail */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.product.image_url ? (
                <Image
                  src={item.product.image_url}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                  —
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
              {item.variant && (
                <p className="text-xs text-muted-foreground">{item.variant.size_name}</p>
              )}
            </div>
            <div className="shrink-0 text-sm font-semibold">
              <span className="text-muted-foreground mr-1">×{item.quantity}</span>
              {fmt(item.totalPrice)}
            </div>
          </li>
        ))}
      </ul>

      {/* Price breakdown */}
      <dl className="space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium">{fmt(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className={cn('font-medium', deliveryFee === 0 && 'text-primary')}>
            {deliveryFee === 0 ? 'Free' : fmt(deliveryFee)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax (GST 5%)</dt>
          <dd className="font-medium">{fmt(tax)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3">
          <dt className="font-bold">Estimated Total</dt>
          <dd className="font-bold text-primary">{fmt(estimatedTotal)}</dd>
        </div>
      </dl>
    </aside>
  )
}
