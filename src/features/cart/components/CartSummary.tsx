'use client'

// =============================================================================
// CartSummary — price breakdown panel for the Cart page
// Delivery: free above ₹499 (49900 Paisa), else ₹49 (4900 Paisa)
// Tax: 5% GST (matches store_settings default)
// Source of truth: PRD.md CJ-3, DatabaseDesign §2.4 store_settings
// =============================================================================

import Link from 'next/link'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import { DELIVERY_FEE_PAISA, FREE_DELIVERY_THRESHOLD, TAX_RATE } from '@/lib/constants/pricing'


export function CartSummary() {
  const { items, getSubtotal, clearCart } = useCartStore()
  const subtotal = getSubtotal()

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE_PAISA
  const tax = Math.round(subtotal * TAX_RATE)
  const estimatedTotal = subtotal + deliveryFee + tax

  const fmt = (p: number) => `₹${Math.round(p / 100)}`

  if (items.length === 0) return null

  return (
    <div className="liquid-glass-surface rounded-2xl p-6 space-y-4 sticky top-6">
      <h2 className="font-bold text-lg">Order Summary</h2>

      {/* Line items */}
      <dl className="space-y-2 text-sm">
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

        {deliveryFee > 0 && (
          <p className="text-xs text-muted-foreground">
            Free delivery on orders above {fmt(FREE_DELIVERY_THRESHOLD)}
          </p>
        )}

        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax (GST 5%)</dt>
          <dd className="font-medium">{fmt(tax)}</dd>
        </div>

        <div className="flex justify-between border-t border-border pt-3 mt-2">
          <dt className="font-bold text-base">Estimated Total</dt>
          <dd className="font-bold text-base text-primary">{fmt(estimatedTotal)}</dd>
        </div>
      </dl>

      {/* Actions */}
      <Link
        href="/checkout"
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl',
          'bg-primary text-primary-foreground font-semibold py-4',
          'hover:bg-primary/90 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        )}
      >
        <ShoppingBag className="h-5 w-5" />
        Proceed to Checkout
      </Link>

      <button
        onClick={clearCart}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl',
          'border border-border py-3 text-sm text-muted-foreground',
          'hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive',
        )}
      >
        <Trash2 className="h-4 w-4" />
        Clear Cart
      </button>
    </div>
  )
}
