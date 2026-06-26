# 🗺️ Pizza Planet — Implementation Roadmap

> **Version:** 1.0  
> **Last Updated:** June 19, 2026  
> **Author:** Principal Technical Program Manager & Staff Architect  
> **Purpose:** End-to-end execution roadmap for building Pizza Planet from an empty repository to a production deployment.

---

## Section 1: Project Overview

### Goals
- Transform Pizza Planet from a manual WhatsApp-only ordering system into a highly automated, self-serve digital ordering platform.
- Drastically reduce manual order-taking effort and human errors in the kitchen.
- Increase daily order volume capacity without scaling front-of-house staff.

### Scope
- A mobile-first, responsive web application for customers to browse, customize, and pay for pizzas.
- A realtime admin dashboard / Kitchen Display System (KDS) for staff to manage orders and inventory.
- Automated WhatsApp notifications via Meta Cloud API to keep customers informed.

### Success Criteria
- **Zero-Touch Ordering:** Customers can place and track orders without calling or texting staff.
- **Realtime Sync:** Kitchen staff receive confirmed orders on the KDS instantly (< 2s delay).
- **Payment Integrity:** 100% of online orders are securely validated and reconciled with Razorpay before kitchen prep begins.

### MVP Definition
- Browsable menu with product customizations.
- Functional cart and checkout (Online Razorpay + COD).
- Realtime order tracking for customers.
- Realtime KDS for the kitchen and delivery dispatch.
- Automated WhatsApp notifications for critical statuses.

### Post-MVP Features
- Multi-store support (Branch selection).
- Advanced analytics dashboard.
- Driver mobile app for GPS tracking.
- Customer loyalty points program.

---

## Section 2: Development Strategy

### Build Order
The execution follows a strict **"Data to UI"** build order. We establish the infrastructure and database first, then secure it with Auth, then build the read-heavy Customer UI, followed by the write-heavy Admin UI, and finally, external webhooks/integrations.

### Dependency Graph (High Level)
`Infrastructure` -> `Database Schema` -> `Auth` -> `Menu UI` -> `Checkout Flow` -> `Payments` -> `Realtime Admin` -> `Automated Notifications`

### Risk Reduction Strategy
- **Derisk Payments Early:** Razorpay integration is complex; it is scheduled immediately after Checkout is built, rather than at the very end.
- **Derisk Realtime:** Supabase Realtime will be tested with simple ping/pong components before building the complex KDS.

### Incremental Delivery Strategy
Work will be merged into the `main` branch continuously behind feature flags if necessary. Vercel Preview Deployments will be used for daily stakeholder reviews.

---

## Section 3: Phase Breakdown

### Phase 1: Project Foundation
- **Objective:** Establish the core codebase and developer tooling.
- **Tasks:**
  - Initialize Next.js 15 App Router.
  - Configure TypeScript `tsconfig.json` strictly.
  - Install and configure Tailwind CSS and `shadcn/ui`.
  - Set up ESLint and Prettier.
  - Define `.env.example` and environment variables.
- **Dependencies:** None.
- **Deliverables:** A compiling Next.js app with `shadcn` CLI ready.
- **Completion Criteria:** A "Hello World" page renders successfully with the brand fonts (Plus Jakarta Sans) and Tailwind colors applied.
- **Estimated Complexity:** Low

### Phase 2: Supabase Foundation
- **Objective:** Provision the backend infrastructure.
- **Tasks:**
  - Create Supabase Project (Development & Production environments).
  - Configure Supabase Auth providers (Email/Password & OTP).
  - Provision Storage buckets for product images.
  - Enable Realtime on the project level.
  - Setup Supabase CLI for local development (`supabase start`).
- **Dependencies:** Phase 1.
- **Deliverables:** Running local Supabase instance and connected cloud projects.
- **Completion Criteria:** Next.js can successfully query a dummy table via `@supabase/ssr`.
- **Estimated Complexity:** Low

### Phase 3: Database Implementation
- **Objective:** Translate the DatabaseDesign.md into executable SQL migrations.
- **Tasks:**
  - Write SQL migrations for tables, enums, and indexes.
  - Write SQL migrations for RLS policies.
  - Write SQL migrations for Triggers (e.g., Short ID generation).
  - Create `seed.sql` with sample categories, products, and the singleton `store_settings`.
- **Dependencies:** Phase 2.
- **Deliverables:** `supabase/migrations/` directory fully populated.
- **Completion Criteria:** `supabase db reset` successfully creates the entire schema and inserts seed data without errors.
- **Estimated Complexity:** Medium

### Phase 4: Authentication
- **Objective:** Implement user identities and route protection.
- **Tasks:**
  - Implement Guest User creation flow (anonymous checkout).
  - Implement Phone OTP login flow.
  - Automatically create/link `profiles` rows on Auth signup.
  - Implement Role System (`owner`, `customer`, `kitchen`).
  - Create Next.js Middleware to protect `/admin` and `/profile` routes.
- **Dependencies:** Phase 3.
- **Deliverables:** Functional Auth UI and secure routing.
- **Completion Criteria:** An unauthorized user attempting to access `/admin` is redirected to `/login`.
- **Estimated Complexity:** High

