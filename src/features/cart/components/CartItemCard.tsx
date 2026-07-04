'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import type { CartItem as CartItemType } from '@/stores/cart-store'

interface CartItemCardProps {
  item: CartItemType
}

export function CartItemCard({ item }: CartItemCardProps) {
  const { updateQuantity, removeItem } = useCartStore()

  const displayPrice = (paisa: number) => `₹${Math.round(paisa / 100)}`

  // Build the customisation summary string
  const customizationSummary = item.options
    .map((o) => o.option.name)
    .join(', ')

  return (
    <div className="group flex items-start gap-4 py-4 border-b border-black/5 dark:border-white/5 last:border-0 transition-all">
      {/* Product image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted/60 border border-black/5 dark:border-white/10">
        {item.product.image_url ? (
          <Image
            src={item.product.image_url}
            alt={item.product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-[10px] font-heading font-bold uppercase">
            Pie
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading font-bold text-base leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {item.product.name}
          </h3>
          <button
            onClick={() => removeItem(item.cartItemId)}
            className={cn(
              'shrink-0 flex h-7 w-7 items-center justify-center rounded-full',
              'text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10',
              'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
            aria-label={`Remove ${item.product.name} from cart`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Variant (size) */}
        {item.variant && (
          <p className="text-xs font-semibold text-primary/90 font-body">
            {item.variant.size_name}{item.variant.size_label ? ` (${item.variant.size_label})` : ''}
          </p>
        )}

        {/* Customizations summary */}
        {customizationSummary && (
          <p className="text-xs text-muted-foreground line-clamp-2 font-body leading-relaxed">
            <span className="font-semibold text-foreground/80">Add-ons:</span> {customizationSummary}
          </p>
        )}

        {/* Quantity controls and price */}
        <div className="mt-3 flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-black p-1 shadow-sm"
            role="group"
            aria-label="Quantity controls"
          >
            <button
              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                'bg-black/5 dark:bg-white/10 text-foreground hover:bg-primary hover:text-white transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3 stroke-[2.5]" />
            </button>
            <span className="w-6 text-center text-xs font-heading font-extrabold text-foreground" aria-live="polite">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                'bg-black/5 dark:bg-white/10 text-foreground hover:bg-primary hover:text-white transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3 stroke-[2.5]" />
            </button>
          </div>

          <span className="font-heading font-black text-base text-foreground">{displayPrice(item.totalPrice)}</span>
        </div>
      </div>
    </div>
  )
}
