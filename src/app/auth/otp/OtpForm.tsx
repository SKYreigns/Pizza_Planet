'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { verifyPhoneOtp, signUpWithPhone } from '@/actions/auth'

interface OtpFormProps {
  phone: string
  next?: string
}

export default function OtpForm({ phone, next }: OtpFormProps) {
  const router = useRouter()
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setResendSuccess(false)

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code.')
      return
    }

    setIsLoading(true)

    try {
      const result = await verifyPhoneOtp(phone, otp)
      if (!result.success) {
        setError(result.error || 'Invalid OTP code. Please try again.')
        setIsLoading(false)
        return
      }

      router.push(next || '/profile')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setResendSuccess(false)
    setIsResending(true)

    try {
      const result = await signUpWithPhone(phone)
      if (!result.success) {
        setError(result.error || 'Failed to resend OTP.')
      } else {
        setResendSuccess(true)
      }
    } catch {
      setError('Failed to resend code.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      aria-label="OTP Verification Form"
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

      {resendSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-3 text-sm"
        >
          A new verification code has been sent to your mobile number.
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="otp-input"
          className="block text-sm font-medium text-foreground"
        >
          6-Digit Verification Code
        </label>
        <input
          id="otp-input"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-3xl font-bold tracking-[0.5em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
          placeholder="••••••"
          aria-required="true"
          disabled={isLoading}
        />
      </div>

      {process.env.NODE_ENV === 'development' && phone === '+919999999999' && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
          <strong className="font-semibold text-foreground">Dev Test Code:</strong> Enter <code className="bg-muted px-1 rounded font-bold">123456</code> to verify immediately.
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || otp.length !== 6}
        className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 text-base hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        aria-busy={isLoading}
      >
        {isLoading ? 'Verifying Code…' : 'Verify & Continue'}
      </button>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => router.push('/auth/signup')}
          className="hover:text-foreground underline transition-colors"
          disabled={isLoading || isResending}
        >
          Change number
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isLoading || isResending}
          className="hover:text-foreground underline transition-colors disabled:opacity-50"
        >
          {isResending ? 'Resending…' : 'Resend SMS code'}
        </button>
      </div>
    </form>
  )
}
