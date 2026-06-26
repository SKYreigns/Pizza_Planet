'use client'

// =============================================================================
// CartView — top-level client component for the cart page
// Owns the empty state, item list, and summary panel layout.
// Source of truth: PRD.md CJ-3
// =============================================================================

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { CartItemCard } from './CartItemCard'
import { CartSummary } from './CartSummary'

export function CartView() {
  const items = useCartStore((state) => state.items)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-muted"
        >
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="text-muted-foreground max-w-xs">
            Looks like you haven&apos;t added any items yet. Head over to the menu
            to get started.
          </p>
        </div>

        <Link
          href="/menu"
          className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold px-8 py-3 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Browse Menu
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Item list */}
      <section
        aria-label="Cart items"
        className="lg:col-span-2"
      >
        <div className="liquid-glass-surface rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
          </h2>
          <div>
            {items.map((item) => (
              <CartItemCard key={item.cartItemId} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Summary panel */}
      <aside aria-label="Order summary" className="lg:col-span-1">
        <CartSummary />
      </aside>
    </div>
  )
}
