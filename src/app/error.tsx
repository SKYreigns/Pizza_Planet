'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log detailed errors only to console or monitoring tools, never expose raw errors to customers
    console.error('=== PIZZA PLANET GLOBAL ERROR BOUNDARY ===', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive mb-6 shadow-md">
        <AlertTriangle className="h-10 w-10 stroke-[2]" />
      </div>

      <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono mb-2">
        System Transmission Glitch
      </span>
      <h1 className="font-heading font-black text-3xl sm:text-4xl tracking-tight mb-4 max-w-lg">
        We encountered a temporary connection snag
      </h1>
      <p className="text-muted-foreground font-body text-base max-w-md mb-8 leading-relaxed">
        Don&apos;t worry—your cart contents and session details are safely preserved on your device. Please try refreshing or returning to the homepage.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-xs sm:max-w-md justify-center">
        <button
          onClick={reset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-[#C93A2F] text-white font-heading font-bold px-8 py-4 text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw className="h-4 w-4 animate-spin-hover" />
          <span>Try Again</span>
        </button>
        
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1F] px-8 py-4 text-sm font-heading font-bold text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Home className="h-4 w-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  )
}
