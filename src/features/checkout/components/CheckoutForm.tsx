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
        ctx.addIssue({ code: 'custom', path: ['area'], message: 'Area is required' })
      }
      if (!data.city.trim()) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'City is required' })
      }
      if (!/^[1-9][0-9]{5}$/.test(data.pincode)) {
        ctx.addIssue({ code: 'custom', path: ['pincode'], message: 'Enter a valid 6-digit pincode' })
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
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
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
        'w-full rounded-xl border bg-card px-4 py-3 text-sm',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        error ? 'border-destructive' : 'border-input',
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
      const result = await createOrder(payload)

      if (!result.success) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }

      clearCart()
      checkoutStore.reset()
      router.push(`/order-confirmed/${result.data.trackingToken}`)
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {/* Section 1 — Customer Information */}
      <section aria-labelledby="section-customer" className="liquid-glass-surface rounded-2xl p-6 space-y-5">
        <h2 id="section-customer" className="font-bold text-lg">Contact Information</h2>

        <Field label="Full Name" id="customerName" error={errors.customerName?.message} required>
          <TextInput
            id="customerName"
            placeholder="Buzz Lightyear"
            autoComplete="name"
            error={errors.customerName?.message}
            {...register('customerName')}
          />
        </Field>

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
            placeholder="buzz@starcommand.space (optional)"
            autoComplete="email"
            error={errors.customerEmail?.message}
            {...register('customerEmail')}
          />
        </Field>
      </section>

      {/* Section 2 — Order Type */}
      <section aria-labelledby="section-order-type" className="liquid-glass-surface rounded-2xl p-6 space-y-5">
        <h2 id="section-order-type" className="font-bold text-lg">Order Type</h2>

        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Order type">
          {(['delivery', 'pickup'] as const).map((type) => {
            const selected = orderType === type
            return (
              <label
                key={type}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-xl border p-4 cursor-pointer transition-all',
                  'focus-within:ring-2 focus-within:ring-primary',
                  selected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-input bg-card hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  value={type}
                  className="sr-only"
                  {...register('orderType')}
                />
                <span className="text-2xl" aria-hidden="true">
                  {type === 'delivery' ? '🛵' : '🏠'}
                </span>
                <span className="font-semibold capitalize text-sm">{type}</span>
              </label>
            )
          })}
        </div>
      </section>

      {/* Section 3 — Delivery Address (conditional) */}
      {orderType === 'delivery' && (
        <section aria-labelledby="section-address" className="liquid-glass-surface rounded-2xl p-6 space-y-5">
          <h2 id="section-address" className="font-bold text-lg">Delivery Address</h2>

          <Field label="Flat / House No." id="flat" error={errors.flat?.message} required>
            <TextInput
              id="flat"
              placeholder="Flat 4B, Infinity Tower"
              autoComplete="address-line1"
              error={errors.flat?.message}
              {...register('flat')}
            />
          </Field>

          <Field label="Landmark" id="landmark" error={errors.landmark?.message}>
            <TextInput
              id="landmark"
              placeholder="Near Stargate Metro"
              error={errors.landmark?.message}
              {...register('landmark')}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Area / Locality" id="area" error={errors.area?.message} required>
              <TextInput
                id="area"
                placeholder="Sector 7"
                autoComplete="address-level2"
                error={errors.area?.message}
                {...register('area')}
              />
            </Field>

            <Field label="City" id="city" error={errors.city?.message} required>
              <TextInput
                id="city"
                placeholder="Cosmos City"
                autoComplete="address-level1"
                error={errors.city?.message}
                {...register('city')}
              />
            </Field>
          </div>

          <Field label="Pincode" id="pincode" error={errors.pincode?.message} required>
            <TextInput
              id="pincode"
              placeholder="400001"
              inputMode="numeric"
              maxLength={6}
              error={errors.pincode?.message}
              {...register('pincode')}
            />
          </Field>
        </section>
      )}

      {/* Section 4 — Payment */}
      <section aria-labelledby="section-payment" className="liquid-glass-surface rounded-2xl p-6 space-y-5">
        <h2 id="section-payment" className="font-bold text-lg">Payment Method</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
          {(['online', 'cod'] as const).map((method) => {
            const selected = paymentMethod === method
            return (
              <label
                key={method}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all',
                  'focus-within:ring-2 focus-within:ring-primary',
                  selected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-input bg-card hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  value={method}
                  className="sr-only"
                  {...register('paymentMethod')}
                />
                <span className="text-2xl" aria-hidden="true">
                  {method === 'online' ? '📱' : '💵'}
                </span>
                <div>
                  <p className="font-semibold text-sm">
                    {method === 'online' ? 'Pay Online' : 'Cash on Delivery'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {method === 'online' ? 'UPI, Cards, Wallets' : 'Pay when your order arrives'}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      {/* Special Instructions */}
      <section aria-labelledby="section-instructions" className="liquid-glass-surface rounded-2xl p-6 space-y-5">
        <h2 id="section-instructions" className="font-bold text-lg">Special Instructions</h2>
        <Field label="Any notes for the kitchen?" id="specialInstructions" error={errors.specialInstructions?.message}>
          <textarea
            id="specialInstructions"
            rows={3}
            maxLength={500}
            placeholder="Extra spicy, no onions, ring the doorbell…"
            aria-describedby={errors.specialInstructions?.message ? 'specialInstructions-error' : undefined}
            className={cn(
              'w-full rounded-xl border border-input bg-card px-4 py-3 text-sm resize-none',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
            {...register('specialInstructions')}
          />
        </Field>
      </section>

      {/* Server-level error */}
      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'w-full rounded-xl bg-primary text-primary-foreground font-bold py-4 text-base',
          'hover:bg-primary/90 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {isPending ? 'Placing Order…' : 'Place Order'}
      </button>
    </form>
  )
}
