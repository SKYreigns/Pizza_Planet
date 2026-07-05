'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'

export function StoreClosedBanner() {
  const { settings, initialize, isInitialized } = useSettingsStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!isInitialized || !settings || settings.is_open) {
    return null
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="store-closed-banner"
      className="w-full bg-gradient-to-r from-amber-600 via-destructive to-[#C93A2F] text-white px-4 py-3 shadow-md z-50 transition-all duration-300 animate-in fade-in slide-in-from-top"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2.5 font-heading font-bold text-sm sm:text-base">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse text-amber-200" />
          <span>⚠️ Ordering Temporarily Closed</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm font-body font-medium opacity-95">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            {settings.store_name} kitchen is currently offline. You may browse our catalog, but online checkout is temporarily disabled.
          </span>
        </div>
      </div>
    </div>
  )
}
