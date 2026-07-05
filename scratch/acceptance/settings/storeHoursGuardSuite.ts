// =============================================================================
// Pizza Planet Production Acceptance Framework V3 — Gate 2 Store Rules Guard Suite
// Audits SYS-02 Store Operating Rules Guard: UI Banner, Cart CTA, Route Guard, and Action Guard.
// =============================================================================

import { type BrowserEngine } from '../browser/browserEngine'
import { type NetworkInspector } from '../network/networkInspector'
import { type CookieVerifier } from '../cookies/cookieVerifier'
import { type DatabaseVerifier } from '../database/databaseVerifier'
import { type PerformanceTracker } from '../performance/performanceTracker'
import { type VerificationResult } from '../reporting/types'

export class StoreHoursGuardSuite {
  constructor(
    private browser: BrowserEngine,
    private net: NetworkInspector,
    private cookies: CookieVerifier,
    private db: DatabaseVerifier,
    private perf: PerformanceTracker,
    private baseUrl: string
  ) {}

  public async runSuite(): Promise<VerificationResult[]> {
    const results: VerificationResult[] = []

    // Step 0: Set store_settings.is_open = false via helper method for testing
    await this.db.setStoreOpen(false)

    const context = await this.browser.newContext()
    const page = await context.newPage()
    this.browser.attachConsoleMonitor(page)
    this.net.attachToPage(page, 'TEST-G2-01')

    try {
      // Test G2-01: Verify Store Closed Banner rendering across storefront
      this.perf.startTimer('G2-01-banner')
      await page.goto(`${this.baseUrl}/menu`)
      const bannerSelector = '[data-testid="store-closed-banner"]'
      await page.waitForSelector(bannerSelector, { timeout: 10000 })
      this.perf.endTimer('G2-01-banner', 'render')

      const screenshotG2_01 = await this.browser.captureVerifiedScreenshot(page, 'cert_v3_gate2_banner_closed.png')
      results.push({
        testId: 'TEST-G2-01',
        group: 'Gate 2 Rules',
        name: 'Store Closed Banner Viewport Enforcement (/menu)',
        status: screenshotG2_01.verified ? 'PASS' : 'FAIL',
        observedBehaviour: 'Banner [data-testid="store-closed-banner"] rendered on /menu when is_open=false.',
        expectedBehaviour: 'Prominent amber/red alert banner appears across all storefront viewports immediately when store is closed.',
        actualBehaviour: `Rendered in ${this.perf.getMetrics().slice(-1)[0]?.latencyMs || 0} ms. Screenshot verified: ${screenshotG2_01.verified}.`,
        evidenceArtifacts: screenshotG2_01.verified ? [screenshotG2_01.path] : [],
        networkTraces: this.net.getTraces(),
        cookieTraces: [],
        databaseTraces: [],
        performanceMetrics: this.perf.getMetrics().filter(m => m.operation.includes('G2-01')),
      })
      this.net.clearTraces()

      // Test G2-02: Verify Cart CTA button disabled
      this.net.attachToPage(page, 'TEST-G2-02')
      this.perf.startTimer('G2-02-cta')
      const cartBtn = await page.$('button[aria-label*="Cart"], [data-testid="cart-button"]')
      if (cartBtn) {
        await cartBtn.click()
        await page.waitForTimeout(1000)
      }
      const disabledCta = await page.$('button:disabled')
      const ctaText = disabledCta ? await disabledCta.textContent() : ''
      const isCtaDisabled = ctaText?.includes('Ordering Closed') || false
      this.perf.endTimer('G2-02-cta', 'render')

      const screenshotG2_02 = await this.browser.captureVerifiedScreenshot(page, 'cert_v3_gate2_cart_disabled.png')
      results.push({
        testId: 'TEST-G2-02',
        group: 'Gate 2 Rules',
        name: 'Cart Drawer CTA Disable Guard',
        status: isCtaDisabled ? 'PASS' : 'FAIL',
        observedBehaviour: `Cart checkout CTA is disabled and displays: "${ctaText}".`,
        expectedBehaviour: 'Proceed to Checkout button must be disabled and visually dimmed when store is closed.',
        actualBehaviour: `CTA Disabled check: ${isCtaDisabled}. Screenshot verified: ${screenshotG2_02.verified}.`,
        evidenceArtifacts: screenshotG2_02.verified ? [screenshotG2_02.path] : [],
        networkTraces: this.net.getTraces(),
        cookieTraces: [],
        databaseTraces: [],
        performanceMetrics: this.perf.getMetrics().filter(m => m.operation.includes('G2-02')),
      })
      this.net.clearTraces()

      // Test G2-03: Verify Middleware Route Guard redirecting from /checkout
      this.net.attachToPage(page, 'TEST-G2-03')
      this.perf.startTimer('G2-03-redirect')
      await page.goto(`${this.baseUrl}/checkout`)
      await page.waitForURL('**/menu*reason=store_closed*', { timeout: 10000 })
      const currentUrl = page.url()
      const redirectedProperly = currentUrl.includes('/menu') && currentUrl.includes('reason=store_closed')
      this.perf.endTimer('G2-03-redirect', 'navigation')

      const screenshotG2_03 = await this.browser.captureVerifiedScreenshot(page, 'cert_v3_gate2_route_redirect.png')
      results.push({
        testId: 'TEST-G2-03',
        group: 'Gate 2 Rules',
        name: 'Middleware /checkout Navigation Interception',
        status: redirectedProperly ? 'PASS' : 'FAIL',
        observedBehaviour: `Direct navigation to /checkout redirected to: ${currentUrl}.`,
        expectedBehaviour: 'Edge Middleware must intercept /checkout attempts when store is closed and redirect to /menu?reason=store_closed.',
        actualBehaviour: `Redirect Verified: ${redirectedProperly}. Screenshot verified: ${screenshotG2_03.verified}.`,
        evidenceArtifacts: screenshotG2_03.verified ? [screenshotG2_03.path] : [],
        networkTraces: this.net.getTraces(),
        cookieTraces: [],
        databaseTraces: [],
        performanceMetrics: this.perf.getMetrics().filter(m => m.operation.includes('G2-03')),
      })
      this.net.clearTraces()

    } finally {
      await page.close()
      await context.close()
      // Step Final: Re-open store after testing
      await this.db.setStoreOpen(true)
    }

    return results
  }
}
