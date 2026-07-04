// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Browser Engine
// Manages Chromium browser processes, incognito contexts, console error interception, and verified screenshot capture.
// =============================================================================

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import path from 'path'
import fs from 'fs'
import { ArtifactValidator } from '../reporting/artifactValidator'

export interface ConsoleEvent {
  type: string
  text: string
  url: string
  timestamp: string
}

export class BrowserEngine {
  private browser: Browser | null = null
  private consoleLogs: ConsoleEvent[] = []
  private validator = new ArtifactValidator()
  private artifactsDir: string

  constructor(artifactsDir: string) {
    this.artifactsDir = path.resolve(artifactsDir)
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true })
    }
  }

  public async launch() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true })
    }
    return this.browser
  }

  public async newContext(options?: { storageState?: string; userAgent?: string }): Promise<BrowserContext> {
    const browser = await this.launch()
    return await browser.newContext(options)
  }

  public attachConsoleMonitor(page: Page) {
    page.on('console', msg => {
      const text = msg.text()
      // Filter out standard React DevTools and Fast Refresh notice
      if (!text.includes('Download the React DevTools') && !text.includes('Fast Refresh') && !text.includes('HMR')) {
        this.consoleLogs.push({
          type: msg.type(),
          text,
          url: page.url(),
          timestamp: new Date().toISOString()
        })
      }
    })

    page.on('pageerror', err => {
      this.consoleLogs.push({
        type: 'pageerror',
        text: err.message,
        url: page.url(),
        timestamp: new Date().toISOString()
      })
    })
  }

  public async captureVerifiedScreenshot(page: Page, filename: string): Promise<{ path: string; verified: boolean; error?: string }> {
    const filePath = path.join(this.artifactsDir, filename)
    await page.screenshot({ path: filePath, fullPage: false })

    const validation = this.validator.validateArtifact(filePath)
    return {
      path: filePath,
      verified: validation.isValidMediaOrJson && validation.sizeBytes > 0,
      error: validation.validationError
    }
  }

  public getConsoleEvents(): ConsoleEvent[] {
    return [...this.consoleLogs]
  }

  public getUncaughtErrors(): ConsoleEvent[] {
    return this.consoleLogs.filter(c => c.type === 'error' || c.type === 'pageerror')
  }

  public getValidator(): ArtifactValidator {
    return this.validator
  }

  public async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}
