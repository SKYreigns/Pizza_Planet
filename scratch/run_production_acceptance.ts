// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Master Orchestrator
// Executes modular verification suites across browser, network, cookie, session, database, and performance layers.
// Authoritative Source of Truth: EDR-2026-07-04-01 / PRODUCTION_ENGINEERING_SPECIFICATION.md
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
import { BrowserEngine } from './acceptance/browser/browserEngine'
import { NetworkInspector } from './acceptance/network/networkInspector'
import { CookieVerifier } from './acceptance/cookies/cookieVerifier'
import { DatabaseVerifier } from './acceptance/database/databaseVerifier'
import { PerformanceTracker } from './acceptance/performance/performanceTracker'
import { ReportGenerator } from './acceptance/reporting/reportGenerator'

import { CustomerAuthSuite } from './acceptance/auth/customerAuthSuite'
import { AdminAuthSuite } from './acceptance/auth/adminAuthSuite'
import { KitchenAuthSuite } from './acceptance/kitchen/kitchenAuthSuite'
import { RbacRouteSuite } from './acceptance/middleware/rbacSuite'
import { SessionPersistenceSuite } from './acceptance/sessions/sessionSuite'
import { RateLimitAndSecuritySuite } from './acceptance/security/rateLimitSuite'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const ARTIFACTS_DIR = path.resolve('C:/Users/lapto/.gemini/antigravity-ide/brain/95d7ebb0-dc25-474d-a19c-6a9b8c0bbdf3')

