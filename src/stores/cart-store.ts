import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProductWithDetails, CustomizationOption, ProductVariant } from '@/types/menu'

export interface CartItemOption {
  option: CustomizationOption
}

export interface CartItem {
  cartItemId: string // unique local id (e.g. crypto.randomUUID)
  product: ProductWithDetails
  variant?: ProductVariant
  options: CartItemOption[]
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'cartItemId' | 'totalPrice'>) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  getSubtotal: () => number
  getItemCount: () => number
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      
      addItem: (item) => set((state) => {
        // Find if there is an existing item with the exact same product, variant, and options
        const existingIndex = state.items.findIndex((existing) => {
          if (existing.product.id !== item.product.id) return false
          if (existing.variant?.id !== item.variant?.id) return false
          
          // Compare options length and IDs
          if (existing.options.length !== item.options.length) return false
          
          const existingOptionIds = existing.options.map((o) => o.option.id).sort()
          const newItemOptionIds = item.options.map((o) => o.option.id).sort()
          
          return existingOptionIds.every((id, idx) => id === newItemOptionIds[idx])
        })

        if (existingIndex > -1) {
          const updatedItems = [...state.items]
          const existingItem = updatedItems[existingIndex]
          const newQuantity = existingItem.quantity + item.quantity
          
          updatedItems[existingIndex] = {
            ...existingItem,
            quantity: newQuantity,
            totalPrice: existingItem.unitPrice * newQuantity
          }
          
          return { items: updatedItems, isOpen: true }
        }

        const cartItemId = crypto.randomUUID()
        const totalPrice = item.unitPrice * item.quantity
        
        return {
          items: [...state.items, { ...item, cartItemId, totalPrice }],
          isOpen: true
        }
      }),
      
      removeItem: (cartItemId) => set((state) => ({
        items: state.items.filter((i) => i.cartItemId !== cartItemId)
      })),
      
      updateQuantity: (cartItemId, quantity) => set((state) => {
        if (quantity <= 0) {
          return { items: state.items.filter((i) => i.cartItemId !== cartItemId) }
        }
        
        return {
          items: state.items.map((i) => {
            if (i.cartItemId === cartItemId) {
              return {
                ...i,
                quantity,
                totalPrice: i.unitPrice * quantity
              }
            }
            return i
          })
        }
      }),
      
      clearCart: () => set({ items: [] }),
      
      getSubtotal: () => {
        return get().items.reduce((total, item) => total + item.totalPrice, 0)
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'pizza-planet-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