### Phase 5: Customer Experience
- **Objective:** Build the public-facing storefront.
- **Tasks:**
  - Build Root Layout and Navigation.
  - Build Home Page (Hero, Featured Items).
  - Build Menu Page with Category Filters.
  - Build Product Grid and Cards.
  - Build the Glassmorphism Customization Modal.
  - Implement responsive design (Mobile, Tablet, Desktop).
- **Dependencies:** Phase 3.
- **Deliverables:** A fully navigable menu catalog.
- **Completion Criteria:** A user can view a pizza, click it, and see the customization modal with accurate database pricing.
- **Estimated Complexity:** High

### Phase 6: Cart System
- **Objective:** Allow users to build and persist an order.
- **Tasks:**
  - Initialize Zustand `useCartStore`.
  - Implement `localStorage` persistence.
  - Build the Slide-out Cart Drawer UI.
  - Implement Subtotal / Tax / Delivery Fee calculation logic.
  - Implement the `validateCoupon` Server Action.
- **Dependencies:** Phase 5.
- **Deliverables:** Working shopping cart.
- **Completion Criteria:** Items persist across page reloads and pricing calculations are mathematically perfect.
- **Estimated Complexity:** Medium

### Phase 7: Checkout
- **Objective:** Securely capture delivery and intent to pay.
- **Tasks:**
  - Build Checkout Layout.
  - Build Address Collection Form (React Hook Form + Zod).
  - Implement Store Delivery vs Pickup logic.
  - Build `createOrder` Server Action (validates prices against DB).
  - Build Order Confirmation redirect flow.
- **Dependencies:** Phase 6.
- **Deliverables:** A flow that converts a Cart into a `pending_payment` Order in the DB.
- **Completion Criteria:** A valid checkout form successfully inserts rows into `orders` and `order_items`.
- **Estimated Complexity:** High

### Phase 8: Payments
- **Objective:** Integrate Razorpay to capture funds securely.
- **Tasks:**
  - Implement Razorpay JS SDK on the frontend.
  - Build `createRazorpayOrder` Server Action.
  - Build `/api/webhooks/razorpay` Route Handler to verify signatures.
  - Handle webhook events to update `orders.payment_status`.
  - Implement UI fallback for Payment Failures / Retry.
- **Dependencies:** Phase 7.
- **Deliverables:** Working online payment pipeline.
- **Completion Criteria:** A test payment in Razorpay successfully updates the local DB order status to `paid` and `confirmed`.
- **Estimated Complexity:** Very High

### Phase 9: Realtime Tracking
- **Objective:** Keep the customer informed live.
- **Tasks:**
  - Build `/track/[trackingToken]` page.
  - Implement Supabase Realtime channel subscription for the specific order.
  - Build the Status Timeline UI stepper.
  - Implement Store Status listener (Banner for "Store Closed").
- **Dependencies:** Phase 8.
- **Deliverables:** Live updating tracking UI.
- **Completion Criteria:** Modifying an order in the Supabase Dashboard instantly moves the UI timeline forward without a browser refresh.
- **Estimated Complexity:** Medium

### Phase 10: Admin Dashboard
- **Objective:** Build the Kitchen Display System and Management tools.
- **Tasks:**
  - Build `/admin` Sidebar Layout.
  - Build Kanban Order Board (`features/admin`).
  - Implement Realtime listener for `orders` (INSERT/UPDATE).
  - Build `updateOrderStatus` Server Action.
  - Build Product/Inventory Management tables.
  - Build Store Settings toggle (Open/Close).
- **Dependencies:** Phase 9.
- **Deliverables:** A secure, live portal for staff operations.
- **Completion Criteria:** A new order placed on the customer frontend instantly appears on the Admin Kanban board, and clicking "Preparing" updates the customer's tracking page instantly.
- **Estimated Complexity:** High

### Phase 11: WhatsApp Automation
- **Objective:** Offload notifications to a resilient background queue.
- **Tasks:**
  - Set up Inngest in the Next.js project (`/api/inngest`).
  - Create WhatsApp Business account and Templates.
  - Build the `send-order-notification` background job.
  - Dispatch Inngest events from the `updateOrderStatus` Server Action.
- **Dependencies:** Phase 10.
- **Deliverables:** Automated messaging pipeline.
- **Completion Criteria:** Moving an order to "Out for Delivery" triggers a background job that successfully delivers a WhatsApp message to the test phone number.
- **Estimated Complexity:** High

### Phase 12: Quality Assurance
- **Objective:** Ensure the system is robust, secure, and accessible.
- **Tasks:**
  - Run Lighthouse performance and accessibility audits.
  - Test RLS policies manually using Anonymous keys.
  - Test Edge cases: Razorpay webhook delays, offline cart recovery.
  - Cross-device testing (iOS Safari, Android Chrome).
- **Dependencies:** Phases 1-11.
- **Deliverables:** Audit reports and bug fixes.
- **Completion Criteria:** 0 Critical bugs in Sentry; Lighthouse scores > 90 across the board.
- **Estimated Complexity:** Medium

