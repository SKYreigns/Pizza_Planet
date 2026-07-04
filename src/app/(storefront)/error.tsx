'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react'

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log detailed errors only to console/monitoring, keeping customer UI clean
    console.error('=== STOREFRONT ERROR BOUNDARY ===', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-lg mx-auto space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xl">
        <AlertCircle className="h-10 w-10 stroke-[2]" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
          Kitchen Signal Interruption
        </span>
        <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground tracking-tight">
          We hit a minor culinary bump
        </h2>
        <p className="text-muted-foreground font-body leading-relaxed text-sm sm:text-base">
          Our servers encountered a temporary hiccup while communicating with the oven. Rest assured, your artisanal cart selections remain safely saved.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center pt-2">
        <button
          onClick={reset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-[#C93A2F] text-white font-heading font-bold px-8 py-4 text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry Action</span>
        </button>

        <Link
          href="/menu"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1F] px-8 py-4 text-sm font-heading font-bold text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Back to Menu</span>
        </Link>
      </div>
    </div>
  )
}
