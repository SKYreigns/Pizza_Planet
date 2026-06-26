import type { Metadata } from 'next'
import { CheckoutForm } from '@/features/checkout/components/CheckoutForm'
import { CheckoutOrderSummary } from '@/features/checkout/components/CheckoutOrderSummary'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your Pizza Planet order. Enter your details and place your order.',
}

export default function CheckoutPage() {
  return (
    <main className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
      <h1 className="text-3xl font-extrabold tracking-tight mb-8">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Form — takes 2/3 width on desktop */}
        <div className="lg:col-span-2">
          <CheckoutForm />
        </div>

        {/* Order summary sidebar — 1/3 on desktop */}
        <div className="lg:col-span-1">
          <CheckoutOrderSummary />
        </div>
      </div>
    </main>
  )
}
