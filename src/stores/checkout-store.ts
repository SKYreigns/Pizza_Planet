// =============================================================================
// Checkout Store — Pizza Planet
// Stores customer details, delivery address, order type and notes between
// the checkout page and order placement.
// Persisted to sessionStorage so data survives page reloads but not
// new browser sessions.
// Source of truth: PRD.md CJ-4, EngineeringStandards §4
// =============================================================================

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DeliveryAddress, OrderType, PaymentMethod } from '@/types/order'

export interface CheckoutCustomerDetails {
  customerName: string
  customerPhone: string
  customerEmail: string
}

interface CheckoutState {
  // Customer identity
  customerDetails: CheckoutCustomerDetails
  // Delivery configuration
  orderType: OrderType
  deliveryAddress: DeliveryAddress | null
  // Payment
  paymentMethod: PaymentMethod
  // Extra
  specialInstructions: string

  // Actions
  setCustomerDetails: (details: CheckoutCustomerDetails) => void
  setOrderType: (type: OrderType) => void
  setDeliveryAddress: (address: DeliveryAddress | null) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setSpecialInstructions: (instructions: string) => void
  reset: () => void
}

const INITIAL_STATE: Omit<
  CheckoutState,
  | 'setCustomerDetails'
  | 'setOrderType'
  | 'setDeliveryAddress'
  | 'setPaymentMethod'
  | 'setSpecialInstructions'
  | 'reset'
> = {
  customerDetails: {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  },
  orderType: 'delivery',
  deliveryAddress: null,
  paymentMethod: 'online',
  specialInstructions: '',
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setCustomerDetails: (details) =>
        set({ customerDetails: details }),

      setOrderType: (type) =>
        set({ orderType: type }),

      setDeliveryAddress: (address) =>
        set({ deliveryAddress: address }),

      setPaymentMethod: (method) =>
        set({ paymentMethod: method }),

      setSpecialInstructions: (instructions) =>
        set({ specialInstructions: instructions }),

      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'pizza-planet-checkout',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.sessionStorage : localStorage,
      ),
    },
  ),
)
