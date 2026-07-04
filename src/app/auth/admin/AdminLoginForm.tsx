'use client'

import { useState, type FormEvent } from 'react'
import { signInWithEmail } from '@/actions/auth'

interface AdminLoginFormProps {
  next?: string
}

export default function AdminLoginForm({ next }: AdminLoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signInWithEmail(email.trim(), password, next || '/admin')
      if (!result.success) {
        setError(result.error || 'Sign in failed. Please check your admin credentials.')
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
      aria-label="Owner sign-in form"
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
          htmlFor="admin-email"
          className="block text-sm font-medium text-foreground"
        >
          Owner Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
          placeholder="owner@pizzaplanet.in"
          aria-required="true"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="admin-password"
          className="block text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
          placeholder="••••••••"
          aria-required="true"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-primary text-primary-foreground font-semibold py-3 text-base hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        aria-busy={isLoading}
      >
        {isLoading ? 'Authenticating Owner…' : 'Access Admin Dashboard'}
      </button>
    </form>
  )
}
