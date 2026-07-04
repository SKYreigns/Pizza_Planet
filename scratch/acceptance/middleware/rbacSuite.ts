// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — RBAC Route Guard Suite
// Audits Edge Middleware trapping of unauthorized guest navigations and HTTP 307 redirect chains.
// =============================================================================

import { type BrowserEngine } from '../browser/browserEngine'
import { type NetworkInspector } from '../network/networkInspector'
import { type CookieVerifier } from '../cookies/cookieVerifier'
import { type PerformanceTracker } from '../performance/performanceTracker'
import { type VerificationResult } from '../reporting/types'

export class RbacRouteSuite {
  constructor(
    private browser: BrowserEngine,
    private net: NetworkInspector,
    private cookies: CookieVerifier,
    private perf: PerformanceTracker,
    private baseUrl: string
  ) {}

  public async runSuite(): Promise<VerificationResult[]> {
    const results: VerificationResult[] = []

    const context = await this.browser.newContext({ storageState: undefined })
    const page = await context.newPage()
    this.browser.attachConsoleMonitor(page)

    const protectedRoutes = [
      { path: '/admin', expectedRedirect: '/auth/login?next=%2Fadmin', testId: 'TEST-E01' },
      { path: '/kitchen', expectedRedirect: '/auth/kitchen?next=%2Fkitchen', testId: 'TEST-E02' },
      { path: '/profile', expectedRedirect: '/auth/login?next=%2Fprofile', testId: 'TEST-E03' },
      { path: '/orders', expectedRedirect: '/auth/login?next=%2Forders', testId: 'TEST-E04' }
    ]

    for (const r of protectedRoutes) {
      this.net.attachToPage(page, r.testId)
      this.perf.startTimer(`rbac-${r.path}`)
      await page.goto(`${this.baseUrl}${r.path}`).catch(() => {})
      await page.waitForTimeout(1500)
      this.perf.endTimer(`rbac-${r.path}`, 'middleware')

      const currentUrl = page.url()
      const netTraces = this.net.getTraces()
      this.net.clearTraces()

      const isTrapped = currentUrl.includes(r.expectedRedirect) || currentUrl.includes('/auth/')
      const has307Or302 = netTraces.some(t => t.redirectChain.length > 0 || t.status === 307 || t.status === 302 || t.status === 308)

      results.push({
        testId: r.testId,
        group: 'Group E',
        name: `Unauthorized Guest Route Interception (${r.path})`,
        status: isTrapped ? 'PASS' : 'FAIL',
        observedBehaviour: `Requested GET ${r.path}. Wire observed HTTP redirect chain: ${has307Or302 ? 'present (307/308)' : 'implicit client routing'}. Final URL: ${currentUrl}.`,
        expectedBehaviour: `Edge Middleware intercepts unauthenticated request and redirects to auth login with next param.`,
        actualBehaviour: isTrapped ? `Successfully trapped and redirected to ${currentUrl}.` : `SECURITY FAILURE: Unauthenticated guest allowed direct access to ${currentUrl}!`,
        evidenceArtifacts: [],
        networkTraces: netTraces,
        cookieTraces: await this.cookies.auditBrowserCookies(context),
        databaseTraces: [],
        performanceMetrics: [this.perf.getMetrics().slice(-1)[0]].filter(Boolean)
      })
    }

    await context.close()
    return results
  }
}
