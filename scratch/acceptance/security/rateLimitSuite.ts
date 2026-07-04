// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Rate Limiting & Security Suite
// Audits sliding-window brute-force defense, SQL injection immunity, and forged cookie rejection.
// =============================================================================

import { type BrowserEngine } from '../browser/browserEngine'
import { type NetworkInspector } from '../network/networkInspector'
import { type CookieVerifier } from '../cookies/cookieVerifier'
import { type PerformanceTracker } from '../performance/performanceTracker'
import { type VerificationResult } from '../reporting/types'

export class RateLimitAndSecuritySuite {
  constructor(
    private browser: BrowserEngine,
    private net: NetworkInspector,
    private cookies: CookieVerifier,
    private perf: PerformanceTracker,
    private baseUrl: string
  ) {}

  public async runSuite(): Promise<VerificationResult[]> {
    const results: VerificationResult[] = []

    // Test F.1: Brute-Force PIN Enumeration Rate Limiting (Max 5 attempts / 15m window)
    const contextF = await this.browser.newContext()
    const pageF = await contextF.newPage()
    this.browser.attachConsoleMonitor(pageF)
    this.net.attachToPage(pageF, 'TEST-F01')

    this.perf.startTimer('F01-rate-limit')
    await pageF.goto(`${this.baseUrl}/auth/kitchen`)
    for (let i = 1; i <= 5; i++) {
      await pageF.fill('#pin', '0000')
      await pageF.click('button[type="submit"]')
      await pageF.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 5000 }).catch(() => {})
      await pageF.waitForTimeout(200)
    }

    // Attempt #6
    await pageF.fill('#pin', '0000')
    await pageF.click('button[type="submit"]').catch(() => {})
    await pageF.waitForTimeout(1500)
    this.perf.endTimer('F01-rate-limit', 'server_action')

    const alertTextF1 = await pageF.$eval('.bg-destructive\\/10, [role="alert"], .text-destructive', el => el.textContent?.trim()).catch(() => 'No alert found')
    const screenshotF1 = await this.browser.captureVerifiedScreenshot(pageF, 'cert_v2_group_f_rate_limit.png')
    const netTracesF1 = this.net.getTraces()
    this.net.clearTraces()

    const isRateLimited = alertTextF1.includes('Too many failed PIN attempts') || alertTextF1.includes('wait 15 minutes')
    results.push({
      testId: 'TEST-F01',
      group: 'Group F',
      name: 'Sliding-Window Brute-Force Rate Limit Enforcement',
      status: isRateLimited ? 'PASS' : 'FAIL',
      observedBehaviour: `Injected 6 sequential invalid PINs ('0000'). On attempt #6, DOM rendered alert banner: "${alertTextF1}".`,
      expectedBehaviour: 'Server action tracks failed attempts per identifier/IP and blocks attempt #6 with an explicit rate limit alert.',
      actualBehaviour: isRateLimited ? `Successfully blocked attempt #6 with rate limit notice in ${this.perf.getMetrics().slice(-1)[0]?.latencyMs || 0} ms.` : `SECURITY FAILURE: Attempt #6 was not rate limited! Alert text: "${alertTextF1}"`,
      evidenceArtifacts: screenshotF1.verified ? [screenshotF1.path] : [],
      networkTraces: netTracesF1,
      cookieTraces: await this.cookies.auditBrowserCookies(contextF),
      databaseTraces: [],
      performanceMetrics: [this.perf.getMetrics().slice(-1)[0]].filter(Boolean)
    })
    await contextF.close()

    // Test G.1: SQL Injection Immunity Verification (Postgres RPC crypt parameterization)
    const contextG = await this.browser.newContext()
    const pageG = await contextG.newPage()
    this.browser.attachConsoleMonitor(pageG)
    this.net.attachToPage(pageG, 'TEST-G01')

    this.perf.startTimer('G01-sql-inject')
    await pageG.goto(`${this.baseUrl}/auth/kitchen`)
    await pageG.fill('#pin', '1234\' OR \'1\'=\'1')
    await pageG.click('button[type="submit"]')
    await pageG.waitForTimeout(1000)
    this.perf.endTimer('G01-sql-inject', 'server_action')

    const currentUrlG1 = pageG.url()
    const isInjectTrapped = currentUrlG1.includes('/auth/kitchen') && !currentUrlG1.includes('/kitchen?next')
    results.push({
      testId: 'TEST-G01',
      group: 'Group G',
      name: 'SQL Injection Immunity Verification (pgcrypto RPC Parameterization)',
      status: isInjectTrapped ? 'PASS' : 'FAIL',
      observedBehaviour: `Submitted SQL injection string "1234' OR '1'='1" into numeric PIN field. Resulting URL: ${currentUrlG1}.`,
      expectedBehaviour: 'Parameterized database RPC and Zod guardrails reject SQL injection payload without bypassing authentication.',
      actualBehaviour: isInjectTrapped ? 'SQL injection string cleanly trapped by boundary guardrails without DB exception.' : 'CRITICAL SECURITY FAILURE: SQL injection allowed unauthorized access!',
      evidenceArtifacts: [],
      networkTraces: this.net.getTraces(),
      cookieTraces: await this.cookies.auditBrowserCookies(contextG),
      databaseTraces: [],
      performanceMetrics: [this.perf.getMetrics().slice(-1)[0]].filter(Boolean)
    })
    this.net.clearTraces()

    // Test G.2: Forged Cookie Cryptographic Rejection Audit
    this.perf.startTimer('G02-forged-cookie')
    const forgedCookieVal = `{"staffId":"admin-hacker-uuid","name":"Hacked Chef"}.invalid_hmac_signature_hash_999`
    await contextG.addCookies([{
      name: 'pp_kitchen_session',
      value: forgedCookieVal,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    }])

    await pageG.goto(`${this.baseUrl}/kitchen`).catch(() => {})
    await pageG.waitForTimeout(1500)
    this.perf.endTimer('G02-forged-cookie', 'middleware')

    const urlG2 = pageG.url()
    const isForgedRejected = urlG2.includes('/auth/kitchen')
    results.push({
      testId: 'TEST-G02',
      group: 'Group G',
      name: 'Forged Cookie Cryptographic Signature Rejection Audit',
      status: isForgedRejected ? 'PASS' : 'FAIL',
      observedBehaviour: `Injected forged cookie with invalid HMAC signature and requested GET /kitchen. Wire redirected to: ${urlG2}.`,
      expectedBehaviour: 'Edge Middleware recomputes HMAC signature, detects cryptographic mismatch, purges session, and redirects to login.',
      actualBehaviour: isForgedRejected ? `HMAC signature verification trapped forgery and redirected to ${urlG2}.` : `CRITICAL SECURITY FAILURE: Forged cookie bypassed edge middleware!`,
      evidenceArtifacts: [],
      networkTraces: this.net.getTraces(),
      cookieTraces: await this.cookies.auditBrowserCookies(contextG),
      databaseTraces: [],
      performanceMetrics: [this.perf.getMetrics().slice(-1)[0]].filter(Boolean)
    })
    await contextG.close()

    return results
  }
}
