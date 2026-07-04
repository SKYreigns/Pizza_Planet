// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Performance Tracker
// Records authentication, server action, middleware, database, and render latencies.
// =============================================================================

import { type PerformanceMetric } from '../reporting/types'

export class PerformanceTracker {
  private metrics: PerformanceMetric[] = []
  private activeTimers: Map<string, number> = new Map()

  public startTimer(operationId: string) {
    this.activeTimers.set(operationId, performance.now())
  }

  public endTimer(
    operationId: string,
    category: 'authentication' | 'server_action' | 'middleware' | 'database' | 'navigation' | 'render'
  ): number {
    const start = this.activeTimers.get(operationId)
    if (!start) return 0

    const latencyMs = Math.round(performance.now() - start)
    this.activeTimers.delete(operationId)

    this.metrics.push({
      operation: operationId,
      category,
      latencyMs,
      timestamp: new Date().toISOString()
    })

    return latencyMs
  }

  public recordMetric(
    operation: string,
    category: 'authentication' | 'server_action' | 'middleware' | 'database' | 'navigation' | 'render',
    latencyMs: number
  ) {
    this.metrics.push({
      operation,
      category,
      latencyMs: Math.round(latencyMs),
      timestamp: new Date().toISOString()
    })
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  public getSummary(): Record<string, { count: number; avgMs: number; minMs: number; maxMs: number; p95Ms: number }> {
    const categories: Record<string, number[]> = {}

    for (const m of this.metrics) {
      if (!categories[m.category]) {
        categories[m.category] = []
      }
      categories[m.category].push(m.latencyMs)
    }

    const summary: Record<string, { count: number; avgMs: number; minMs: number; maxMs: number; p95Ms: number }> = {}

    for (const [cat, times] of Object.entries(categories)) {
      times.sort((a, b) => a - b)
      const count = times.length
      const sum = times.reduce((acc, val) => acc + val, 0)
      const avgMs = Math.round(sum / count)
      const minMs = times[0]
      const maxMs = times[count - 1]
      const p95Index = Math.floor(count * 0.95)
      const p95Ms = times[Math.min(p95Index, count - 1)]

      summary[cat] = { count, avgMs, minMs, maxMs, p95Ms }
    }

    return summary
  }
}
