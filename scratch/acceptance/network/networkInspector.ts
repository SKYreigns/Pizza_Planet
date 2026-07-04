// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Network Inspector
// Captures HTTP requests, status codes, redirect chains, headers, and timings.
// =============================================================================

import { type Page, type Request, type Response } from 'playwright'
import { type NetworkTrace } from '../reporting/types'

export class NetworkInspector {
  private traces: NetworkTrace[] = []
  private requestTimestamps: Map<string, number> = new Map()

  public attachToPage(page: Page, testId: string) {
    page.on('request', (req: Request) => {
      this.requestTimestamps.set(req.url(), Date.now())
    })

    page.on('response', async (res: Response) => {
      const url = res.url()
      // Filter out static assets like icons, fonts, and hot-reload polling
      if (url.includes('/_next/static/') || url.includes('favicon') || url.includes('/_next/webpack-hmr')) {
        return
      }

      const startTime = this.requestTimestamps.get(url) || Date.now()
      const timingMs = Date.now() - startTime

      const req = res.request()
      const reqHeaders = await req.allHeaders()
      const resHeaders = await res.allHeaders()
      const status = res.status()
      const statusText = res.statusText()

      // Trace redirect chain
      const redirectChain: string[] = []
      let redirectReq = req.redirectedFrom()
      while (redirectReq) {
        redirectChain.unshift(redirectReq.url())
        redirectReq = redirectReq.redirectedFrom()
      }

      // Extract Set-Cookie headers specifically
      const setCookieHeaders: string[] = []
      if (resHeaders['set-cookie']) {
        const rawCookie = resHeaders['set-cookie']
        if (Array.isArray(rawCookie)) {
          setCookieHeaders.push(...rawCookie)
        } else {
          setCookieHeaders.push(String(rawCookie))
        }
      }

      // Try capturing JSON response payload snippet for server actions / API calls
      let responsePayloadSnippet: string | undefined
      if (resHeaders['content-type']?.includes('application/json') || url.includes('/api/') || req.method() === 'POST') {
        try {
          const bodyText = await res.text()
          if (bodyText) {
            responsePayloadSnippet = bodyText.length > 300 ? bodyText.substring(0, 300) + '... [truncated]' : bodyText
          }
        } catch {
          // Payload unreadable or stream consumed
        }
      }

      const trace: NetworkTrace = {
        method: req.method(),
        url,
        status,
        statusText,
        redirectChain,
        requestHeaders: {
          authorization: reqHeaders['authorization'] || 'none',
          'content-type': reqHeaders['content-type'] || 'none',
          cookie: reqHeaders['cookie'] ? 'present [redacted]' : 'none'
        },
        responseHeaders: {
          'content-type': resHeaders['content-type'] || 'none',
          'cache-control': resHeaders['cache-control'] || 'none',
          location: resHeaders['location'] || 'none',
          'x-powered-by': resHeaders['x-powered-by'] || 'none'
        },
        setCookieHeaders,
        timingMs,
        responsePayloadSnippet
      }

      this.traces.push(trace)
    })

    page.on('requestfailed', (req: Request) => {
      const url = req.url()
      if (url.includes('/_next/static/') || url.includes('favicon')) return
      
      this.traces.push({
        method: req.method(),
        url,
        status: 0,
        statusText: 'REQUEST FAILED',
        redirectChain: [],
        requestHeaders: {},
        responseHeaders: {},
        setCookieHeaders: [],
        timingMs: 0,
        failureReason: req.failure()?.errorText || 'Unknown network failure'
      })
    })
  }

  public getTraces(): NetworkTrace[] {
    return [...this.traces]
  }

  public clearTraces() {
    this.traces = []
    this.requestTimestamps.clear()
  }
}
