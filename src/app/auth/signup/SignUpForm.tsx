'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signUpWithPhone } from '@/actions/auth'

interface SignUpFormProps {
  next?: string
}

export default function SignUpForm({ next }: SignUpFormProps) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Normalize phone number (default to +91 if 10 digits entered without prefix)
    let normalizedPhone = phone.trim()
    if (/^\d{10}$/.test(normalizedPhone)) {
      normalizedPhone = `+91${normalizedPhone}`
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = `+${normalizedPhone}`
    }

    try {
      const result = await signUpWithPhone(normalizedPhone)
      if (!result.success) {
        setError(result.error || 'Failed to send verification OTP. Please try again.')
        setIsLoading(false)
        return
      }

      const nextParam = next ? `&next=${encodeURIComponent(next)}` : ''
      router.push(`/auth/otp?phone=${encodeURIComponent(normalizedPhone)}${nextParam}`)
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      aria-label="Customer Phone Onboarding Form"
      noValidate
    >
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="phone-input"
          className="block text-sm font-medium text-foreground"
        >
          Mobile Number
        </label>
        <input
          id="phone-input"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
          placeholder="+91 99999 99999"
          aria-required="true"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground pt-1">
          We will send a 6-digit SMS verification code to your phone.
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">Dev Test Pair:</strong> Use <code className="bg-muted px-1 rounded">+919999999999</code> to test instantly with OTP <code className="bg-muted px-1 rounded">123456</code>.
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !phone.trim()}
        className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 text-base hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        aria-busy={isLoading}
      >
        {isLoading ? 'Sending Code…' : 'Send SMS Code'}
      </button>
    </form>
  )
}
