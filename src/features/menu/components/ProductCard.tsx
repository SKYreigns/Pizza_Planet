'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Plus, Flame, Sparkles } from 'lucide-react'
import type { Product } from '@/types/menu'
import { useProductModal } from '@/features/product-modal/useProductModal'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { openModal } = useProductModal()
  
  // Convert Paisa to Rupees
  const priceInRupees = (product.base_price / 100).toFixed(0)

  // Determine badges dynamically based on name/description or hardcoded signatures
  const isSpicy = product.name.toLowerCase().includes('spicy') || 
                  product.name.toLowerCase().includes('hot') || 
                  product.name.toLowerCase().includes('calabrese') ||
                  product.name.toLowerCase().includes('chili') ||
                  product.name.toLowerCase().includes('pepperoni') ||
                  product.description?.toLowerCase().includes('spicy') ||
                  product.description?.toLowerCase().includes('chili')

  const isBestseller = product.name.toLowerCase().includes('pepperoni') || 
                       product.name.toLowerCase().includes('margherita') || 
                       product.name.toLowerCase().includes('truffle') ||
                       product.name.toLowerCase().includes('garlic bread')

  return (
    <motion.div
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="group relative flex flex-col h-full overflow-hidden rounded-[22px] border border-black/5 dark:border-white/10 bg-white dark:bg-[#1C1C1F] shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F9F6F2] dark:bg-[#121214]">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2 text-muted-foreground/60">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Artisan Creation</span>
          </div>
        )}
        
        {/* Top Badges Stack */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-10">
          {/* Veg / Non-Veg Indicator */}
          {product.is_veg ? (
            <span 
              className="flex items-center justify-center w-6 h-6 bg-white/95 dark:bg-black/95 rounded-md border border-green-600 shadow-sm"
              title="100% Vegetarian"
            >
              <span className="w-3 h-3 bg-green-600 rounded-full" />
            </span>
          ) : (
            <span 
              className="flex items-center justify-center w-6 h-6 bg-white/95 dark:bg-black/95 rounded-md border border-red-600 shadow-sm"
              title="Non-Vegetarian / Meats"
            >
              <span className="w-3 h-3 bg-red-600 rounded-full" />
            </span>
          )}

          {/* Spicy Badge */}
          {isSpicy && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600/90 backdrop-blur-md text-white text-[10px] font-heading font-extrabold uppercase tracking-wider shadow-sm">
              <Flame className="h-3 w-3 fill-white animate-pulse" />
              <span>Spicy</span>
            </span>
          )}
        </div>

        {/* Bestseller Badge */}
        {isBestseller && product.is_available && (
          <div className="absolute right-3 top-3 z-10">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-[#C93A2F] text-white text-[11px] font-heading font-bold shadow-md">
              <Sparkles className="h-3 w-3 fill-white" />
              <span>Bestseller</span>
            </span>
          </div>
        )}

        {/* Sold Out Overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-20">
            <span className="bg-foreground text-background px-5 py-2 rounded-full text-xs font-heading font-extrabold uppercase tracking-widest shadow-lg border border-white/10">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-heading font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
        </div>
        
        <p className="text-sm text-muted-foreground font-body leading-relaxed line-clamp-2 flex-1">
          {product.description || 'Handcrafted Neapolitan pizza prepared with 48-hour slow fermented sourdough.'}
        </p>

        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-mono">Price</span>
            <span className="font-heading font-extrabold text-xl text-foreground">₹{priceInRupees}</span>
          </div>
          
          <button
            onClick={() => product.is_available && openModal(product.id)}
            disabled={!product.is_available}
            className={cn(
              'flex items-center gap-2 h-11 px-4 rounded-full font-heading font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              product.is_available
                ? 'bg-gradient-to-r from-primary to-[#C93A2F] text-white hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            )}
            aria-label={`Customize and add ${product.name} to cart`}
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
