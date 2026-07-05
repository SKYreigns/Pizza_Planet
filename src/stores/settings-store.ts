import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { StoreSettings } from '@/types/settings'

interface SettingsState {
  settings: StoreSettings | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  initialize: () => void
  setSettings: (settings: StoreSettings) => void
}

let subscriptionInitialized = false

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  setSettings: (settings: StoreSettings) => {
    set({ settings, isLoading: false, error: null, isInitialized: true })
  },

  initialize: () => {
    if (subscriptionInitialized || get().isInitialized) return
    subscriptionInitialized = true

    set({ isLoading: true })
    const supabase = createClient()

    // 1. Fetch initial settings
    supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          set({
            error: error?.message ?? 'Failed to load store settings',
            isLoading: false,
            isInitialized: true,
          })
        } else {
          set({
            settings: data as StoreSettings,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        }
      })

    // 2. Subscribe to realtime changes on store_settings
    supabase
      .channel('public:store_settings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'store_settings',
          filter: 'id=eq.1',
        },
        (payload) => {
          if (payload.new) {
            set({
              settings: payload.new as StoreSettings,
              isLoading: false,
              error: null,
              isInitialized: true,
            })
          }
        },
      )
      .subscribe()
  },
}))
