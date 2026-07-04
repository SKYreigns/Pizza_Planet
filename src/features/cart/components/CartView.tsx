'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { CartItemCard } from './CartItemCard'
import { CartSummary } from './CartSummary'

export function CartView() {
  const items = useCartStore((state) => state.items)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 shadow-xl text-primary"
        >
          <ShoppingBag className="h-12 w-12 stroke-[1.5]" />
        </motion.div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
            Empty Bag
          </span>
          <h2 className="font-heading font-extrabold text-3xl text-foreground tracking-tight">
            Your Cart is Currently Empty
          </h2>
          <p className="text-muted-foreground font-body leading-relaxed">
            Looks like you haven&apos;t added any artisanal pies yet. Explore our slow-fermented Neapolitan menu to get started.
          </p>
        </div>

        <Link
          href="/menu"
          className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary to-[#C93A2F] text-white font-heading font-bold px-8 py-4 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <span>Explore Artisanal Menu</span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
      {/* Item list */}
      <section
        aria-label="Cart items"
        className="lg:col-span-7 xl:col-span-8 space-y-6"
      >
        <div className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-extrabold text-xl text-foreground">
                Selected Creations
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {items.map((item) => (
              <CartItemCard key={item.cartItemId} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Summary panel */}
      <aside aria-label="Order summary" className="lg:col-span-5 xl:col-span-4 w-full">
        <CartSummary />
      </aside>
    </div>
  )
}
