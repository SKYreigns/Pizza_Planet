'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { X, Minus, Plus } from 'lucide-react'
import { useProductModal } from './useProductModal'
import { useCartStore } from '@/stores/cart-store'
import type { CartItemOption } from '@/stores/cart-store'
import type { ProductWithDetails, ProductVariant } from '@/types/menu'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function ProductModal() {
  const { isOpen, productId, closeModal } = useProductModal()
  const addItem = useCartStore((state) => state.addItem)
  
  const [product, setProduct] = useState<ProductWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)
  
  // Customization selection states
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedCrustId, setSelectedCrustId] = useState<string | null>(null)
  const [selectedSauceId, setSelectedSauceId] = useState<string | null>(null)
  const [selectedToppings, setSelectedToppings] = useState<Record<string, boolean>>({})

  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  // Focus trap / Focus return management
  useEffect(() => {
    if (isOpen) {
      const activeElement = document.activeElement as HTMLElement
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 50)
      
      return () => {
        clearTimeout(timer)
        activeElement?.focus()
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && productId) {
      setIsLoading(true)
      const fetchProduct = async () => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            variants:product_variants(*),
            customizations:product_customizations(
              *,
              customization_option:customization_options(*)
            )
          `)
          .eq('id', productId)
          .single()
        
        if (!error && data) {
          const fetchedProduct = data as ProductWithDetails
          if (fetchedProduct.customizations) {
            // Filter available options
            fetchedProduct.customizations = fetchedProduct.customizations.filter(
              (c) => c.customization_option?.is_available
            )
          }
          setProduct(fetchedProduct)
          
          // Set initial size/variant selection
          const defaultVariant = 
            fetchedProduct.variants?.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))[0] || null
          setSelectedVariant(defaultVariant)

          // Set default customizations
          let defaultCrust: string | null = null
          let defaultSauce: string | null = null
          const initialToppings: Record<string, boolean> = {}

          fetchedProduct.customizations?.forEach((c) => {
            if (c.customization_option) {
              const opt = c.customization_option
              if (opt.type === 'crust' && c.is_default) {
                defaultCrust = opt.id
              } else if (opt.type === 'sauce' && c.is_default) {
                defaultSauce = opt.id
              } else if (opt.type === 'topping' && c.is_default) {
                initialToppings[opt.id] = true
              }
            }
          })

          // Fallbacks if no options are marked as is_default in the database
          if (!defaultCrust) {
            const firstCrust = fetchedProduct.customizations?.find(
              (c) => c.customization_option?.type === 'crust'
            )
            defaultCrust = firstCrust?.customization_option?.id || null
          }
          if (!defaultSauce) {
            const firstSauce = fetchedProduct.customizations?.find(
              (c) => c.customization_option?.type === 'sauce'
            )
            defaultSauce = firstSauce?.customization_option?.id || null
          }

          setSelectedCrustId(defaultCrust)
          setSelectedSauceId(defaultSauce)
          setSelectedToppings(initialToppings)
        }
        setIsLoading(false)
      }
      fetchProduct()
    } else {
      setProduct(null)
      setQuantity(1)
      setSelectedVariant(null)
      setSelectedCrustId(null)
      setSelectedSauceId(null)
      setSelectedToppings({})
    }
  }, [isOpen, productId])

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  // Categorize customization options
  const customizations = product?.customizations || []
  const crustOptions = customizations.filter(c => c.customization_option?.type === 'crust')
  const sauceOptions = customizations.filter(c => c.customization_option?.type === 'sauce')
  const toppingOptions = customizations.filter(c => c.customization_option?.type === 'topping')

  // Calculate dynamic price in Paisa
  const basePrice = product?.base_price ?? 0
  const variantPriceAdjustment = selectedVariant?.price_adjustment ?? 0
  
  const crustPrice = crustOptions.find(c => c.customization_option?.id === selectedCrustId)
    ?.customization_option?.price ?? 0
  
  const saucePrice = sauceOptions.find(c => c.customization_option?.id === selectedSauceId)
    ?.customization_option?.price ?? 0
  
  const toppingsPrice = toppingOptions.reduce((total, c) => {
    if (c.customization_option && selectedToppings[c.customization_option.id]) {
      return total + c.customization_option.price
    }
    return total
  }, 0)

  const unitPrice = basePrice + variantPriceAdjustment + crustPrice + saucePrice + toppingsPrice
  const totalPrice = unitPrice * quantity

  const handleAddToCart = () => {
    if (!product) return

    const cartOptions: CartItemOption[] = []

    // Add selected crust option
    const selectedCrust = crustOptions.find(c => c.customization_option?.id === selectedCrustId)
      ?.customization_option
    if (selectedCrust) {
      cartOptions.push({ option: selectedCrust })
    }

    // Add selected sauce option
    const selectedSauce = sauceOptions.find(c => c.customization_option?.id === selectedSauceId)
      ?.customization_option
    if (selectedSauce) {
      cartOptions.push({ option: selectedSauce })
    }

    // Add selected topping options
    toppingOptions.forEach((c) => {
      if (c.customization_option && selectedToppings[c.customization_option.id]) {
        cartOptions.push({ option: c.customization_option })
      }
    })

    addItem({
      product,
      variant: selectedVariant || undefined,
      options: cartOptions,
      quantity,
      unitPrice,
    })

    toast.success(`Added ${product.name} to cart!`)
    closeModal()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeModal}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full sm:w-[500px] max-h-[90vh] flex flex-col bg-card/80 backdrop-blur-xl border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            ref={closeButtonRef}
            onClick={closeModal}
            className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/50 backdrop-blur text-foreground hover:bg-background/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {isLoading || !product ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Image */}
              <div className="relative w-full h-48 sm:h-64 bg-muted">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              {/* Content (scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {product.description}
                  </p>
                </div>

                {/* Size / Variant Selection */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg border-b border-border pb-2">Select Size</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {product.variants
                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                        .map((v) => {
                          const isSelected = selectedVariant?.id === v.id
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariant(v)}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                                  : 'border-white/5 bg-white/5 hover:bg-white/10 text-muted-foreground'
                              }`}
                            >
                              <span className="font-bold text-foreground">{v.size_name}</span>
                              <span className="text-xs">{v.size_label}</span>
                              <span className="text-xs mt-1 font-semibold text-foreground">
                                {v.price_adjustment > 0 ? `+₹${v.price_adjustment / 100}` : 'Base Price'}
                              </span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Crust Options (Single-Select) */}
                {crustOptions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg border-b border-border pb-2">Crust</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {crustOptions.map((c) => {
                        if (!c.customization_option) return null
                        const opt = c.customization_option
                        const isSelected = selectedCrustId === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedCrustId(opt.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                                : 'border-white/5 bg-white/5 hover:bg-white/10 text-muted-foreground'
                            }`}
                          >
                            <span className="font-medium text-foreground">{opt.name}</span>
                            <span className="text-sm text-foreground">
                              {opt.price > 0 ? `+₹${opt.price / 100}` : 'No extra cost'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Sauce Options (Single-Select) */}
                {sauceOptions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg border-b border-border pb-2">Sauce</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {sauceOptions.map((c) => {
                        if (!c.customization_option) return null
                        const opt = c.customization_option
                        const isSelected = selectedSauceId === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedSauceId(opt.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary'
                                : 'border-white/5 bg-white/5 hover:bg-white/10 text-muted-foreground'
                            }`}
                          >
                            <span className="font-medium text-foreground">{opt.name}</span>
                            <span className="text-sm text-foreground">
                              {opt.price > 0 ? `+₹${opt.price / 100}` : 'No extra cost'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Toppings (Multi-Select Checkboxes) */}
                {toppingOptions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg border-b border-border pb-2">Toppings</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {toppingOptions.map((c) => {
                        if (!c.customization_option) return null
                        const opt = c.customization_option
                        const isSelected = !!selectedToppings[opt.id]
                        return (
                          <label
                            key={opt.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedToppings((prev) => ({
                                    ...prev,
                                    [opt.id]: !prev[opt.id]
                                  }))
                                }}
                                className="h-5 w-5 rounded border-input bg-background text-primary focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              />
                              <span className="font-medium">{opt.name}</span>
                            </div>
                            <span className="text-sm">
                              +₹{opt.price / 100}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-6 bg-background/50 backdrop-blur-md border-t border-white/10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Quantity</span>
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-background hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-4 text-center font-semibold" aria-live="polite">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-background hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span>Add to Cart</span>
                  <span className="mx-2 opacity-50">•</span>
                  <span>₹{(totalPrice / 100).toFixed(0)}</span>
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
