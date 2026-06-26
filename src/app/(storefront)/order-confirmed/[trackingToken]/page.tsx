import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, MapPin, CreditCard, Clock, ArrowRight } from 'lucide-react'
import { getOrderByTrackingToken } from '@/features/order/queries/getOrderByTrackingToken'
import { cn } from '@/lib/utils'

// =============================================================================
// Order Confirmation Page
// Public — accessible via unique tracking token, no authentication required.
// Source of truth: PRD.md CJ-4 (Order Confirmation step), API-Specification §8
// =============================================================================

interface PageProps {
  params: Promise<{ trackingToken: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { trackingToken } = await params
  const order = await getOrderByTrackingToken(trackingToken)
  if (!order) return { title: 'Order Not Found' }
  return {
    title: `Order ${order.shortId} Confirmed`,
    description: `Your Pizza Planet order ${order.shortId} has been placed. Track it live.`,
  }
}

export default async function OrderConfirmedPage({ params }: PageProps) {
  const { trackingToken } = await params
  const order = await getOrderByTrackingToken(trackingToken)

  if (!order) notFound()

  const fmt = (p: number) => `₹${Math.round(p / 100)}`

  const paymentMethodLabel =
    order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'

  const orderTypeLabel =
    order.orderType === 'pickup' ? 'Store Pickup' : 'Home Delivery'

  return (
    <main className="container mx-auto px-4 py-10 sm:py-16 max-w-2xl">
      {/* Hero — success indicator */}
      <div className="flex flex-col items-center text-center gap-4 mb-10">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">Order Placed!</h1>
          <p className="text-muted-foreground">
            We&apos;ve received your order and it&apos;s being prepared.
          </p>
        </div>

        {/* Order number badge */}
        <div className="liquid-glass-surface rounded-full px-6 py-2 font-mono font-bold text-xl tracking-widest text-primary">
          {order.shortId}
        </div>
      </div>

      {/* Order details */}
      <div className="space-y-4">

        {/* Meta info */}
        <div className="liquid-glass-surface rounded-2xl p-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Order Type
            </span>
            <span className="font-semibold flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              {orderTypeLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Payment
            </span>
            <span className="font-semibold flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-primary" />
              {paymentMethodLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Estimated Time
            </span>
            <span className="font-semibold flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              {order.orderType === 'pickup' ? '15–20 min' : '30–45 min'}
            </span>
          </div>
        </div>

        {/* Delivery address (if delivery order) */}
        {order.orderType === 'delivery' && order.deliveryAddress && (
          <div className="liquid-glass-surface rounded-2xl p-6 space-y-1">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Delivery Address
            </h2>
            <p className="font-medium">{order.deliveryAddress.flat}</p>
            {order.deliveryAddress.landmark && (
              <p className="text-sm text-muted-foreground">{order.deliveryAddress.landmark}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {order.deliveryAddress.area}, {order.deliveryAddress.city} — {order.deliveryAddress.pincode}
            </p>
          </div>
        )}

        {/* Order items */}
        <div className="liquid-glass-surface rounded-2xl p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
            Your Items
          </h2>
          <ul className="space-y-3" role="list">
            {order.items.map((item) => {
              const customizationText = item.customizations
                .map((c) => c.optionNameSnapshot)
                .join(', ')

              return (
                <li key={item.id} className="flex justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-1">
                      <span className="text-muted-foreground mr-1.5">×{item.quantity}</span>
                      {item.productNameSnapshot}
                    </p>
                    {customizationText && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {customizationText}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold">{fmt(item.totalPrice)}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Price summary */}
        <div className="liquid-glass-surface rounded-2xl p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
            Price Breakdown
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium">{fmt(order.subtotal)}</dd>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Discount</dt>
                <dd className="font-medium">−{fmt(order.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className={cn('font-medium', order.deliveryFee === 0 && 'text-primary')}>
                {order.deliveryFee === 0 ? 'Free' : fmt(order.deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax (GST)</dt>
              <dd className="font-medium">{fmt(order.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 mt-2">
              <dt className="font-bold text-base">Total</dt>
              <dd className="font-bold text-base text-primary">{fmt(order.totalAmount)}</dd>
            </div>
          </dl>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href={`/track/${trackingToken}`}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl',
              'bg-primary text-primary-foreground font-bold py-4',
              'hover:bg-primary/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            )}
          >
            Track My Order
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/menu"
            className={cn(
              'flex w-full items-center justify-center rounded-xl',
              'border border-border py-3 text-sm text-muted-foreground',
              'hover:bg-muted transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </main>
  )
}
