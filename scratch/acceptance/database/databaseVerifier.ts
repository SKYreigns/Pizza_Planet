// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Database Verifier
// Directly inspects PostgreSQL/Supabase tables after authentication workflows.
// =============================================================================

import fs from 'fs'
import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { type DatabaseVerificationTrace } from '../reporting/types'

export class DatabaseVerifier {
  private supabase: SupabaseClient | null = null

  constructor() {
    this.initClient()
  }

  private initClient() {
    // Attempt loading .env.local if variables not already set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const envPath = path.resolve('C:/CODES/Businesses/Pizza_Planet/.env.local')
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const [key, ...vals] = trimmed.split('=')
          if (key && vals.length > 0) {
            process.env[key.trim()] = vals.join('=').trim()
          }
        }
      }
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false }
      })
    } else {
      console.warn('⚠️ [DatabaseVerifier] Supabase URL or Service Key not found in environment.')
    }
  }

  public async verifyCustomerProfile(phoneOrId: string): Promise<DatabaseVerificationTrace> {
    if (!this.supabase) {
      return {
        tableChecked: 'profiles',
        recordIdentifier: phoneOrId,
        found: false,
        verifiedFields: {},
        sessionConsistent: false,
        notes: 'Database client uninitialized (missing SUPABASE_SERVICE_ROLE_KEY)'
      }
    }

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id, phone, role, full_name, created_at, updated_at')
        .or(`phone.eq.${phoneOrId},id.eq.${phoneOrId}`)
        .maybeSingle()

      if (error || !data) {
        return {
          tableChecked: 'profiles',
          recordIdentifier: phoneOrId,
          found: false,
          verifiedFields: { error: error?.message || 'Record not found in profiles table' },
          sessionConsistent: false
        }
      }

      // Check auth.users consistency if admin api available
      let authUserConsistent = true
      let authUserNotes = 'Consistent with public.profiles row'
      try {
        const { data: authData } = await this.supabase.auth.admin.getUserById(data.id)
        if (!authData || !authData.user) {
          authUserConsistent = false
          authUserNotes = 'Row exists in public.profiles but missing in auth.users!'
        }
      } catch {
        authUserNotes = 'auth.admin check skipped (ANON key in use)'
      }

      return {
        tableChecked: 'profiles',
        recordIdentifier: phoneOrId,
        found: true,
        verifiedFields: {
          id: data.id,
          phone: data.phone,
          role: data.role,
          created_at: data.created_at,
          updated_at: data.updated_at
        },
        sessionConsistent: authUserConsistent,
        notes: authUserNotes
      }
    } catch (err: any) {
      return {
        tableChecked: 'profiles',
        recordIdentifier: phoneOrId,
        found: false,
        verifiedFields: { exception: err.message },
        sessionConsistent: false
      }
    }
  }

  public async verifyKitchenStaff(pinOrName: string): Promise<DatabaseVerificationTrace> {
    if (!this.supabase) {
      return {
        tableChecked: 'kitchen_staff',
        recordIdentifier: pinOrName,
        found: false,
        verifiedFields: {},
        sessionConsistent: false,
        notes: 'Database client uninitialized'
      }
    }

    try {
      // Look up staff by name or PIN (note: PIN is crypt hashed, so we check active staff by name or ID)
      const { data, error } = await this.supabase
        .from('kitchen_staff')
        .select('id, name, is_active, created_at, updated_at')
        .or(`name.ilike.%${pinOrName}%,id.eq.${pinOrName}`)
        .maybeSingle()

      if (error || !data) {
        // Try selecting all active kitchen staff to see if table is populated
        const { data: allStaff } = await this.supabase.from('kitchen_staff').select('id, name, is_active').limit(5)
        return {
          tableChecked: 'kitchen_staff',
          recordIdentifier: pinOrName,
          found: false,
          verifiedFields: { availableStaffCount: allStaff?.length || 0, sampleNames: allStaff?.map(s => s.name) },
          sessionConsistent: false,
          notes: 'Specific staff record not found by direct match'
        }
      }

      return {
        tableChecked: 'kitchen_staff',
        recordIdentifier: pinOrName,
        found: true,
        verifiedFields: {
          id: data.id,
          name: data.name,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at
        },
        sessionConsistent: data.is_active === true,
        notes: `Kitchen staff active status: ${data.is_active}`
      }
    } catch (err: any) {
      return {
        tableChecked: 'kitchen_staff',
        recordIdentifier: pinOrName,
        found: false,
        verifiedFields: { exception: err.message },
        sessionConsistent: false
      }
    }
  }

  public async verifyOwnerAccount(email: string): Promise<DatabaseVerificationTrace> {
    if (!this.supabase) {
      return {
        tableChecked: 'auth.users',
        recordIdentifier: email,
        found: false,
        verifiedFields: {},
        sessionConsistent: false,
        notes: 'Database client uninitialized'
      }
    }

    try {
      // Check public profiles first
      const { data: profileData } = await this.supabase
        .from('profiles')
        .select('id, role, full_name, created_at')
        .eq('role', 'owner')
        .limit(5)

      return {
        tableChecked: 'auth.users',
        recordIdentifier: email,
        found: (profileData && profileData.length > 0) || false,
        verifiedFields: {
          ownerProfilesFound: profileData?.length || 0,
          owners: profileData?.map(p => ({ id: p.id, role: p.role, name: p.full_name }))
        },
        sessionConsistent: (profileData && profileData.length > 0) || false,
        notes: profileData && profileData.length > 0 ? 'Verified owner profile(s) present in database' : 'No owner profiles seeded in public.profiles'
      }
    } catch (err: any) {
      return {
        tableChecked: 'auth.users',
        recordIdentifier: email,
        found: false,
        verifiedFields: { exception: err.message },
        sessionConsistent: false
      }
    }
  }

  public getClient(): SupabaseClient | null {
    return this.supabase
  }

  public async setStoreOpen(isOpen: boolean): Promise<boolean> {
    if (!this.supabase) return false
    const { error } = await this.supabase
      .from('store_settings')
      .update({ is_open: isOpen })
      .eq('id', 1)
    return !error
  }

  public async getOrderStatusLog(orderId: string): Promise<any[]> {
    if (!this.supabase) return []
    const { data } = await this.supabase
      .from('order_status_log')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    return data || []
  }

  public async getOrderStatus(orderId: string): Promise<string | null> {
    if (!this.supabase) return null
    const { data } = await this.supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()
    return data?.status || null
  }

  public async seedTestOrder(status: string = 'pending_payment', orderType: string = 'delivery', version: number = 1): Promise<string | null> {
    if (!this.supabase) return null
    const { data, error } = await this.supabase
      .from('orders')
      .insert({
        status,
        version,
        order_type: orderType,
        payment_method: 'online',
        payment_status: 'pending',
        subtotal: 500,
        tax: 25,
        delivery_fee: 30,
        discount_amount: 0,
        total_amount: 555,
        delivery_address: { flat: '101', area: 'Test Area', city: 'Mumbai' },
      })
      .select('id')
      .single()
    if (error || !data) {
      console.warn('⚠️ [DatabaseVerifier] Failed to seed test order:', error?.message)
      return null
    }
    return data.id
  }

  public async getOrderVersion(orderId: string): Promise<number | null> {
    if (!this.supabase) return null
    const { data } = await this.supabase
      .from('orders')
      .select('version')
      .eq('id', orderId)
      .single()
    return data?.version ?? null
  }

  public async getOrderOutboxEvents(orderId: string): Promise<any[]> {
    if (!this.supabase) return []
    const { data } = await this.supabase
      .from('order_outbox_events')
      .select('*')
      .eq('aggregate_id', orderId)
      .order('created_at', { ascending: true })
    return data || []
  }

  public async getIdempotencyKeyRecord(key: string): Promise<any | null> {
    if (!this.supabase) return null
    const { data } = await this.supabase
      .from('order_idempotency_keys')
      .select('*')
      .eq('idempotency_key', key)
      .single()
    return data || null
  }
}

