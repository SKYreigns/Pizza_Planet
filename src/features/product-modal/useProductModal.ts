import { create } from 'zustand'

interface ProductModalState {
  isOpen: boolean
  productId: string | null
  openModal: (productId: string) => void
  closeModal: () => void
}

export const useProductModal = create<ProductModalState>((set) => ({
  isOpen: false,
  productId: null,
  openModal: (productId) => set({ isOpen: true, productId }),
  closeModal: () => set({ isOpen: false, productId: null }),
}))