async function runMasterAcceptanceFramework() {
  console.log('======================================================================')
  console.log('🍕 PIZZA PLANET PRODUCTION ACCEPTANCE FRAMEWORK V2 (GATE 1)')
  console.log('======================================================================')
  console.log(`Target Server URL : ${BASE_URL}`)
  console.log(`Artifacts Storage : ${ARTIFACTS_DIR}\n`)

  const browser = new BrowserEngine(ARTIFACTS_DIR)
  const net = new NetworkInspector()
  const cookies = new CookieVerifier()
  const db = new DatabaseVerifier()
  const perf = new PerformanceTracker()
  const reportGen = new ReportGenerator()

  let dbCheckCount = 0
  let dbConsistentCount = 0

  try {
    // -------------------------------------------------------------------------
    // 1. Customer Authentication Lifecycle Suite (Group A)
    // -------------------------------------------------------------------------
    console.log('--- Executing Suite 1: Customer Auth Lifecycle (Group A) ---')
    const customerSuite = new CustomerAuthSuite(browser, net, cookies, db, perf, BASE_URL)
    const customerResults = await customerSuite.runSuite()
    for (const r of customerResults) {
      reportGen.addVerification(r)
      console.log(`[${r.status}] [${r.testId}] ${r.name}`)
      if (r.databaseTraces.length > 0) {
        dbCheckCount += r.databaseTraces.length
        dbConsistentCount += r.databaseTraces.filter(d => d.sessionConsistent).length
      }
    }

    // -------------------------------------------------------------------------
    // 2. Session Persistence & Isolation Suite (Group B & Group I)
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Suite 2: Session Persistence & Isolation (Group B & I) ---')
    const sessionSuite = new SessionPersistenceSuite(browser, net, cookies, perf, BASE_URL)
    const sessionResults = await sessionSuite.runSuite()
    for (const r of sessionResults) {
      reportGen.addVerification(r)
      console.log(`[${r.status}] [${r.testId}] ${r.name}`)
    }

    // -------------------------------------------------------------------------
    // 3. Admin Authentication Suite (Group C)
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Suite 3: Admin Owner Authentication (Group C) ---')
    const adminSuite = new AdminAuthSuite(browser, net, cookies, db, perf, BASE_URL)
    const adminResults = await adminSuite.runSuite()
    for (const r of adminResults) {
      reportGen.addVerification(r)
      console.log(`[${r.status}] [${r.testId}] ${r.name}`)
      if (r.databaseTraces.length > 0) {
        dbCheckCount += r.databaseTraces.length
        dbConsistentCount += r.databaseTraces.filter(d => d.sessionConsistent).length
      }
    }

    // -------------------------------------------------------------------------
    // 4. Kitchen KDS PIN Suite (Group D)
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Suite 4: Kitchen PIN & HMAC Cookie Signing (Group D) ---')
    const kitchenSuite = new KitchenAuthSuite(browser, net, cookies, db, perf, BASE_URL)
    const kitchenResults = await kitchenSuite.runSuite()
    for (const r of kitchenResults) {
      reportGen.addVerification(r)
      console.log(`[${r.status}] [${r.testId}] ${r.name}`)
      if (r.databaseTraces.length > 0) {
        dbCheckCount += r.databaseTraces.length
        dbConsistentCount += r.databaseTraces.filter(d => d.sessionConsistent).length
      }
    }

    // -------------------------------------------------------------------------
    // 5. RBAC Route Guard Matrix Suite (Group E)
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Suite 5: RBAC Route Guard Matrix (Group E) ---')
    const rbacSuite = new RbacRouteSuite(browser, net, cookies, perf, BASE_URL)
    const rbacResults = await rbacSuite.runSuite()
    for (const r of rbacResults) {
      reportGen.addVerification(r)
      console.log(`[${r.status}] [${r.testId}] ${r.name}`)
    }

    // -------------------------------------------------------------------------
    // 6. Rate Limiting & Security Suite (Group F & G)
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Suite 6: Rate Limiting & Security Defenses (Group F & G) ---')
    const rateSuite = new RateLimitAndSecuritySuite(browser, net, cookies, perf, BASE_URL)
    const rateResults = await rateSuite.runSuite()
    for (const r of rateResults) {
      reportGen.addVerification(r)
      console.log(`[${r.status}] [${r.testId}] ${r.name}`)
    }

    // -------------------------------------------------------------------------
    // 7. Browser Console & Hydration Integrity Audit (Group H)
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Suite 7: Browser Console & Hydration Audit (Group H) ---')
    const uncaughtErrors = browser.getUncaughtErrors()
    const allEvents = browser.getConsoleEvents()
    const statusH: 'PASS' | 'FAIL' = uncaughtErrors.length === 0 ? 'PASS' : 'FAIL'

    reportGen.addVerification({
      testId: 'TEST-H01',
      group: 'Group H',
      name: 'Zero Console Exceptions & Hydration Mismatch Audit',
      status: statusH,
      observedBehaviour: `Captured ${allEvents.length} browser console events across all test suites. Uncaught exceptions/errors: ${uncaughtErrors.length}.`,
      expectedBehaviour: 'Application executes across all personas with zero React hydration errors and zero uncaught JS exceptions.',
      actualBehaviour: statusH === 'PASS' ? `Flawless hydration and script execution across all viewports.` : `Captured ${uncaughtErrors.length} uncaught console error(s): ${JSON.stringify(uncaughtErrors.slice(0, 2))}`,
      evidenceArtifacts: [],
      networkTraces: [],
      cookieTraces: [],
      databaseTraces: [],
      performanceMetrics: []
    })
    console.log(`[${statusH}] [TEST-H01] Zero Console Exceptions & Hydration Audit`)

  } finally {
    await browser.close()
  }

  // Generate Authoritative Framework V2 Reports
  console.log('\n======================================================================')
  console.log('📊 GENERATING AUTHORITATIVE PRODUCTION ACCEPTANCE REPORTS...')
  const masterReport = reportGen.buildMasterReport(
    BASE_URL,
    browser.getValidator(),
    perf,
    dbCheckCount,
    dbConsistentCount
  )

  const outputPaths = reportGen.writeReportFiles(masterReport, ARTIFACTS_DIR)
  console.log(`✅ Master JSON Report Written : ${outputPaths.jsonPath}`)
  console.log(`✅ Authoritative Markdown Written : ${outputPaths.mdPath}`)
  console.log('======================================================================')
  console.log(`Final Certification Decision : [ ${masterReport.certificationDecision.status} ]`)
  console.log('======================================================================\n')
}

runMasterAcceptanceFramework().catch(err => {
  console.error('🚨 Fatal exception in Production Acceptance Framework V2:', err)
  process.exit(1)
})
