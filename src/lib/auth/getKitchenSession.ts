// =============================================================================
// getKitchenSession — Pizza Planet
// Reads and validates the HTTP-only kitchen station PIN cookie.
// Source of Truth: EDR-2026-07-04-01 / ARDR §2 & §3.1
// =============================================================================

import { cookies } from 'next/headers'
import type { AuthenticatedUser, AuthResult } from '@/types/auth'

export interface KitchenSessionData {
  staffId: string
  name: string
  verifiedAt: string
}

export const KITCHEN_COOKIE_NAME = 'pp_kitchen_session'

/**
 * Retrieves the kitchen station user from the `pp_kitchen_session` HTTP-only cookie.
 * Wall-mounted KDS tablets use this cookie rather than global Supabase consumer sessions.
 */
export async function getKitchenSession(): Promise<AuthResult<AuthenticatedUser>> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(KITCHEN_COOKIE_NAME)

  if (!cookie?.value) {
    return {
      success: false,
      error: { code: 'NO_SESSION', message: 'No active kitchen PIN session.' },
    }
  }

  try {
    const data = JSON.parse(cookie.value) as KitchenSessionData
    if (!data.staffId || !data.name) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid kitchen session data.' },
      }
    }

    return {
      success: true,
      data: {
        id: data.staffId,
        email: `station-${data.staffId}@kitchen.internal`,
        role: 'kitchen',
        profile: {
          id: data.staffId,
          role: 'kitchen',
          full_name: `${data.name} (KDS Station)`,
          phone: '',
          avatar_url: null,
          created_at: data.verifiedAt || new Date().toISOString(),
          updated_at: data.verifiedAt || new Date().toISOString(),
        },
      },
    }
  } catch {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Corrupt kitchen session cookie.' },
    }
  }
}
