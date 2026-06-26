import type { Metadata } from 'next'
import { CartView } from '@/features/cart/components/CartView'

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review your order, update quantities and proceed to checkout.',
}

export default function CartPage() {
  return (
    <main className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
      <h1 className="text-3xl font-extrabold tracking-tight mb-8">Your Cart</h1>
      <CartView />
    </main>
  )
}
