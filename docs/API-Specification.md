# 🔌 Pizza Planet — API Specification

> **Version:** 1.0  
> **Last Updated:** June 19, 2026  
> **Author:** Staff Architect  
> **Architecture:** Next.js 15 Server Actions & Route Handlers

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Authentication & Authorization Rules](#2-authentication--authorization-rules)
3. [Product APIs](#3-product-apis)
4. [Category APIs](#4-category-apis)
5. [Cart APIs](#5-cart-apis)
6. [Checkout APIs](#6-checkout-apis)
7. [Order APIs](#7-order-apis)
8. [Tracking APIs](#8-tracking-apis)
9. [Coupon APIs](#9-coupon-apis)
10. [Payment APIs](#10-payment-apis)
11. [Refund & Payment Recovery APIs](#11-refund--payment-recovery-apis)
12. [Razorpay Webhook APIs](#12-razorpay-webhook-apis)
13. [WhatsApp Event APIs](#13-whatsapp-event-apis)
14. [Dashboard APIs](#14-dashboard-apis)
15. [Customer Account APIs](#15-customer-account-apis)
16. [Inventory APIs](#16-inventory-apis)
17. [Validation Rules](#17-validation-rules)
18. [Error Handling Standards](#18-error-handling-standards)
19. [Rate Limiting Strategy](#19-rate-limiting-strategy)
20. [Realtime Event Contracts](#20-realtime-event-contracts)
21. [API Security Requirements](#21-api-security-requirements)
22. [WhatsApp Notification Contracts](#22-whatsapp-notification-contracts)
23. [API Observability Requirements](#23-api-observability-requirements)
24. [API Evolution Strategy](#24-api-evolution-strategy)
25. [API Readiness Assessment](#25-api-readiness-assessment)

---

## 1. API Design Principles

1. **Server Actions First:** All client-to-server data mutations are executed via Next.js Server Actions using `use server`. Standard REST/HTTP API routes are strictly reserved for external webhooks (Razorpay) and background jobs (Inngest).
2. **Type Safety:** All inputs and outputs are strictly typed using TypeScript and validated at runtime using **Zod**.
3. **Graceful Failures:** Server Actions never throw unhandled exceptions to the client. They return a standardized `{ success: boolean, data?: T, error?: string }` payload.
4. **Zero Trust:** Never trust client-provided pricing. Always recalculate totals, discounts, and taxes securely on the server before persisting orders or initiating payments.
5. **Idempotency:** Payment, order creation, and webhook endpoints must safely handle duplicate requests.

---

## 2. Authentication & Authorization Rules

- **Identity Provider:** Supabase Auth (JWTs stored in cookies).
- **Session Validation:** Server Actions use `createServerClient` to extract the session from headers/cookies securely.
- **Roles:** Handled via the `profiles` table (`guest`, `customer`, `kitchen`, `delivery`, `owner`).
- **Authorization Enforcement:** Server Actions explicitly verify the user's role against the required role for the action before proceeding.

---

## 3. Product APIs

### `getProducts`
* **Purpose:** Fetch the active menu catalog.
* **Inputs:** `categoryId?: string`
* **Validation:** Optional valid UUID.
* **Authorization:** Public (None).
* **Success Response:** `Product[]` with variants and customizations nested.
* **Failure Response:** `{ error: "Failed to fetch menu" }`.
* **Side Effects:** None.
* **Realtime Events Triggered:** None.

### `getProductById`
* **Purpose:** Fetch details for a specific item (used in customizer).
* **Inputs:** `productId: string`
* **Validation:** `Zod.string().uuid()`
* **Authorization:** Public.
* **Success Response:** `Product` with full customization options.
* **Failure Response:** `{ error: "Product not found" }`.
* **Side Effects:** None.
* **Realtime Events Triggered:** None.

---

## 4. Category APIs

### `getCategories`
* **Purpose:** Fetch all active product categories for menu navigation.
* **Inputs:** None.
* **Validation:** None.
* **Authorization:** Public.
* **Success Response:** `Category[]` ordered by `display_order`.
* **Failure Response:** `{ error: "Failed to fetch categories" }`.
* **Side Effects:** None.
* **Realtime Events Triggered:** None.

---

## 5. Cart APIs

*Note: For guest users, the cart is purely client-state (Zustand + LocalStorage). These APIs apply to authenticated customers seeking cross-device sync.*

### `syncCart`
* **Purpose:** Sync local cart state to the user's profile metadata.
* **Inputs:** `cartItems: CartItem[]`
* **Validation:** Validates array length (max 20) and schema of `CartItem`.
* **Authorization:** `customer`
* **Success Response:** `{ success: true }`
* **Failure Response:** `{ error: "Sync failed" }`
* **Side Effects:** Updates `profiles.raw_user_meta_data`.
* **Realtime Events Triggered:** None.

---

## 6. Checkout APIs

### `calculateOrderTotal`
* **Purpose:** Securely calculate the cart's final price, applying coupons, taxes, and delivery fees.
* **Inputs:** `cartItems: CartItem[], couponCode?: string, orderType: 'delivery' | 'pickup'`
* **Validation:** Zod schema for items, limits max quantity.
* **Authorization:** Public.
* **Success Response:** `{ subtotal, tax, deliveryFee, discount, total, couponStatus }`
* **Failure Response:** `{ error: "Invalid item in cart" }`
* **Side Effects:** None. (Read-only pricing operation).
* **Realtime Events Triggered:** None.

### `createOrder`
* **Purpose:** Converts a cart into a pending order in the database.
* **Inputs:** `CheckoutForm` (Items, Customer Info, Address, Order Type, Payment Method, Coupon).
* **Validation:** Strict validation of address if delivery. Re-validation of all prices against DB.
* **Authorization:** Public (Guest) or `customer`.
* **Success Response:** `{ orderId: uuid, trackingToken: uuid, totalAmount: int }`
* **Failure Response:** `{ error: "Price mismatch or item out of stock" }`
* **Side Effects:** 
  - Inserts into `orders`, `order_items`, `order_item_customizations`.
  - Increments coupon `usage_count` (if COD. If online, increments after payment).
* **Realtime Events Triggered:** Broadacasts to `admin-dashboard` channel.

---

## 7. Order APIs

### `updateOrderStatus`
* **Purpose:** Move an order through its lifecycle (e.g., Confirmed -> Preparing -> Ready).
* **Inputs:** `orderId: string, newStatus: order_status`
* **Validation:** UUID validation. Ensures valid state transition machine.
* **Authorization:** `owner`, `kitchen`, or `delivery` (based on status).
* **Success Response:** `{ success: true }`
* **Failure Response:** `{ error: "Invalid state transition" }`
* **Side Effects:** 
  - Updates `orders.status`.
  - Inserts into `order_status_log`.
  - Emits Inngest event for WhatsApp notification.
* **Realtime Events Triggered:** 
  - `UPDATE` broadcast to `order-tracking-{tracking_token}`.
  - `UPDATE` broadcast to `kitchen-queue` or `delivery-queue`.

---

## 8. Tracking APIs

### `trackOrder`
* **Purpose:** Fetch real-time status of an active order securely without requiring a login.
* **Inputs:** `trackingToken: string`
* **Validation:** `Zod.string().uuid()`
* **Authorization:** Public (Requires token).
* **Success Response:** `Order` state including rider info, items, and status timeline.
* **Failure Response:** `{ error: "Order not found" }`
* **Side Effects:** None.
* **Realtime Events Triggered:** None (Client subscribes after fetch).

---

## 9. Coupon APIs

### `validateCoupon`
* **Purpose:** Check if a coupon is valid for the current cart.
* **Inputs:** `code: string, subtotal: number`
* **Validation:** Uppercase sanitization.
* **Authorization:** Public.
* **Success Response:** `{ valid: true, discountAmount: number, description: string }`
* **Failure Response:** `{ valid: false, error: "Expired or invalid code" }`
* **Side Effects:** None.
* **Realtime Events Triggered:** None.

---

## 10. Payment APIs

### `createRazorpayOrder`
* **Purpose:** Initialize a Razorpay session for an online-payment order.
* **Inputs:** `internalOrderId: string`
* **Validation:** UUID validation. Verifies order exists and is `pending_payment`.
* **Authorization:** Public (Validates internal order tracking token).
* **Success Response:** `{ razorpayOrderId: string, amount: number, currency: string }`
* **Failure Response:** `{ error: "Order already paid or invalid" }`
* **Side Effects:** 
  - Calls Razorpay external API.
  - Updates `orders.razorpay_order_id`.
* **Realtime Events Triggered:** None.

---

## 11. Refund & Payment Recovery APIs

### `requestRefund`
* **Purpose:** Allows a customer to request a refund for a cancelled order.
* **Inputs:** `orderId: string, reason: string`
* **Validation:** Valid UUID, length bounds on reason. Order must be `cancelled` or `rejected`.
* **Authorization:** `customer` (must own order).
* **Success Response:** `{ success: true, refundStatus: 'pending' }`
* **Failure Response:** `{ error: "Order not eligible for refund" }`
* **Side Effects:** Updates order notes, logs audit event.
* **Realtime Events:** None.

### `approveRefund` & `processRefund`
* **Purpose:** Admin approves and triggers Razorpay refund.
* **Inputs:** `orderId: string, amount: number`
* **Validation:** Amount must not exceed total_amount.
* **Authorization:** `owner`
* **Success Response:** `{ success: true, refundId: string }`
* **Failure Response:** `{ error: "Razorpay processing failed" }`
* **Side Effects:** Calls Razorpay API. Updates `payment_status` to `refunded`. Inserts to `payment_log`.
* **Realtime Events:** `UPDATE` broadcast to `order-tracking-{token}`.

### `retryPayment`
* **Purpose:** Generates a new Razorpay session for a `payment_failed` order.
* **Inputs:** `orderId: string`
* **Validation:** Order must be `pending_payment` and have `payment_status = failed`.
* **Authorization:** `customer` (must own order).
* **Success Response:** `{ razorpayOrderId: string, amount: number, currency: string }`
* **Failure Response:** `{ error: "Invalid order state" }`
* **Side Effects:** Calls Razorpay API.
* **Realtime Events:** None.

---

## 12. Razorpay Webhook APIs

*Note: This is an HTTP POST Route Handler (`/api/webhooks/razorpay`), not a Server Action.*

### `POST /api/webhooks/razorpay`
* **Purpose:** Receive secure callbacks from Razorpay for payment success/failure.
* **Inputs:** Razorpay JSON payload.
* **Validation:** Verifies `x-razorpay-signature` header using `RAZORPAY_WEBHOOK_SECRET`.
* **Authorization:** System (Signature verification).
* **Success Response:** HTTP `200 OK`.
* **Failure Response:** HTTP `400 Bad Request` or `401 Unauthorized`.
* **Side Effects:** 
  - Inserts into `payment_log`.
  - Updates `orders.payment_status` to `paid` or `failed`.
  - If `paid`, updates `orders.status` to `confirmed` and emits Inngest Notification Event.
* **Realtime Events Triggered:** `UPDATE` to `order-tracking-{token}` and `admin-dashboard`.

---

## 13. WhatsApp Event APIs (Inngest)

*Note: These are Inngest background job signatures, not client-facing APIs.*

### `send-order-notification`
* **Purpose:** Asynchronously dispatch WhatsApp messages via Meta Cloud API.
* **Inputs:** `{ orderId: string, type: notification_type }` (Event payload)
* **Validation:** Handled by Inngest Event schemas.
* **Authorization:** Internal System.
* **Success Response:** Job completes.
* **Failure Response:** Job retries with exponential backoff (up to 3 times).
* **Side Effects:** 
  - Inserts into `notifications` (pending).
  - Calls Meta API.
  - Updates `notifications` (sent/failed).
* **Realtime Events Triggered:** None.

---

## 14. Dashboard APIs

*(Note: `updateOrderStatus` is handled under Order APIs).*

### `getOrders` & `getOrderDetails`
* **Purpose:** Fetch list of active/past orders and deep-dive into specific order items.
* **Inputs:** `filters: { status?: string, date?: string }, orderId?: string`
* **Validation:** Optional pagination and status enums.
* **Authorization:** `owner`, `kitchen` (list only).
* **Success Response:** `Order[]` or `Order` with items and customer info.
* **Failure Response:** `{ error: "Failed to fetch orders" }`
* **Side Effects:** None.
* **Realtime Events:** None.

### `assignDeliveryDriver`
* **Purpose:** Assign an order to a delivery rider.
* **Inputs:** `orderId: string, riderId: string`
* **Validation:** Both valid UUIDs. Order must be `ready` or `preparing`.
* **Authorization:** `owner`
* **Success Response:** `{ success: true }`
* **Failure Response:** `{ error: "Invalid order state" }`
* **Side Effects:** Updates `orders.delivery_rider_id`. Logs status change.
* **Realtime Events:** `UPDATE` to `delivery-queue-{rider_id}`.

### `getCustomers`, `getRevenueReport`, `getTopProducts`
* **Purpose:** Fetch aggregated analytical data and user lists.
* **Inputs:** `dateRange: { start: string, end: string }`
* **Validation:** ISO date checks.
* **Authorization:** `owner`
* **Success Response:** Analytical datasets.
* **Failure Response:** `{ error: "Unauthorized" }`
* **Side Effects:** None.
* **Realtime Events:** None.

### `createProduct`, `updateProduct`, `archiveProduct`
* **Purpose:** Admin operations for menu management.
* **Inputs:** `ProductData` payload.
* **Validation:** Zod schema for prices, names, and images.
* **Authorization:** `owner`
* **Success Response:** `{ success: true, product: Product }`
* **Failure Response:** `{ error: "Validation failed" }`
* **Side Effects:** Mutates `products`. Appends to `product_audit_log`.
* **Realtime Events:** `UPDATE` or `INSERT` to `products` channel.

### `createCoupon`, `disableCoupon`
* **Purpose:** Manage discount campaigns.
* **Inputs:** `CouponData` payload or `couponId`.
* **Validation:** Zod schema ensuring dates and amounts are valid.
* **Authorization:** `owner`
* **Success Response:** `{ success: true }`
* **Failure Response:** `{ error: "Invalid coupon data" }`
* **Side Effects:** Mutates `coupons`.
* **Realtime Events:** None.

---

## 15. Customer Account APIs

### `getProfile` & `updateProfile`
* **Purpose:** Manage user account details (name, email preference).
* **Inputs:** `profileData: Partial<Profile>`
* **Validation:** Phone format regex, name length bounds.
* **Authorization:** `customer`
* **Success Response:** `{ success: true, profile: Profile }`
* **Failure Response:** `{ error: "Failed to update" }`
* **Side Effects:** Updates `profiles`.
* **Realtime Events:** None.

### `getOrderHistory` & `getOrderDetails` (Customer)
* **Purpose:** Fetch historical orders belonging to the logged-in user.
* **Inputs:** `orderId?: string`
* **Validation:** UUID check.
* **Authorization:** `customer` (enforced via RLS/`auth.uid()`).
* **Success Response:** `Order[]` or `Order`.
* **Failure Response:** `{ error: "Not found" }`
* **Side Effects:** None.
* **Realtime Events:** None.

### `saveAddress`, `updateAddress`, `deleteAddress`, `getSavedAddresses`
* **Purpose:** Manage customer address book.
* **Inputs:** `AddressData` payload.
* **Validation:** Zod schema for pincode, city, street. Maximum 5 addresses per user to prevent abuse.
* **Authorization:** `customer`
* **Success Response:** `{ success: true, addresses: Address[] }`
* **Failure Response:** `{ error: "Limit reached or invalid address" }`
* **Side Effects:** Mutates address array in `profiles.user_meta_data` or dedicated `addresses` table.
* **Realtime Events:** None.

---

## 16. Inventory APIs

### `updateItemAvailability`
* **Purpose:** Instantly toggle product or customization out-of-stock.
* **Inputs:** `itemId: string, type: 'product' | 'customization', isAvailable: boolean`
* **Validation:** UUID check, boolean check.
* **Authorization:** `owner`
* **Success Response:** `{ success: true }`
* **Failure Response:** `{ error: "Failed to update inventory" }`
* **Side Effects:** Updates `products` or `customization_options`. Inserts to `product_audit_log`.
* **Realtime Events Triggered:** `UPDATE` broadcast to `products` channel (refreshes customer menus instantly).

---

## 17. Validation Rules

All API inputs must be validated using **Zod** before business logic executes.

* **UUIDs:** `z.string().uuid()`
* **Phone Numbers:** `z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone format")`
* **Currency/Amounts:** Must be `z.number().int().nonnegative()` (Paisa format).
* **Order Status:** `z.nativeEnum(OrderStatus)`
* **Cart Quantities:** `z.number().int().min(1).max(10)`
* **Abuse Vectors Mitigation:** Text inputs (special instructions, names, addresses) must have strictly enforced `z.string().max(255)` length limits to prevent payload bloat. Arrays (like cart items) must have `.max(20)`.

---

## 18. Error Handling Standards

Server Actions must NEVER throw raw errors. They must catch exceptions and return a standard envelope:

```typescript
type ActionResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
```

**Standard Error Codes:**
* `UNAUTHORIZED` — Missing or invalid session.
* `FORBIDDEN` — Insufficient role permissions.
* `VALIDATION_ERROR` — Zod parsing failed.
* `OUT_OF_STOCK` — Cart contains unavailable items.
* `PRICE_MISMATCH` — Client subtotal does not match server calculation.

---

## 19. Rate Limiting Strategy

Rate limiting prevents abuse and DDoS on critical mutating endpoints. Since Next.js App Router does not have native middleware rate-limiting per Server Action easily, we utilize Vercel KV / Upstash Redis for critical paths.

| API / Action | Limit | Window | Mitigation |
|---|---|---|---|
| `createOrder` | 5 | 1 Minute | Reject with 429 / "Too many orders" |
| `validateCoupon` | 10 | 1 Minute | Reject with "Too many attempts" |
| `trackOrder` | 30 | 1 Minute | Reject (protects DB from polling) |
| Webhooks | N/A | N/A | Rely on Razorpay signature validation |

---

## 20. Realtime Event Contracts

The Supabase Realtime channels follow strict payload contracts to ensure the UI updates safely without full page reloads.

| Channel Name | Event | Payload Contract |
|---|---|---|
| `order-tracking-{token}` | `UPDATE` | `{ new: { status, payment_status, delivery_rider_id } }` |
| `admin-dashboard` | `INSERT` | `{ new: { id, status, total_amount, ... } }` |
| `store-status` | `UPDATE` | `{ new: { is_open, delivery_fee } }` |
| `products` | `UPDATE` | `{ new: { id, is_available } }` |

*Note: All payloads only contain fields permitted by Row Level Security (RLS) policies.*

---

## 21. API Security Requirements

1. **Service Role Keys:** Server Actions performing updates (like `updateOrderStatus` appending to the audit log) must use the `service_role` key carefully, ensuring they manually validate the `auth.uid()` and `role` before bypassing RLS.
2. **CSRF Protection:** Native to Next.js Server Actions. No custom CSRF tokens required.
3. **Data Leaks:** APIs fetching products MUST filter `is_archived = false`. Tracking APIs must select specific columns, never `SELECT *` containing phone numbers or sensitive rider IDs unless the user is authorized.
4. **Idempotency Keys:** Payment webhooks must process using `razorpay_payment_id` as an idempotency key to prevent double-crediting if Razorpay sends the webhook twice.
5. **Missing Audit Events Check:** Critical mutations (Refunds, Product edits, Order status changes) MUST strictly write to their respective `*_log` tables synchronously in the same transaction block.

---

## 22. WhatsApp Notification Contracts

All notifications are dispatched asynchronously via Inngest to the Meta Cloud API.

| Event | Trigger Source | Template Name | Variables | Retry Strategy | Failure Handling |
|---|---|---|---|---|---|
| **Order Confirmed** | Webhook (Razorpay) or Checkout (COD) | `order_confirmed_v1` | `customer_name`, `short_id`, `amount` | 3 retries (exp backoff) | Alert owner, mark `failed` |
| **Preparing** | Admin Dashboard | `order_preparing_v1` | `short_id`, `eta_mins` | 1 retry | Ignore (non-critical) |
| **Ready** | Kitchen KDS | `order_ready_v1` | `short_id` | 1 retry | Ignore |
| **Out For Delivery**| Admin Dashboard | `out_for_delivery_v1`| `short_id`, `rider_name`, `rider_phone` | 3 retries | Alert rider to call customer |
| **Delivered** | Delivery App | `order_delivered_v1` | `short_id` | 1 retry | Ignore |
| **Cancelled** | Admin Dashboard | `order_cancelled_v1` | `short_id`, `reason` | 3 retries | High priority alert |
| **Payment Failed** | Webhook (Razorpay) | `payment_failed_v1` | `short_id`, `retry_link` | 3 retries | Log, fallback to SMS |

---

## 23. API Observability Requirements

Production observability is critical. Every API operation must be monitored across four pillars:

1. **Sentry (Error Tracking):**
   - **Log:** All unhandled exceptions in Route Handlers and Server Actions.
   - **Tags:** Include `order_id` and `customer_id` where applicable.
2. **PostHog (Product Analytics):**
   - **Track:** `order_created`, `payment_failed`, `coupon_applied`, `cart_abandoned`.
   - **Metrics:** Conversion rate, average checkout time.
3. **Supabase Logs (Database Analytics):**
   - **Monitor:** Slow queries (> 500ms), Edge Function memory limits, Realtime channel connection drop rates.
4. **Vercel Analytics (Performance):**
   - **Monitor:** Server Action execution time, Webhook response latency (must be < 2s for Razorpay).

*Alerting:* Send a Slack/Discord notification to the engineering team if Razorpay webhooks return 500 errors or if Inngest queues back up beyond 50 pending jobs.

---

## 24. API Evolution Strategy

Pizza Planet uses a lightweight, practical versioning strategy suited for a single-business platform.

- **Server Actions:** Since Next.js tightly couples client and server, Server Actions do not require explicit `/v1/` versioning. When a contract changes, the entire app deploys atomically.
- **Webhooks:** External webhooks (e.g., Razorpay `/api/webhooks/razorpay/v1`) MUST be versioned in the URL path.
- **Contract Evolution Rules:** Additive changes (adding optional fields) are allowed at any time. Removing fields or changing types requires a coordinated deployment.
- **Deprecation Strategy:** If a mobile app is introduced later, REST APIs will be created and versioned natively (e.g., `/api/v1/mobile/...`). Server Actions remain internal to the web app.

---

## 25. API Readiness Assessment

| Dimension | Score | Justification |
|---|---|---|
| **Business Fit** | 10 / 10 | Covers all operational needs from checkout to kitchen display to refunds. |
| **Security** | 9 / 10 | Strict Role-Based access, Zod validation, and Idempotency enforcement. |
| **Maintainability** | 9 / 10 | Server Action-first approach keeps the codebase cohesive and typesafe. |
| **Scalability** | 8 / 10 | Inngest offloads heavy tasks (WhatsApp), keeping Server Actions fast. |
| **Observability** | 9 / 10 | Sentry, PostHog, and standardized error envelopes ensure clear visibility. |
| **Operational Readiness**| 9 / 10 | Refund workflows, rate limits, and abuse mitigations are fully documented. |

### Remaining Risks
- **Webhook Latency:** If Razorpay takes too long to send the success webhook, the user might leave the confirmation page before Realtime updates.
  - *Mitigation:* The frontend actively polls the order status locally as a fallback.

### Recommended Improvements (Future)
- Introduce a dedicated Redis cluster for strict distributed rate limiting if order volume scales 10x.
- Add SMS fallback directly in the Inngest workflow if the WhatsApp API goes down.

### Final Recommendation: **APPROVED**
The API specification meets production-grade standards. It successfully balances robust error handling, security, and observability without introducing unnecessary microservice complexity. It is cleared for immediate implementation.