### Phase 13: Deployment
- **Objective:** Launch Pizza Planet to production.
- **Tasks:**
  - Link Vercel project to GitHub repository.
  - Provision Production Supabase Database and apply migrations.
  - Configure Production Environment Variables (Razorpay Live Keys).
  - Setup custom domain routing.
  - Enable Point-in-Time Recovery (PITR) backups on Supabase.
- **Dependencies:** Phase 12.
- **Deliverables:** Live, publicly accessible web application.
- **Completion Criteria:** A live end-to-end test order successfully processes real currency and triggers a real WhatsApp message.
- **Estimated Complexity:** Low

---

## Section 4: Milestone Plan

- **Milestone 1: Working Menu** (Phases 1-5). The UI is beautiful, responsive, and pulling data directly from PostgreSQL.
- **Milestone 2: Working Checkout** (Phases 6-7). The core business loop (Cart -> Order) functions end-to-end.
- **Milestone 3: Payment Success** (Phase 8). The business can securely accept real money without DB drift.
- **Milestone 4: Realtime Tracking** (Phase 9). Customers have a post-purchase experience.
- **Milestone 5: Admin Dashboard** (Phase 10). Staff can successfully process and manage orders digitally.
- **Milestone 6: WhatsApp Automation** (Phase 11). The system handles customer communication automatically.
- **Milestone 7: Production Launch** (Phases 12-13). The system is hardened and live.

---

## Section 5: Implementation Dependencies

```text
[Phase 1: Project Foundation] 
          ↓
[Phase 2: Supabase Foundation]
          ↓
[Phase 3: Database Implementation]
          ↓
[Phase 4: Authentication]
          ↓
[Phase 5: Customer Experience]
          ↓
[Phase 6: Cart System]
          ↓
[Phase 7: Checkout]
          ↓
[Phase 8: Payments] ─────────┐
          ↓                  │
[Phase 9: Realtime Tracking] ←┘
          ↓
[Phase 10: Admin Dashboard]
          ↓
[Phase 11: WhatsApp Automation]
          ↓
[Phase 12: Quality Assurance]
          ↓
[Phase 13: Deployment]
```

---

## Section 6: Risk Register

| Risk Type | Description | Mitigation Plan |
|---|---|---|
| **Technical** | Next.js Server Actions timeout on slow connections. | Use Optimistic UI updates. Return errors gracefully for retries. |
| **Technical** | Razorpay Webhook fails to reach Vercel due to cold starts. | Ensure `/api/webhooks/razorpay` is edge-optimized or actively warmed. Rely on frontend polling as fallback. |
| **Business** | WhatsApp API blocks the business number for spam. | Strictly enforce opt-in during checkout and use only pre-approved Meta utility templates. |
| **Operational** | Kitchen staff accidentally delete or ignore orders on the KDS. | The dashboard restricts deletion (`owner` only). Orders only move rightwards on the Kanban board. |

---

## Section 7: Developer Workflow

- **Git Strategy:** GitHub repository. Main branch (`main`) is locked and protected.
- **Branch Strategy:** `feature/ticket-name`, `bugfix/issue-name`.
- **Code Review Process:** All PRs require at least 1 approval. Automated GitHub Actions run TypeScript compilation `tsc --noEmit` and ESLint.
- **Testing Process:** Developers must test against the *Local* Supabase instance before pushing. PRs generate Vercel Preview URLs for visual QA.
- **Deployment Process:** Merging to `main` automatically triggers a production build on Vercel and runs `supabase db push` via GitHub Actions to update the production database.

---

## Section 8: Definition Of Done

### Project Completion Criteria
A feature is "Done" when:
- Code is merged to `main`.
- TypeScript compiles with zero errors.
- ESLint reports zero warnings.
- The feature works on both Desktop Chrome and Mobile Safari.
- Any required database migrations are committed to the repository.

### MVP Completion Criteria
- All 13 Phases are marked 100% complete.
- The business owner has successfully tested the end-to-end flow using the live admin dashboard on their tablet.

### Production Launch Criteria
- Domain name is actively pointing to Vercel.
- Razorpay is switched to Live Mode.
- Real money test transaction was successful.
- Supabase backups are verified active.

---

## Section 9: Roadmap Readiness Assessment

| Dimension | Score | Justification |
|---|---|---|
| **Feasibility** | 10 / 10 | Uses proven patterns within the Next.js/Supabase ecosystem. No deep R&D required. |
| **Complexity** | Medium | The primary complexity lies in standardizing the Razorpay webhook to Realtime flow. |
| **Risk** | Low | The modular approach ensures each piece can be tested in isolation. |
| **Maintainability** | 9 / 10 | Strict TypeScript and feature-based folder architecture prevent tech debt accumulation. |
| **Time To Market** | Fast | The MVP can realistically be built and deployed by a small team within 2-4 sprints. |

### Final Recommendation: **APPROVED FOR EXECUTION**
This roadmap provides a crystal clear, deterministic path from an empty repository to a live Pizza Planet application. All architectural prerequisites are mapped, dependencies are ordered to minimize blocking, and risk mitigations are baked into the pipeline. The team is cleared to begin Phase 1 immediately.
