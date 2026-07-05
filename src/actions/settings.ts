'use server'

import { createClient } from '@/lib/supabase/server'
import type { StoreSettings, StoreSettingsResponse } from '@/types/settings'

/**
 * Fetches the global store settings from the singleton store_settings table.
 * Publicly accessible without authentication per RLS policy.
 */
export async function getStoreSettings(): Promise<StoreSettingsResponse> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error || !data) {
      return {
        success: false,
        error: error?.message ?? 'Store settings singleton not found.',
      }
    }

    return {
      success: true,
      data: data as StoreSettings,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Owner-only Server Action to toggle store operating status.
 */
export async function updateStoreStatus(isOpen: boolean): Promise<StoreSettingsResponse> {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: User not signed in.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'owner') {
      return { success: false, error: 'Forbidden: Only owners can update store status.' }
    }

    const { data, error } = await supabase
      .from('store_settings')
      .update({ is_open: isOpen, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single()

    if (error || !data) {
      return { success: false, error: error?.message ?? 'Failed to update store status.' }
    }

    return { success: true, data: data as StoreSettings }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return { success: false, error: message }
  }
}
