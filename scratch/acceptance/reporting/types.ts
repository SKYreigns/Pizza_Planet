// =============================================================================
// Pizza Planet Production Acceptance Framework V2 — Core Data Types
// Authoritative Engineering Verification & Diagnosis Schema
// =============================================================================

export interface ArtifactValidationResult {
  path: string
  exists: boolean
  sizeBytes: number
  readable: boolean
  isValidMediaOrJson: boolean
  validationError?: string
}

export interface NetworkTrace {
  method: string
  url: string
  status: number
  statusText: string
  redirectChain: string[]
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  setCookieHeaders: string[]
  timingMs: number
  responsePayloadSnippet?: string
  failureReason?: string
}

export interface CookieTrace {
  name: string
  valueSnippet: string
  httpOnly: boolean
  secure: boolean
  sameSite: string
  path: string
  domain: string
  expires: number
  isHmacSigned: boolean
  signatureValid?: boolean
  tamperRejected?: boolean
}

export interface DatabaseVerificationTrace {
  tableChecked: 'auth.users' | 'profiles' | 'kitchen_staff' | 'orders' | 'order_status_log' | string
  recordIdentifier: string
  found: boolean
  verifiedFields: Record<string, any>
  sessionConsistent: boolean
  notes?: string
}

export interface PerformanceMetric {
  operation: string
  category: 'authentication' | 'server_action' | 'middleware' | 'database' | 'navigation' | 'render'
  latencyMs: number
  timestamp: string
}

// Phase 1: Pure Verification (No assumptions, only observable evidence)
export interface VerificationResult {
  testId: string
  group: string
  name: string
  status: 'PASS' | 'FAIL'
  observedBehaviour: string
  expectedBehaviour: string
  actualBehaviour: string
  evidenceArtifacts: string[]
  networkTraces: NetworkTrace[]
  cookieTraces: CookieTrace[]
  databaseTraces: DatabaseVerificationTrace[]
  performanceMetrics: PerformanceMetric[]
}

// Phase 2: Engineering Diagnosis (Only generated after verification finishes)
export interface DiagnosisRecord {
  testId: string
  group: string
  testName: string
  observedFailure: string
  probableCause: string
  supportingEvidence: string[]
  recommendedFix: string
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  affectedFiles: string[]
}

export interface MasterAcceptanceReport {
  metadata: {
    reportId: string
    timestamp: string
    environment: string
    baseUrl: string
    totalTests: number
    passed: number
    failed: number
    durationMs: number
  }
  artifactValidationSummary: {
    totalChecked: number
    validCount: number
    invalidCount: number
    invalidArtifacts: ArtifactValidationResult[]
  }
  verificationResults: VerificationResult[]
  engineeringDiagnoses: DiagnosisRecord[]
  performanceSummary: Record<string, { count: number; avgMs: number; minMs: number; maxMs: number; p95Ms: number }>
  databaseIntegritySummary: {
    checksPerformed: number
    consistentSessions: number
    inconsistenciesFound: number
  }
  certificationDecision: {
    status: 'CERTIFIED PRODUCTION READY' | 'PROVISIONALLY CERTIFIED' | 'REJECTED — NOT PRODUCTION READY'
    justification: string
  }
}
