'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import type { Product } from '@/types/menu'
import { useProductModal } from '@/features/product-modal/useProductModal'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { openModal } = useProductModal()
  
  // Convert Paisa to Rupees
  const priceInRupees = (product.base_price / 100).toFixed(0)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-md shadow-glass transition-all hover:shadow-elevated"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/50">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {product.is_veg ? (
            <span className="flex items-center justify-center w-5 h-5 bg-white rounded-sm border border-green-600">
              <span className="w-2.5 h-2.5 bg-green-600 rounded-full" />
            </span>
          ) : (
            <span className="flex items-center justify-center w-5 h-5 bg-white rounded-sm border border-red-600">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full" />
            </span>
          )}
        </div>

        {!product.is_available && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-background/90 text-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-1">{product.name}</h3>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4">
          {product.description || 'Delicious pizza prepared with our signature ingredients.'}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <span className="font-bold text-lg">₹{priceInRupees}</span>
          
          <button
            onClick={() => product.is_available && openModal(product.id)}
            disabled={!product.is_available}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
