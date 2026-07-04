# 🛑 PIZZA PLANET ENGINEERING CLARIFICATIONS & DECISION NOTES

**Document Type:** Engineering Decision Note (EDN) & Formal Clarification Register  
**Project Reference:** Pizza Planet Digital Storefront (`17410910858893906886`)  
**Issuing Authority:** Complete Engineering Leadership Team (Principal Software Architect, Staff Backend Eng, Principal Security Eng, Principal SRE)  
**Date of Issuance:** July 4, 2026  
**Status:** **ACTIVE STOP ORDER — IMPLEMENTATION BLOCKED PENDING ARCHITECTURAL RESOLUTION**

---

## 🏛️ EXECUTIVE SUMMARY & STOP ORDER DECLARATION

In strict accordance with the constitutional governance mandates established in `PRODUCTION_ENGINEERING_SPECIFICATION.md` and `MASTER_IMPLEMENTATION_CONFORMANCE_BLUEPRINT.md`, the engineering organization initiated **Gate 1: Identity & Security Onboarding (`SYS-01`)**.

During **Step 4 (Cross-Document Verification & Contradiction Audit)** prior to writing source code, the engineering team discovered three fundamental contradictions and missing DDL specifications between the authoritative runtime specification and the historical database schema.

**Constitutional Rule Invoked:**  
> *"If something is not defined inside the specification: STOP. Do NOT guess. Instead create an Engineering Clarification item inside `docs/implementation/questions.md`. Never hallucinate architecture. If contradictions exist: STOP. Generate an Engineering Decision Note. Do NOT write code until resolved."*

Accordingly, all source code implementation for Gate 1 is **OFFICIALLY HALTED**. No developer or AI coding agent may modify `src/app/auth/*`, `src/actions/auth.ts`, or `src/middleware.ts` until the clarification items below are formally resolved and ratified.

---

## 📋 ENGINEERING CLARIFICATION ITEMS (ECI)

### ECI-001: Missing `kitchen_staff` DDL Schema & Table Definition
* **Date Raised:** July 4, 2026
* **Raised By:** Principal Database Engineer & Principal Security Engineer
* **Target Gate:** Gate 1 (`SYS-01` Identity & Security)
* **The Contradiction:**
  * `MASTER_IMPLEMENTATION_CONFORMANCE_BLUEPRINT.md` (Table 1 Row 02, §7.1 Gate 1, §8.1 `AUTH-CHK-04`) and `PRODUCTION_ENGINEERING_SPECIFICATION.md` (§10 Subsystem 01) explicitly mandate that kitchen authentication must query a dedicated database table named `kitchen_staff` (verifying `pin_hash` against `8842` via `crypt()` / `bcrypt`) and issue an HTTP-only cookie `pp_kitchen_session`. It strictly forbids synthetic email spoofing (`kitchen-PIN@...internal`).
  * Furthermore, the blueprint asserts: *"DatabaseDesign.md (§3.4): Defines dedicated table kitchen_staff with pin_hash column and shift tracking."*
  * **However:** A complete forensic scan of `docs/DatabaseDesign.md` and all existing Supabase SQL migrations (`001_pizza_planet_core.sql` through `005_fix_rls_circular_recursion.sql`) reveals that **no table named `kitchen_staff` exists anywhere in the repository or DDL**. In `DatabaseDesign.md`, kitchen staff are modeled purely via the `user_role` enum (`'kitchen'`), and RLS policies check `profiles.role = 'kitchen'`.
* **Impact on Gate 1:** We cannot compile the required Server Action `authenticateKitchenPin(pin)` without a database table to query. Hallucinating a table schema without authorization violates Article III of the Production Specification.
* **Proposed Architectural Resolution (For Ratification):**
  Authorize the immediate creation of migration file `supabase/migrations/006_create_kitchen_staff.sql` with the following exact schema and seed data:
  ```sql
  CREATE TABLE IF NOT EXISTS public.kitchen_staff (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL,
    pin_hash    text        NOT NULL,
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  );

  -- Seed default MVP test PIN '8842' (hashed via pgcrypto crypt)
  INSERT INTO public.kitchen_staff (name, pin_hash, is_active)
  VALUES ('Chef Suresh', crypt('8842', gen_salt('bf')), true)
  ON CONFLICT DO NOTHING;
  ```
