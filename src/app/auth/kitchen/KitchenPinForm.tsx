'use client'

import { useState, type FormEvent } from 'react'
import { authenticateKitchenPin } from '@/actions/auth'

const VALID_PIN_PATTERN = /^\d{4,6}$/

export default function KitchenPinForm() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!VALID_PIN_PATTERN.test(pin)) {
      setError('PIN must be 4–6 digits.')
      return
    }

    setIsLoading(true)

    try {
      const result = await authenticateKitchenPin(pin)
      if (!result.success) {
        setError(result.error || 'Invalid PIN. Please try again.')
        setIsLoading(false)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
        return
      }
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      aria-label="Kitchen PIN entry"
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
          htmlFor="pin"
          className="block text-sm font-medium text-foreground"
        >
          Kitchen PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-3xl font-bold tracking-[0.5em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
          placeholder="••••"
          aria-required="true"
          aria-describedby="pin-hint"
          disabled={isLoading}
        />
        <p id="pin-hint" className="text-xs text-muted-foreground">
          Enter your 4–6 digit kitchen PIN.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || pin.length < 4}
        className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 text-base hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        aria-busy={isLoading}
      >
        {isLoading ? 'Verifying…' : 'Enter Kitchen'}
      </button>
    </form>
  )
}
