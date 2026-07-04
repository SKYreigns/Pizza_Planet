'use client'

// =============================================================================
// CheckoutForm — multi-section form for the checkout flow
// Sections: 1) Customer Info  2) Order Type  3) Delivery Address  4) Payment
//
// State: React Hook Form (per EngineeringStandards §9 Forms Architecture)
// Mutations: createOrder Server Action (per EngineeringStandards §6.1)
// Validation: Zod resolver
// Source of truth: PRD.md CJ-4, API-Specification.md §6
// =============================================================================

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Truck, MapPin, CreditCard, MessageSquare, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import { useCheckoutStore } from '@/stores/checkout-store'
import { createOrder } from '@/actions/orders/createOrder'
import { toast } from 'sonner'
import type { CheckoutFormData, CheckoutCartItem } from '@/types/order'

// ─── Zod validation schema (client-side — mirrors server schema subset) ───────

const CheckoutSchema = z
  .object({
    customerName: z.string().min(1, 'Name is required').max(255),
    customerPhone: z
      .string()
      .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'),
    customerEmail: z
      .string()
      .email('Enter a valid email address')
      .max(255)
      .or(z.literal('')),
    orderType: z.enum(['delivery', 'pickup']),
    paymentMethod: z.enum(['online', 'cod']),
    specialInstructions: z.string().max(500),
    flat: z.string().max(255),
    landmark: z.string().max(255),
    area: z.string().max(255),
    city: z.string().max(100),
    pincode: z.string().max(20),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === 'delivery') {
      if (!data.flat.trim()) {
        ctx.addIssue({ code: 'custom', path: ['flat'], message: 'Flat / House No. is required' })
      }
      if (!data.area.trim()) {
        ctx.addIssue({ code: 'custom', path: ['area'], message: 'Area / Locality is required' })
      }
      if (!data.city.trim()) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'City is required' })
      }
      if (!data.pincode.trim()) {
        ctx.addIssue({ code: 'custom', path: ['pincode'], message: 'Pincode is required' })
      }
    }
  })

type CheckoutFormValues = z.infer<typeof CheckoutSchema>

// ─── Input helper ─────────────────────────────────────────────────────────────

