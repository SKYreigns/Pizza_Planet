'use client'

// =============================================================================
// CartItem — single line-item in the Cart page
// Source of truth: PRD.md CJ-3, FrontendArchitecture §5 (Component Architecture)
// =============================================================================

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
    <div className="flex gap-4 py-4 border-b border-border last:border-0">
      {/* Product image */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
        {item.product.image_url ? (
          <Image
            src={item.product.image_url}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {item.product.name}
          </h3>
          <button
            onClick={() => removeItem(item.cartItemId)}
            className={cn(
              'shrink-0 flex h-7 w-7 items-center justify-center rounded-full',
              'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
            aria-label={`Remove ${item.product.name} from cart`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Variant (size) */}
        {item.variant && (
          <p className="text-xs text-muted-foreground">
            {item.variant.size_name}{item.variant.size_label ? ` · ${item.variant.size_label}` : ''}
          </p>
        )}

        {/* Customizations summary */}
        {customizationSummary && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {customizationSummary}
          </p>
        )}

        {/* Quantity controls and price */}
        <div className="mt-2 flex items-center justify-between">
          <div
            className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1"
            role="group"
            aria-label="Quantity"
          >
            <button
              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                'hover:bg-muted transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-5 text-center text-sm font-semibold" aria-live="polite">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                'hover:bg-muted transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <span className="font-bold text-sm">{displayPrice(item.totalPrice)}</span>
        </div>
      </div>
    </div>
  )
}
