// =============================================================================
// Pricing Constants — Pizza Planet
// Default values mirroring the database public.store_settings table.
// Recalculated server-side authoritatively in createOrder.ts.
// Source of truth: DatabaseDesign.md §2.4, PRD.md CJ-3
// =============================================================================

export const DELIVERY_FEE_PAISA = 4900        // ₹49
export const FREE_DELIVERY_THRESHOLD = 49900  // ₹499
export const TAX_RATE = 0.05                  // 5% GST
