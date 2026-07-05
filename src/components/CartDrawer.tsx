'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, ArrowRight, Trash2, Sparkles, Truck } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useSettingsStore } from '@/stores/settings-store'
import { CartItemCard } from '@/features/cart/components/CartItemCard'
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE_PAISA } from '@/lib/constants/pricing'
import { cn } from '@/lib/utils'

export function CartDrawer() {
  const { items, isOpen, closeCart, clearCart, getSubtotal } = useCartStore()
  const { settings, initialize } = useSettingsStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    initialize()
  }, [initialize])


  if (!mounted) return null

  const subtotal = getSubtotal()
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_FEE_PAISA
  const amountNeededForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
  const freeDeliveryProgress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)

  const fmt = (paisa: number) => `₹${Math.round(paisa / 100)}`

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Slide-out Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-[#F9F6F2] dark:bg-[#121214] border-l border-black/5 dark:border-white/10 shadow-2xl overflow-hidden"
            role="dialog"
            aria-label="Artisanal Cart Drawer"
            aria-modal="true"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading font-extrabold text-lg text-foreground leading-tight">
                    Your Artisanal Order
                  </h2>
                  <p className="text-xs text-muted-foreground font-body">
                    {items.length} {items.length === 1 ? 'creation' : 'creations'} selected
                  </p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close cart drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Free Delivery Progress Bar */}
            <div className="bg-white/80 dark:bg-black/60 px-6 py-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Truck className="h-3.5 w-3.5 text-primary" />
                  {subtotal >= FREE_DELIVERY_THRESHOLD ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Free Cosmic Delivery Unlocked!
                    </span>
                  ) : (
                    <span>
                      Add <strong className="text-primary">{fmt(amountNeededForFreeDelivery)}</strong> more for Free Delivery
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground font-mono">{Math.round(freeDeliveryProgress)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${freeDeliveryProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    subtotal >= FREE_DELIVERY_THRESHOLD
                      ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                      : 'bg-gradient-to-r from-primary to-[#C93A2F]'
                  )}
                />
              </div>
            </div>

            {/* Scrollable Item List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-black/5 dark:divide-white/5 scrollbar-thin">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-black/5 dark:bg-white/5 text-muted-foreground/60 border border-black/5 dark:border-white/5 shadow-inner">
                    <ShoppingBag className="h-10 w-10" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-heading font-bold text-lg text-foreground">Your order is empty</h3>
                    <p className="text-sm text-muted-foreground max-w-xs font-body leading-relaxed">
                      Explore our handcrafted pizzas, wood-fired dough, and artisan ingredients to begin.
                    </p>
                  </div>
                  <Link
                    href="/menu"
                    onClick={closeCart}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-white font-semibold text-sm px-6 py-3 shadow-md shadow-primary/20 hover:bg-primary/90 hover:scale-105 transition-all"
                  >
                    <span>Browse Menu</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {items.map((item) => (
                    <CartItemCard key={item.cartItemId} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            {items.length > 0 && (
              <footer className="border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1F] p-6 space-y-4 shadow-xl">
                <div className="space-y-2 text-sm font-body">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-foreground">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimated Delivery</span>
                    <span className={cn('font-semibold', deliveryFee === 0 ? 'text-green-600 dark:text-green-400' : 'text-foreground')}>
                      {deliveryFee === 0 ? 'FREE' : fmt(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-black/5 dark:border-white/10 pt-2.5 font-heading font-extrabold text-base text-foreground">
                    <span>Estimated Total</span>
                    <span className="text-primary text-lg">{fmt(subtotal + deliveryFee)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {settings && !settings.is_open ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        disabled
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground font-bold py-4 text-base cursor-not-allowed border border-border opacity-80"
                      >
                        <span>Ordering Closed — Kitchen Offline</span>
                      </button>
                      <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-medium">
                        Online ordering is temporarily unavailable while our kitchen is closed.
                      </p>
                    </div>
                  ) : (
                    <Link
                      href="/checkout"
                      onClick={closeCart}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#C93A2F] text-white font-bold py-4 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Link
                      href="/cart"
                      onClick={closeCart}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4 px-2 py-1 transition-colors"
                    >
                      View Full Cart & Summary
                    </Link>
                    <button
                      onClick={clearCart}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive px-2 py-1 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                </div>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
