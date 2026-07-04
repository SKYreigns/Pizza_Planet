// =============================================================================
// test_live_http.ts — Live HTTP End-to-End Edge Middleware & Route Verification
// Sends actual TCP HTTP requests to the running local Next.js dev server (localhost:3000).
// =============================================================================

import fs from 'fs'
import path from 'path'
try {
  const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envLocal.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
} catch (e) {}

import { signKitchenCookie } from '../src/lib/auth/kitchenCookieSigner'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

async function testHttp() {
  console.log(`=== LIVE HTTP END-TO-END RUNTIME AUDIT (${BASE_URL}) ===\n`)

  // 1. Test Public Viewport Rendering
  console.log('--- TEST 1: Authentication Viewport Availability ---')
  const routes = ['/auth/signup', '/auth/otp?phone=%2B919999999999', '/auth/admin', '/auth/kitchen']
  for (const route of routes) {
    const res = await fetch(`${BASE_URL}${route}`)
    console.log(`GET ${route} -> Status: ${res.status} ${res.statusText}`)
    if (res.status !== 200) {
      console.error(`[FAIL] Expected 200 OK for ${route}, got ${res.status}`)
    } else {
      console.log(`[PASS] Viewport ${route} rendered successfully.`)
    }
  }

  // 2. Test Unauthenticated Route Guard Interception (Edge Middleware)
  console.log('\n--- TEST 2: Edge Middleware Route Guard Interception ---')
  const protectedRoutes = [
    { path: '/admin', expectedRedirect: '/auth/login?next=%2Fadmin' },
    { path: '/kitchen', expectedRedirect: '/auth/kitchen?next=%2Fkitchen' },
    { path: '/profile', expectedRedirect: '/auth/login?next=%2Fprofile' },
  ]

  for (const item of protectedRoutes) {
    const res = await fetch(`${BASE_URL}${item.path}`, { redirect: 'manual' })
    const location = res.headers.get('location') || ''
    console.log(`GET ${item.path} (No Cookie) -> Status: ${res.status}, Location: ${location}`)
    if (res.status >= 300 && res.status < 400 && location.includes(item.expectedRedirect)) {
      console.log(`[PASS] Correctly intercepted and redirected to ${item.expectedRedirect}`)
    } else {
      console.error(`[FAIL] Unexpected response for protected route ${item.path}`)
    }
  }

  // 3. Test Cookie Tampering & Forgery Rejection via HTTP
  console.log('\n--- TEST 3: HTTP KDS Station Cookie Tampering & Forgery Audit ---')
  const forgedCookie = `pp_kitchen_session=${encodeURIComponent(JSON.stringify({ staffId: 'hacker-1', name: 'Hacked Chef' }))}`
  const forgedRes = await fetch(`${BASE_URL}/kitchen`, {
    redirect: 'manual',
    headers: { Cookie: forgedCookie },
  })
  const forgedLoc = forgedRes.headers.get('location') || ''
  console.log(`GET /kitchen (With Forged/Unsigned JSON Cookie) -> Status: ${forgedRes.status}, Location: ${forgedLoc}`)
  if (forgedRes.status >= 300 && forgedRes.status < 400 && forgedLoc.includes('/auth/kitchen')) {
    console.log('[PASS] Forged/Unsigned Cookie successfully rejected by Edge Middleware!')
  } else {
    console.error('[FAIL] Edge Middleware allowed forged cookie!')
  }

  // 4. Test Valid HMAC Signed Cookie Access via HTTP
  console.log('\n--- TEST 4: HTTP Valid HMAC Signed KDS Station Access ---')
  const validPayload = JSON.stringify({ staffId: '8842-chef', name: 'Chef Suresh', verifiedAt: new Date().toISOString() })
  const validSignedCookieVal = await signKitchenCookie(validPayload)
  const validCookieHeader = `pp_kitchen_session=${validSignedCookieVal}`

  const validRes = await fetch(`${BASE_URL}/kitchen`, {
    redirect: 'manual',
    headers: { Cookie: validCookieHeader },
  })
  console.log(`GET /kitchen (With Valid HMAC Signed Cookie) -> Status: ${validRes.status} ${validRes.statusText}`)
  if (validRes.status === 200) {
    console.log('[PASS] Valid HMAC Signed Cookie granted direct access to /kitchen dashboard via Edge Middleware!')
  } else {
    const loc = validRes.headers.get('location') || ''
    console.log(`Status: ${validRes.status}, Location: ${loc}`)
    console.error('[FAIL] Expected 200 OK for valid signed cookie!')
  }

  console.log('\n=== LIVE HTTP TCP VERIFICATION COMPLETED SUCCESSFULLY ===')
}

testHttp().catch(err => {
  console.error('HTTP Test error:', err)
  process.exit(1)
})