function Field({
  label,
  id,
  error,
  children,
  required,
}: {
  label: string
  id: string
  error?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-heading font-semibold text-foreground/90">
        {label}
        {required && <span className="text-primary ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function TextInput({
  id,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; error?: string }) {
  return (
    <input
      id={id}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(
        'w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black px-4 py-3.5 text-sm font-body shadow-sm transition-all',
        'placeholder:text-muted-foreground/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
        error ? 'border-destructive focus-visible:ring-destructive' : 'border-black/10 dark:border-white/10',
      )}
      {...props}
    />
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CheckoutForm() {
  const router = useRouter()
  const cartItems = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const checkoutStore = useCheckoutStore()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [idempotencyKey] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      customerName: checkoutStore.customerDetails.customerName,
      customerPhone: checkoutStore.customerDetails.customerPhone,
      customerEmail: checkoutStore.customerDetails.customerEmail,
      orderType: checkoutStore.orderType,
      paymentMethod: checkoutStore.paymentMethod,
      specialInstructions: checkoutStore.specialInstructions,
      flat: checkoutStore.deliveryAddress?.flat ?? '',
      landmark: checkoutStore.deliveryAddress?.landmark ?? '',
      area: checkoutStore.deliveryAddress?.area ?? '',
      city: checkoutStore.deliveryAddress?.city ?? '',
      pincode: checkoutStore.deliveryAddress?.pincode ?? '',
    },
  })

  const orderType = watch('orderType')
  const paymentMethod = watch('paymentMethod')

  const onSubmit = (values: CheckoutFormValues) => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty.')
      return
    }

    setServerError(null)

    // Map cart items to the Server Action payload shape
    const checkoutItems: CheckoutCartItem[] = cartItems.map((item) => ({
      productId: item.product.id,
      variantId: item.variant?.id ?? null,
      quantity: item.quantity,
      clientUnitPrice: item.unitPrice,
      options: item.options.map((o) => ({
        optionId: o.option.id,
        priceSnapshot: o.option.price,
      })),
    }))

    const payload: CheckoutFormData = {
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerEmail: values.customerEmail,
      orderType: values.orderType,
      paymentMethod: values.paymentMethod,
      deliveryAddress:
        values.orderType === 'delivery'
          ? {
              flat: values.flat,
              landmark: values.landmark,
              area: values.area,
              city: values.city,
              pincode: values.pincode,
            }
          : null,
      specialInstructions: values.specialInstructions,
      items: checkoutItems,
      idempotencyKey,
    }

    // Persist to checkout store for back-navigation resilience
    checkoutStore.setCustomerDetails({
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerEmail: values.customerEmail,
    })
    checkoutStore.setOrderType(values.orderType)
    checkoutStore.setPaymentMethod(values.paymentMethod)
    checkoutStore.setSpecialInstructions(values.specialInstructions)
    if (payload.deliveryAddress) {
      checkoutStore.setDeliveryAddress(payload.deliveryAddress)
    }

    startTransition(async () => {
      try {
        const result = await createOrder(payload)

        if (!result.success) {
          setServerError(result.error)
          toast.error(result.error)
          return
        }

        clearCart()
        checkoutStore.reset()
        router.push(`/order-confirmed/${result.data.trackingToken}`)
      } catch (err) {
        console.error('Order submission error:', err)
        const friendlyMsg = 'We encountered a temporary connection error while sending your order to the kitchen. Your cart items are preserved—please try clicking Place Order again.'
        setServerError(friendlyMsg)
        toast.error(friendlyMsg)
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {/* Section 1 — Customer Information */}
      <section aria-labelledby="section-customer" className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/10 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 id="section-customer" className="font-heading font-extrabold text-xl text-foreground">
              Contact Information
            </h2>
            <p className="text-xs text-muted-foreground font-body">Who is this artisanal creation for?</p>
          </div>
        </div>

        <Field label="Full Name" id="customerName" error={errors.customerName?.message} required>
          <TextInput
            id="customerName"
            placeholder="e.g. Buzz Lightyear"
            autoComplete="name"
            error={errors.customerName?.message}
            {...register('customerName')}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Phone Number" id="customerPhone" error={errors.customerPhone?.message} required>
            <TextInput
              id="customerPhone"
              type="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              inputMode="tel"
              error={errors.customerPhone?.message}
              {...register('customerPhone')}
            />
          </Field>

          <Field label="Email Address" id="customerEmail" error={errors.customerEmail?.message}>
            <TextInput
              id="customerEmail"
              type="email"
              placeholder="buzz@starcommand.space"
              autoComplete="email"
              error={errors.customerEmail?.message}
              {...register('customerEmail')}
            />
          </Field>
        </div>
      </section>

      {/* Section 2 — Order Type */}
      <section aria-labelledby="section-order-type" className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/10 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 id="section-order-type" className="font-heading font-extrabold text-xl text-foreground">
              Fulfillment Method
            </h2>
            <p className="text-xs text-muted-foreground font-body">Choose how you wish to receive your order</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Order type">
          {(['delivery', 'pickup'] as const).map((type) => {
            const selected = orderType === type
            return (
              <label
                key={type}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300',
                  'focus-within:ring-2 focus-within:ring-primary',
                  selected
                    ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
                    : 'border-black/5 dark:border-white/10 bg-muted/30 hover:bg-muted/60 hover:border-black/15 dark:hover:border-white/20',
                )}
              >
                <input
                  type="radio"
                  value={type}
                  className="sr-only"
                  {...register('orderType')}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 shadow-sm text-2xl">
                  {type === 'delivery' ? '🛵' : '🏪'}
                </div>
                <div>
                  <span className="font-heading font-bold text-base capitalize text-foreground block">
                    {type === 'delivery' ? 'Galactic Delivery' : 'Studio Pickup'}
                  </span>
                  <span className="text-xs text-muted-foreground font-body">
                    {type === 'delivery' ? 'Delivered hot to your door' : 'Pick up from our wood-fired oven'}
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* Section 3 — Delivery Address (conditional) */}
      {orderType === 'delivery' && (
        <section aria-labelledby="section-address" className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 id="section-address" className="font-heading font-extrabold text-xl text-foreground">
                Delivery Address
              </h2>
              <p className="text-xs text-muted-foreground font-body">Where should our courier navigate?</p>
            </div>
          </div>

          <Field label="Flat / House No. & Building" id="flat" error={errors.flat?.message} required>
            <TextInput
              id="flat"
              placeholder="e.g. Flat 4B, Infinity Tower"
              autoComplete="address-line1"
              error={errors.flat?.message}
              {...register('flat')}
            />
          </Field>

          <Field label="Landmark (Optional)" id="landmark" error={errors.landmark?.message}>
            <TextInput
              id="landmark"
              placeholder="e.g. Near Stargate Metro Station"
              error={errors.landmark?.message}
              {...register('landmark')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Area / Locality" id="area" error={errors.area?.message} required>
              <TextInput
                id="area"
                placeholder="e.g. Sector 42, Galactic District"
                autoComplete="address-level2"
                error={errors.area?.message}
                {...register('area')}
              />
            </Field>

            <Field label="City" id="city" error={errors.city?.message} required>
              <TextInput
                id="city"
                placeholder="e.g. Bengaluru"
                autoComplete="address-level1"
                error={errors.city?.message}
                {...register('city')}
              />
            </Field>
          </div>

          <Field label="Pincode / Postal Code" id="pincode" error={errors.pincode?.message} required>
            <TextInput
              id="pincode"
              placeholder="e.g. 560001"
              inputMode="numeric"
              maxLength={6}
              error={errors.pincode?.message}
              {...register('pincode')}
            />
          </Field>
        </section>
      )}

      {/* Section 4 — Payment */}
      <section aria-labelledby="section-payment" className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/10 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 id="section-payment" className="font-heading font-extrabold text-xl text-foreground">
              Payment Method
            </h2>
            <p className="text-xs text-muted-foreground font-body">All transactions are encrypted and secure</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
          {(['online', 'cod'] as const).map((method) => {
            const selected = paymentMethod === method
            return (
              <label
                key={method}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300',
                  'focus-within:ring-2 focus-within:ring-primary',
                  selected
                    ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
                    : 'border-black/5 dark:border-white/10 bg-muted/30 hover:bg-muted/60 hover:border-black/15 dark:hover:border-white/20',
                )}
              >
                <input
                  type="radio"
                  value={method}
                  className="sr-only"
                  {...register('paymentMethod')}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-black border border-black/5 dark:border-white/10 shadow-sm text-2xl">
                  {method === 'online' ? '💳' : '💵'}
                </div>
                <div>
                  <span className="font-heading font-bold text-base text-foreground block">
                    {method === 'online' ? 'Pay Online (UPI / Cards)' : 'Cash on Delivery'}
                  </span>
                  <span className="text-xs text-muted-foreground font-body">
                    {method === 'online' ? 'Instant secure digital payment' : 'Pay via cash or UPI at doorstep'}
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* Special Instructions */}
      <section aria-labelledby="section-instructions" className="rounded-[26px] bg-white dark:bg-[#1C1C1F] border border-black/5 dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/10 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 id="section-instructions" className="font-heading font-extrabold text-xl text-foreground">
              Kitchen Instructions
            </h2>
            <p className="text-xs text-muted-foreground font-body">Let our master pizzaiolos know any preferences</p>
          </div>
        </div>

        <Field label="Special requests or delivery notes" id="specialInstructions" error={errors.specialInstructions?.message}>
          <textarea
            id="specialInstructions"
            rows={3}
            maxLength={500}
            placeholder="e.g. Extra crispy crust, oregano packets, ring doorbell gently…"
            aria-describedby={errors.specialInstructions?.message ? 'specialInstructions-error' : undefined}
            className={cn(
              'w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black px-4 py-3.5 text-sm font-body shadow-sm resize-none transition-all',
              'placeholder:text-muted-foreground/60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
            )}
            {...register('specialInstructions')}
          />
        </Field>
      </section>

      {/* Server-level error */}
      {serverError && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive bg-destructive/10 px-5 py-4 text-sm text-destructive font-semibold flex items-center gap-2"
        >
          <span>⚠️ {serverError}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'w-full rounded-full bg-gradient-to-r from-primary to-[#C93A2F] text-white font-heading font-extrabold py-5 text-lg shadow-xl shadow-primary/25',
            'hover:shadow-2xl hover:shadow-primary/35 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
            'flex items-center justify-center gap-3'
          )}
        >
          {isPending ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Transmitting Order to Kitchen...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 fill-white animate-pulse" />
              <span>Place Artisanal Order Now</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