* **Status:** ⚠️ **PENDING ARCHITECTURAL APPROVAL**

---

### ECI-002: SMS OTP Verification vs. Local Development Test Environment
* **Date Raised:** July 4, 2026
* **Raised By:** Staff QA Automation Engineer & Principal SRE
* **Target Gate:** Gate 1 (`SYS-01` Identity & Security)
* **The Contradiction:**
  * `MASTER_IMPLEMENTATION_CONFORMANCE_BLUEPRINT.md` (§8.1 `AUTH-CHK-02` and `AUTH-CHK-03`) mandates that `/auth/signup` and `/auth/otp` must deliver live SMS OTP verification via Supabase Phone Auth within 10 seconds.
  * **However:** In local development (`next dev`) and CI test pipelines, live SMS gateway providers (Twilio/MSG91) are not provisioned with live credits or cellular carrier routing. Executing automated QA tests against live SMS will fail or incur rate-limiting dropouts.
* **Impact on Gate 1:** Automated acceptance verification of `AUTH-CHK-02` and `AUTH-CHK-03` will fail mechanically during local engineering validation without a defined test harness.
* **Proposed Architectural Resolution (For Ratification):**
  Codify an authorized Supabase Local Development Auth Test Pair in the engineering specification:
  1. Mandate that local Supabase Auth config (`config.toml`) enables fixed test phone OTP verification: Phone `+919999999999` maps statically to OTP code `123456`.
  2. For automated Playwright/E2E testing, all test runs must assert against `+919999999999` / `123456` to ensure 100% mechanical repeatability without external network dependencies.
* **Status:** ⚠️ **PENDING ARCHITECTURAL APPROVAL**

---

### ECI-003: Undefined Runtime Contract for Owner Admin MFA (Multi-Factor Auth)
* **Date Raised:** July 4, 2026
* **Raised By:** Principal Security Engineer & Staff Frontend Engineer
* **Target Gate:** Gate 1 (`SYS-01` Identity & Security)
* **The Contradiction:**
  * `MASTER_IMPLEMENTATION_CONFORMANCE_BLUEPRINT.md` (§8.1 `AUTH-CHK-06`) mandates: *"Sign in with owner credentials (`owner@pizzaplanet.in`). Confirm MFA prompt appears, verification succeeds, and user is routed to `/admin`."*
  * **However:** Supabase Auth TOTP Multi-Factor Authentication requires a multi-step enrollment, challenge, and verification protocol (`supabase.auth.mfa.enroll()`, QR code rendering, challenge ID generation). Neither `API-Specification.md` nor `PRODUCTION_ENGINEERING_SPECIFICATION.md` defines the runtime Server Action signature, Zod validation schema, or UI viewport component hierarchy for `/auth/admin` MFA challenge processing.
* **Impact on Gate 1:** Developers cannot implement Owner MFA mechanically without guessing or inventing ad-hoc UI state machines, which is strictly prohibited.
* **Proposed Architectural Resolution (For Ratification):**
  1. Authorize a phased execution for `/auth/admin`: For **Gate 1 Baseline**, require strong Email + Password authentication paired with strict server-side role verification (`profile.role === 'owner'`) inside Server Action `signInAdmin(email, password)`.
  2. Define the formal runtime contract for TOTP MFA enrollment/challenge as a dedicated sub-package (`EXEC-PKG-SYS01-MFA`) to be executed immediately following Gate 1 QA verification, before commercial cutover.
* **Status:** ⚠️ **PENDING ARCHITECTURAL APPROVAL**

---

## 📑 PROPOSED GATE 1 IMPLEMENTATION PLAN (PENDING ECI RESOLUTION)

*Note: In conformance with the governance mandate, this implementation plan is generated and staged for review. No file modifications will occur until ECI-001, ECI-002, and ECI-003 are formally approved.*

