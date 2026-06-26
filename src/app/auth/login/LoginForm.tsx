'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LoginFormProps {
  /** If present, redirect here after successful login */
  next?: string
}

export default function LoginForm({ next }: LoginFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : authError.message,
      )
      setIsLoading(false)
      return
    }

    router.push(next ?? '/admin')
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      aria-label="Admin sign-in form"
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
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          Email address
        </label>
        <input
          id="email"
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
          htmlFor="password"
          className="block text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="password"
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
        {isLoading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
