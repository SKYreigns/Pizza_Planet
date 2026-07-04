'use server'

// =============================================================================
// Auth Server Actions — Pizza Planet
// Authoritative server-side authentication operations.
// Source of Truth: EDR-2026-07-04-01, EDR-2026-07-04-02, ARDR §3.1
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { KITCHEN_COOKIE_NAME } from '@/lib/auth/getKitchenSession'
import { signKitchenCookie } from '@/lib/auth/kitchenCookieSigner'

// ---------------------------------------------------------------------------
// Rate Limiter for Kitchen PIN (In-memory fallback with sliding window)
// Max 5 attempts per 15 minutes
// ---------------------------------------------------------------------------
const pinAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const record = pinAttempts.get(key)
  if (!record || now > record.resetAt) {
    return true
  }
  return record.count < 5
}

function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const record = pinAttempts.get(key)
  if (!record || now > record.resetAt) {
    pinAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    record.count += 1
  }
}

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------
const PhoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format. Must be E.164 (e.g., +919999999999).')
const OtpSchema = z.string().length(6, 'OTP must be exactly 6 digits.')
const EmailSchema = z.string().email('Invalid email address.')
const PasswordSchema = z.string().min(6, 'Password must be at least 6 characters.')
const PinSchema = z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits.')

export interface AuthActionResponse {
  success: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Customer Phone Onboarding (SMS OTP)
// ---------------------------------------------------------------------------
export async function signUpWithPhone(phone: string): Promise<AuthActionResponse> {
  const parsed = PhoneSchema.safeParse(phone)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  // P1-01: Development Authentication Bypass for Test Number (+919999999999)
  if (process.env.NODE_ENV === 'development' && parsed.data === '+919999999999') {
    return { success: true }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<AuthActionResponse> {
  const phoneParsed = PhoneSchema.safeParse(phone)
  const otpParsed = OtpSchema.safeParse(otp)

  if (!phoneParsed.success) {
    return { success: false, error: phoneParsed.error.issues[0].message }
  }
  if (!otpParsed.success) {
    return { success: false, error: otpParsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // P1-01: Development Authentication Bypass for Test Number (+919999999999 / 123456)
  if (process.env.NODE_ENV === 'development' && phoneParsed.data === '+919999999999' && otpParsed.data === '123456') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'dev_customer_9999999999@pizzaplanet.in',
      password: 'customer123',
    })

    if (error || !data.user) {
      return { success: false, error: error?.message || 'Development customer account verification failed.' }
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: data.user.id,
        phone: phoneParsed.data,
        role: 'customer',
        full_name: `Customer (${phoneParsed.data.slice(-4)})`,
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.error('Failed to upsert profile during OTP verification:', profileError)
    }

    return { success: true }
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneParsed.data,
    token: otpParsed.data,
    type: 'sms',
  })

  if (error || !data.user) {
    return { success: false, error: error?.message || 'Verification failed. Please check the OTP.' }
  }

  // Ensure customer profile row exists (AUTH-CHK-03 conformance)
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: data.user.id,
      phone: phoneParsed.data,
      role: 'customer',
      full_name: `Customer (${phoneParsed.data.slice(-4)})`,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    console.error('Failed to upsert profile during OTP verification:', profileError)
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Owner & Customer Email Authentication
// ---------------------------------------------------------------------------
export async function signInWithEmail(email: string, password: string, redirectTo?: string): Promise<AuthActionResponse> {
  const emailParsed = EmailSchema.safeParse(email)
  const passwordParsed = PasswordSchema.safeParse(password)

  if (!emailParsed.success) {
    return { success: false, error: emailParsed.error.issues[0].message }
  }
  if (!passwordParsed.success) {
    return { success: false, error: passwordParsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailParsed.data,
    password: passwordParsed.data,
  })

  if (error || !data.user) {
    return { success: false, error: error?.message || 'Invalid email or password.' }
  }

  // Inspect resolved user role to route cleanly without loops (AUTH-01 / AUTH-CHK-01 fix)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const role = profile?.role || 'customer'
  const targetRoute = redirectTo || (role === 'owner' ? '/admin' : '/profile')

  redirect(targetRoute)
}

// ---------------------------------------------------------------------------
// Kitchen PIN Authentication
// ---------------------------------------------------------------------------
export async function authenticateKitchenPin(pin: string): Promise<AuthActionResponse> {
  const pinParsed = PinSchema.safeParse(pin)
  if (!pinParsed.success) {
    return { success: false, error: pinParsed.error.issues[0].message }
  }

  const headerStore = await headers()
  const clientIp = headerStore.get('x-forwarded-for') || headerStore.get('x-real-ip') || 'local_dev'
  const rateLimitKey = clientIp === 'local_dev' ? `station_${pinParsed.data}` : clientIp

  if (!checkRateLimit(rateLimitKey)) {
    return {
      success: false,
      error: 'Too many failed PIN attempts. Please wait 15 minutes before retrying.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('verify_kitchen_pin', {
    p_pin: pinParsed.data,
  })

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    recordFailedAttempt(rateLimitKey)
    return { success: false, error: 'Invalid kitchen PIN.' }
  }

  const staff = data[0] as { staff_id: string; staff_name: string }
  if (!staff.staff_id) {
    recordFailedAttempt(rateLimitKey)
    return { success: false, error: 'Invalid kitchen PIN.' }
  }

  pinAttempts.delete(rateLimitKey)

  // Set HTTP-only session cookie for wall-mounted KDS station (HMAC signed)
  const cookieStore = await cookies()
  const rawData = JSON.stringify({
    staffId: staff.staff_id,
    name: staff.staff_name,
    verifiedAt: new Date().toISOString(),
  })
  const sessionData = await signKitchenCookie(rawData)

  cookieStore.set(KITCHEN_COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12-hour shift duration
  })

  redirect('/kitchen')
}

// ---------------------------------------------------------------------------
// Sign Out
// ---------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete(KITCHEN_COOKIE_NAME)

  redirect('/')
}
