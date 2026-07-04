'use client'

import Link from 'next/link'
import { ShoppingBag, Trash2, ShieldCheck, Truck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import { DELIVERY_FEE_PAISA, FREE_DELIVERY_THRESHOLD, TAX_RATE } from '@/lib/constants/pricing'

export function CartSummary() {
  const { items, getSubtotal, clearCart } = useCartStore()
  const subtotal = getSubtotal()

  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_FEE_PAISA
  const tax = Math.round(subtotal * TAX_RATE)
  const estimatedTotal = subtotal + deliveryFee + tax

  const fmt = (p: number) => `₹${Math.round(p / 100)}`

  if (items.length === 0) return null

  return (
    <div className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-xl sticky top-28">
      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
        <h2 className="font-heading font-extrabold text-xl text-foreground">Order Summary</h2>
        <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
          {items.length} {items.length === 1 ? 'Pie' : 'Pies'}
        </span>
      </div>

      {/* Free Delivery Status */}
      <div className="p-3.5 rounded-2xl bg-[#F9F6F2] dark:bg-black/40 border border-black/5 dark:border-white/5 flex items-center gap-3 text-xs">
        <Truck className="h-5 w-5 text-primary shrink-0" />
        <div className="font-body">
          {deliveryFee === 0 ? (
            <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Free Galactic Delivery Applied!
            </span>
          ) : (
            <span>
              Add <strong className="text-primary">{fmt(FREE_DELIVERY_THRESHOLD - subtotal)}</strong> more for Free Delivery
            </span>
          )}
        </div>
      </div>

      {/* Line items */}
      <dl className="space-y-3 text-sm font-body">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-semibold text-foreground">{fmt(subtotal)}</dd>
        </div>

        <div className="flex justify-between">
          <dt className="text-muted-foreground">Delivery Fee</dt>
          <dd className={cn('font-semibold', deliveryFee === 0 ? 'text-green-600 dark:text-green-400' : 'text-foreground')}>
            {deliveryFee === 0 ? 'FREE' : fmt(deliveryFee)}
          </dd>
        </div>

        <div className="flex justify-between">
          <dt className="text-muted-foreground">Estimated Tax (GST 5%)</dt>
          <dd className="font-semibold text-foreground">{fmt(tax)}</dd>
        </div>

        <div className="flex justify-between border-t border-black/10 dark:border-white/10 pt-4 mt-2">
          <dt className="font-heading font-extrabold text-lg text-foreground">Estimated Total</dt>
          <dd className="font-heading font-black text-2xl text-primary">{fmt(estimatedTotal)}</dd>
        </div>
      </dl>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <Link
          href="/checkout"
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-full',
            'bg-gradient-to-r from-primary to-[#C93A2F] text-white font-heading font-bold py-4 text-base shadow-lg shadow-primary/25',
            'hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          <ShoppingBag className="h-5 w-5" />
          <span>Proceed to Checkout</span>
        </Link>

        <button
          onClick={clearCart}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-full',
            'border border-black/10 dark:border-white/10 py-3 text-xs font-semibold text-muted-foreground',
            'hover:border-destructive hover:text-destructive hover:bg-destructive/5 transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive',
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear All Items</span>
        </button>
      </div>

      {/* Security Guarantee */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground font-body text-center pt-2 border-t border-black/5 dark:border-white/5">
        <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
        <span>100% Secure Transaction & Live KDS Tracking</span>
      </div>
    </div>
  )
}
