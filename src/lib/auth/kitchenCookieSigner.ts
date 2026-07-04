// =============================================================================
// kitchenCookieSigner — Pizza Planet
// Cryptographic HMAC-SHA256 signing and verification for KDS station cookies.
// Compatible with both Node.js and Next.js Edge Runtime (Web Crypto API).
// Source of Truth: EDR-2026-07-04-01 / Production Verification Audit
// =============================================================================

function getSecretKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'default-dev-secret-key-do-not-use-in-prod-8842'
  )
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecretKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return buffer
}

/**
 * Signs a payload string using HMAC-SHA256 and returns `payload.signature`.
 */
export async function signKitchenCookie(payload: string): Promise<string> {
  const key = await getCryptoKey()
  const enc = new TextEncoder()
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const signature = bufferToBase64Url(sigBuffer)
  return `${payload}.${signature}`
}

/**
 * Verifies a signed cookie (`payload.signature`).
 * Returns the verified payload string or null if signature is invalid/tampered.
 */
export async function verifyKitchenCookie(signedValue: string): Promise<string | null> {
  if (!signedValue) return null
  const decodedValue = signedValue.includes('%') ? decodeURIComponent(signedValue) : signedValue
  if (!decodedValue.includes('.')) return null

  const lastDotIdx = decodedValue.lastIndexOf('.')
  const payload = decodedValue.substring(0, lastDotIdx)
  const signature = decodedValue.substring(lastDotIdx + 1)

  if (!payload || !signature) return null

  try {
    const key = await getCryptoKey()
    const enc = new TextEncoder()
    const sigBytes = base64UrlToBuffer(signature)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(payload)
    )

    return isValid ? payload : null
  } catch {
    return null
  }
}
