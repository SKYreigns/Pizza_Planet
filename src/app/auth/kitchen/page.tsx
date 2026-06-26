import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'
import KitchenPinForm from './KitchenPinForm'

export const metadata: Metadata = {
  title: 'Kitchen Login',
  description: 'Kitchen staff PIN entry for Pizza Planet.',
  robots: { index: false, follow: false },
}

/**
 * Kitchen PIN entry page.
 * Redirects to /kitchen if kitchen/owner session already exists.
 */
export default async function KitchenLoginPage() {
  const result = await getCurrentUser()

  if (
    result.success &&
    (result.data.role === 'kitchen' || result.data.role === 'owner')
  ) {
    redirect('/kitchen')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cosmic-slate px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cream mb-2">
            🍕 Kitchen
          </h1>
          <p className="text-white/60 text-sm">Enter your PIN to access the queue</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <KitchenPinForm />
        </div>
      </div>
    </main>
  )
}
