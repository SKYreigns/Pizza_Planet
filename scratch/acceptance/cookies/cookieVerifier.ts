// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Cookie Verifier
// Verifies cookie flags (HttpOnly, Secure, SameSite, Path), HMAC cryptographic signatures, and tamper resistance.
// =============================================================================

import { type BrowserContext } from 'playwright'
import { type CookieTrace } from '../reporting/types'
import { verifyKitchenCookie } from '../../../src/lib/auth/kitchenCookieSigner'

export class CookieVerifier {
  public async auditBrowserCookies(context: BrowserContext): Promise<CookieTrace[]> {
    const cookies = await context.cookies()
    const traces: CookieTrace[] = []

    for (const cookie of cookies) {
      let isHmacSigned = false
      let signatureValid = undefined
      let tamperRejected = undefined

      if (cookie.name === 'pp_kitchen_session') {
        isHmacSigned = cookie.value.includes('.')
        if (isHmacSigned) {
          try {
            const result = await verifyKitchenCookie(cookie.value)
            signatureValid = (result !== null)

            // Test tamper resistance in-memory
            const tamperedVal = cookie.value.replace('staffId', 'hackedStaffId') + '_invalid'
            const tamperRes = await verifyKitchenCookie(tamperedVal)
            tamperRejected = (tamperRes === null)
          } catch {
            signatureValid = false
            tamperRejected = true
          }
        }
      }

      traces.push({
        name: cookie.name,
        valueSnippet: cookie.value.length > 35 ? cookie.value.substring(0, 35) + '... [redacted]' : cookie.value,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        path: cookie.path,
        domain: cookie.domain,
        expires: cookie.expires,
        isHmacSigned,
        signatureValid,
        tamperRejected
      })
    }

    return traces
  }

  public async verifyCookiePurged(context: BrowserContext, cookieName: string): Promise<boolean> {
    const cookies = await context.cookies()
    const found = cookies.find(c => c.name === cookieName)
    if (!found) return true
    // If expires in past or max-age 0, it is purged
    return found.expires < Date.now() / 1000
  }
}
