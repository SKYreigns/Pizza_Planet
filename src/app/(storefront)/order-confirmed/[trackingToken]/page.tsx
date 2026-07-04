import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, MapPin, CreditCard, Clock, ArrowRight, Sparkles, Flame, Check, Truck } from 'lucide-react'
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
    title: `Order ${order.shortId} Confirmed | Pizza Planet`,
    description: `Your Pizza Planet order ${order.shortId} has been placed. Track it live.`,
  }
}

export default async function OrderConfirmedPage({ params }: PageProps) {
  const { trackingToken } = await params
  const order = await getOrderByTrackingToken(trackingToken)

  if (!order) notFound()

  const fmt = (p: number) => `₹${Math.round(p / 100)}`

  const paymentMethodLabel =
    order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online (Verified)'

  const orderTypeLabel =
    order.orderType === 'pickup' ? 'Studio Pickup' : 'Galactic Delivery'

  return (
    <main className="container mx-auto px-4 py-12 sm:py-20 max-w-3xl">
      {/* Hero — Celebration Indicator */}
      <div className="flex flex-col items-center text-center gap-5 mb-12">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl shadow-green-500/20 animate-bounce duration-[3000ms]">
          <Sparkles className="absolute -top-2 -right-2 h-7 w-7 text-amber-400 fill-amber-400 animate-pulse" />
          <CheckCircle className="h-12 w-12 stroke-[2]" aria-hidden="true" />
        </div>
        
        <div className="space-y-2 max-w-lg">
          <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
            Cosmic Transmission Successful
          </span>
          <h1 className="text-4xl sm:text-5xl font-heading font-black tracking-tight text-foreground">
            Order Confirmed!
          </h1>
          <p className="text-base text-muted-foreground font-body leading-relaxed">
            Our master pizzaiolos have received your order. Wood-fired preparation has officially begun.
          </p>
        </div>

        {/* Order number badge */}
        <div className="flex items-center gap-3 rounded-full bg-white dark:bg-[#1C1C1F] border border-black/10 dark:border-white/10 px-6 py-3 shadow-md">
          <span className="text-xs uppercase font-bold text-muted-foreground font-mono">Order ID</span>
          <span className="font-heading font-black text-xl text-primary font-mono tracking-wider">
            #{order.shortId}
          </span>
        </div>
      </div>

      {/* Visual KDS Status Progress */}
      <div className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex items-center justify-between gap-2 text-center relative">
          <div className="flex flex-col items-center gap-2 z-10 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/20">
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
            <span className="text-xs font-heading font-bold text-foreground">Received</span>
          </div>

          <div className="h-1 flex-1 bg-gradient-to-r from-primary to-amber-500 rounded-full -mt-6" />

          <div className="flex flex-col items-center gap-2 z-10 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-md shadow-amber-500/20 animate-pulse">
              <Flame className="h-5 w-5 fill-white" />
            </div>
            <span className="text-xs font-heading font-bold text-foreground">500°C Oven</span>
          </div>

          <div className="h-1 flex-1 bg-black/5 dark:bg-white/10 rounded-full -mt-6" />

          <div className="flex flex-col items-center gap-2 z-10 flex-1 opacity-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-muted-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-xs font-heading font-bold text-muted-foreground">
              {order.orderType === 'pickup' ? 'Ready for Pickup' : 'Out for Delivery'}
            </span>
          </div>
        </div>
      </div>

      {/* Order details */}
      <div className="space-y-6">
        {/* Meta info */}
        <div className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono font-bold">
              Fulfillment
            </span>
            <span className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              {orderTypeLabel}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono font-bold">
              Payment Status
            </span>
            <span className="font-heading font-bold text-base text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary shrink-0" />
              {paymentMethodLabel}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono font-bold">
              Estimated Delivery
            </span>
            <span className="font-heading font-bold text-base text-primary flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              {order.orderType === 'pickup' ? '15–20 Mins' : '25–35 Mins'}
            </span>
          </div>
        </div>

        {/* Delivery address (if delivery order) */}
        {order.orderType === 'delivery' && order.deliveryAddress && (
          <div className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/10 pb-3 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="font-heading font-extrabold text-base text-foreground">
                Delivery Destination
              </h2>
            </div>
            <p className="font-heading font-bold text-base text-foreground">{order.deliveryAddress.flat}</p>
            {order.deliveryAddress.landmark && (
              <p className="text-sm text-muted-foreground font-body">Landmark: {order.deliveryAddress.landmark}</p>
            )}
            <p className="text-sm text-muted-foreground font-body">
              {order.deliveryAddress.area}, {order.deliveryAddress.city} — <span className="font-mono">{order.deliveryAddress.pincode}</span>
            </p>
          </div>
        )}

        {/* Order items */}
        <div className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
            <h2 className="font-heading font-extrabold text-lg text-foreground">
              Order Creations
            </h2>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          
          <ul className="divide-y divide-black/5 dark:divide-white/5" role="list">
            {order.items.map((item) => {
              const customizationText = item.customizations
                .map((c) => c.optionNameSnapshot)
                .join(', ')

              return (
                <li key={item.id} className="py-4 flex justify-between items-start gap-4 text-sm first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-extrabold shrink-0">
                        {item.quantity}
                      </span>
                      <span className="line-clamp-1">{item.productNameSnapshot}</span>
                    </p>
                    {customizationText && (
                      <p className="text-xs text-muted-foreground font-body pl-8 leading-relaxed">
                        <span className="font-semibold text-foreground/70">Add-ons:</span> {customizationText}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-heading font-black text-base text-foreground">{fmt(item.totalPrice)}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Price summary */}
        <div className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="font-heading font-extrabold text-lg text-foreground border-b border-black/5 dark:border-white/10 pb-4">
            Financial Breakdown
          </h2>
          <dl className="space-y-3 text-sm font-body">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold text-foreground">{fmt(order.subtotal)}</dd>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <dt className="font-semibold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Discount Applied
                </dt>
                <dd className="font-bold">−{fmt(order.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery Charge</dt>
              <dd className={cn('font-semibold', order.deliveryFee === 0 ? 'text-green-600 dark:text-green-400' : 'text-foreground')}>
                {order.deliveryFee === 0 ? 'FREE' : fmt(order.deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Estimated Tax (GST 5%)</dt>
              <dd className="font-semibold text-foreground">{fmt(order.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 dark:border-white/10 pt-4 mt-2">
              <dt className="font-heading font-extrabold text-xl text-foreground">Total Paid</dt>
              <dd className="font-heading font-black text-2xl text-primary">{fmt(order.totalAmount)}</dd>
            </div>
          </dl>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link
            href={`/track/${trackingToken}`}
            className={cn(
              'flex-1 flex items-center justify-center gap-3 rounded-full',
              'bg-gradient-to-r from-primary to-[#C93A2F] text-white font-heading font-extrabold py-5 text-base shadow-xl shadow-primary/25',
              'hover:shadow-2xl hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            )}
          >
            <span>Track My Order Live (KDS)</span>
            <ArrowRight className="h-5 w-5" />
          </Link>

          <Link
            href="/menu"
            className={cn(
              'sm:w-48 flex items-center justify-center rounded-full',
              'border-2 border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1F] py-4 text-sm font-heading font-bold text-foreground',
              'hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5 transition-all',
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