### 1. Files to Modify
* `src/app/auth/login/LoginForm.tsx` — Remove direct client-side Supabase SDK calls; replace with invocation of Server Action `signInWithEmail()`; inspect resolved user role and route customers to `/profile` and owners to `/admin`, completely eliminating `AUTH-01` infinite redirect loops.
* `src/app/auth/kitchen/KitchenPinForm.tsx` — Remove synthetic email spoofing hack (`kitchen-${pin}@...internal`); replace with invocation of Server Action `authenticateKitchenPin(pin)`.
* `src/middleware.ts` — Integrate Upstash Redis sliding-window rate limiting on auth endpoints (max 5 failed kitchen PIN attempts per 15 minutes per IP); enforce strict role guard redirection without routing loops.
* `src/lib/auth/roles.ts` — Add route definitions for customer onboarding (`/auth/signup`, `/auth/otp`).

### 2. Files to Create
* `supabase/migrations/006_create_kitchen_staff.sql` — DDL migration creating `kitchen_staff` table and seeding chef PIN `8842` *(Subject to ECI-001 approval)*.
* `src/actions/auth.ts` — Expand Server Actions to include:
  * `signUpWithPhone(phone: string)`
  * `verifyPhoneOtp(phone: string, otp: string)`
  * `signInWithEmail(email: string, password: string, redirectTo?: string)`
  * `authenticateKitchenPin(pin: string)` — Queries `kitchen_staff`, verifies bcrypt hash, sets encrypted HTTP-only cookie `pp_kitchen_session`.
* `src/app/auth/signup/page.tsx` & `SignUpForm.tsx` — Customer mobile phone onboarding viewport.
* `src/app/auth/otp/page.tsx` & `OtpForm.tsx` — 6-digit SMS OTP verification viewport.
* `src/app/auth/admin/page.tsx` & `AdminLoginForm.tsx` — Dedicated Owner/Admin secure sign-in viewport.

### 3. Dependencies & Imports
* `zod` — For input validation schemas (`PhoneAuthSchema`, `PinAuthSchema`, `EmailAuthSchema`).
* `@supabase/ssr` — For server-side session cookie management.
* `bcryptjs` / `pgcrypto` — For secure kitchen PIN hash verification.
* `@upstash/ratelimit` & `@upstash/redis` — For middleware brute-force protection.

### 4. Database Objects & Server Actions
* **Database Objects:** Table `public.kitchen_staff`; RLS policy permitting read access by `service_role` and verified kitchen sessions.
* **Server Actions:** All mutations strictly encapsulated in `src/actions/auth.ts`; zero client-side Supabase database calls in presentation UI.

### 5. Authentication, Middleware & Realtime Dependencies
* **Authentication:** Phone OTP (SMS) for customers; Email+Password+RoleCheck for owners; PIN Hash + HTTP-only cookie for kitchen staff.
* **Middleware Dependencies:** `middleware.ts` intercepts `/kitchen` (requires `pp_kitchen_session` cookie or `role === 'kitchen'`), `/admin` (requires `role === 'owner'`), `/profile` and `/orders` (requires `role === 'customer'`).
* **Realtime Dependencies:** None for Gate 1 (Realtime WebSocket infrastructure is validated in Gate 4 and Gate 5).

### 6. Testing Impact, Risk Assessment & Rollback Strategy
* **Testing Impact:** Automated Jest/Playwright suite must execute against `AUTH-CHK-01` through `AUTH-CHK-07`.
* **Risk Assessment:** High risk of session cookie conflicts between global Supabase Auth tokens (`sb-access-token`) and custom kitchen PIN cookies (`pp_kitchen_session`). Mitigation: Namespace kitchen cookies cleanly and isolate middleware guards.
* **Rollback Strategy:** If authentication regressions occur, revert git branch to checkpoint 26 and execute `supabase db reset` to drop migration `006`.
* **Definition of Done:** 100% compliance with `AUTH-CHK-01` through `AUTH-CHK-07`; zero type errors; zero ESLint warnings; zero `console.log` statements; zero client-side SQL queries.

---
**ENFORCEMENT NOTICE:**  
**DO NOT WRITE OR MODIFY SOURCE CODE UNTIL THE PRINCIPAL ENGINEERING LEADERSHIP TEAM OFFICIALLY RATIFIES ECI-001, ECI-002, AND ECI-003.**
