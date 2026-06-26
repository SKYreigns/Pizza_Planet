# 📐 Pizza Planet — Engineering Standards

> **Version:** 1.0
> **Status:** RATIFIED — Active Constitution
> **Last Updated:** June 20, 2026
> **Authority:** Principal Software Architect & Technical Lead
> **Scope:** All code generated, reviewed, or merged into this repository

---

> [!IMPORTANT]
> This document is the **permanent engineering constitution** for Pizza Planet. Every rule defined here supersedes preferences, shortcuts, or convenience. Non-conforming code must be rejected at review regardless of functional correctness.

---

## Table of Contents

1. [Architectural Principles](#1-architectural-principles)
2. [Folder Ownership Rules](#2-folder-ownership-rules)
3. [Component Rules](#3-component-rules)
4. [State Management Rules](#4-state-management-rules)
5. [Database Rules](#5-database-rules)
6. [API Rules](#6-api-rules)
7. [Security Rules](#7-security-rules)
8. [Styling Rules](#8-styling-rules)
9. [Performance Rules](#9-performance-rules)
10. [Code Review Checklist](#10-code-review-checklist)
11. [Technical Debt Policy](#11-technical-debt-policy)
12. [AI Code Generation Rules](#12-ai-code-generation-rules)

---

## 1. Architectural Principles

These six principles form the foundation of every engineering decision on this project. All code must be evaluated against them.

---

### 1.1 Server Components First

**Rule:** React Server Components (RSC) are the default. Client Components are the exception.

- Every new component begins as a Server Component.
- The directive `'use client'` is added **only** when the component requires one of: `useState`, `useEffect`, browser APIs, event handlers, or third-party hooks that depend on the client.
- `'use client'` is placed at the **leaf** of the component tree — never at a layout or page level unless absolutely unavoidable.
- Server Components must **never** contain `'use client'` anywhere in their rendering chain if the goal is to keep them server-rendered.

**Rationale:** RSC directly reduces the JavaScript bundle sent to the client, improving LCP and TTI. The target initial JS bundle is `< 200KB`.

**Anti-pattern:**
```typescript
// ❌ WRONG: Promoting an entire page to client because one sub-component needs a hook
'use client'
export default function MenuPage() { ... }

// ✅ CORRECT: Keep MenuPage as RSC; isolate the interactive portion
export default function MenuPage() {
  return <ProductGrid><CategoryFilter /></ProductGrid> // RSC
}
// CategoryFilter.tsx -> 'use client' only here
```

---

### 1.2 Server Actions First

**Rule:** All data mutations from the UI must go through Next.js Server Actions (`'use server'`). HTTP Route Handlers are reserved exclusively for external webhooks and third-party callbacks.

- Mutations: `createOrder`, `updateOrderStatus`, `createProduct`, `toggleAvailability`, etc. — all Server Actions.
- Route Handlers: `/api/webhooks/razorpay`, `/api/revalidate` — the only permitted Route Handlers.
- A Server Action is never the same file as a Client Component. Server Actions live in `src/actions/`.
- Every Server Action follows the mandatory pipeline:
  1. Authenticate (validate session)
  2. Authorize (verify role)
  3. Validate input (Zod schema)
  4. Execute business logic
  5. Mutate database (server Supabase client)
  6. Trigger side effects (revalidation, notifications)
  7. Return typed `ActionResponse<T>`

**Forbidden:** Creating a `fetch('/api/some-route')` from a Client Component to perform a mutation that could be a Server Action.

---

### 1.3 Mobile First

**Rule:** All CSS and layout decisions are written for mobile viewports first. Desktop styles are additive overrides using `md:` and `lg:` Tailwind prefixes.

- Base styles (no prefix) target screens `< 768px`.
- `md:` targets tablet (768px–1279px).
- `lg:` / `xl:` targets desktop (≥ 1280px).
- All interactive elements must meet a minimum touch target of **44×44px**.
- No horizontal overflow is permitted at any viewport.
- iOS safe-area insets must be respected using `pb-safe` / `pt-safe` where applicable.

**Anti-pattern:**
```css
/* ❌ WRONG: Desktop-first with a mobile override */
.card { display: grid; grid-template-columns: repeat(3, 1fr); }
@media (max-width: 768px) { .card { grid-template-columns: 1fr; } }

/* ✅ CORRECT: Mobile-first */
.card { display: grid; grid-template-columns: 1fr; }
@media (min-width: 768px) { .card { grid-template-columns: repeat(3, 1fr); } }
```

---

### 1.4 Accessibility First

**Rule:** Accessibility is a first-class engineering requirement, not an afterthought. All interactive UI must meet WCAG 2.1 Level AA.

- Semantic HTML is mandatory. Use `<nav>`, `<main>`, `<article>`, `<section>`, `<button>`, `<label>` appropriately.
- Every interactive element must be keyboard-operable with a visible `focus-visible` ring styled in brand colors.
- Dynamic UI updates (cart count, order status, toasts) must use ARIA live regions (`aria-live="polite"` or `"assertive"`).
- Modals and drawers must trap focus. On close, focus returns to the trigger element.
- All images require meaningful `alt` text. Decorative images use `alt=""`.
- Form inputs require `aria-invalid` and `aria-describedby` pointing to inline error message IDs.
- All animations must respect `prefers-reduced-motion`. Wrap Framer Motion animations accordingly.

**Color Contrast Minimums:**
- Body text: 4.5:1 contrast ratio minimum.
- Large text / icons: 3:1 contrast ratio minimum.

---

### 1.5 Realtime Only Where Required

**Rule:** Supabase Realtime subscriptions are expensive WebSocket connections. They are only established for views where live data is operationally critical.

**Permitted Realtime subscriptions:**
| View | Channel | Justification |
|---|---|---|
| Admin Order Dashboard | `admin-dashboard` | Operators need instant order awareness |
| Kitchen Display | `kitchen-queue` | Food prep depends on live queue |
| Customer Order Tracking | `order-tracking-{token}` | Customer-facing live status |
| Delivery Rider View | `delivery-queue-{riderId}` | Rider must know assignment instantly |
| Storefront (store open/closed) | `store-status` | Availability must propagate in < 1 minute |
| Menu (product availability) | `products` | Out-of-stock must grey out immediately |

**Forbidden:** Establishing a Realtime subscription for any view not on the approved list above without explicit architectural approval. Do not use Realtime as a substitute for proper server-side rendering of static data.

**Lifecycle Rule:** Every Realtime subscription created in a `useEffect` must be unsubscribed in the cleanup function. Memory leaks from orphaned channels are a zero-tolerance violation.

```typescript
// ✅ CORRECT: Always clean up
useEffect(() => {
  const channel = supabase.channel('kitchen-queue').on(...)
  return () => { supabase.removeChannel(channel) }
}, [])
```

---

### 1.6 Simplicity Over Abstraction

**Rule:** Do not create abstractions speculatively. Build for the current, documented requirement. Abstract only when the same pattern appears in three or more distinct places.

- No wrapper components that only pass props through without adding logic or style.
- No custom hooks that are only called from one component.
- No utility functions that are only used once.
- No generic "manager" classes or "factory" patterns unless complexity explicitly demands them.
- Prefer flat, readable code over clever, compact code.

**The test:** If a future engineer cannot understand the purpose of a function within 30 seconds of reading it, it is too abstract or too clever.

---

## 2. Folder Ownership Rules

### 2.1 Directory Map and Ownership

```
src/
├── app/                   # Next.js routing layer ONLY
│   ├── (storefront)/      # Customer-facing route group
│   ├── (admin)/           # Admin & operations route group
│   ├── (kitchen)/         # Kitchen Display System route group
│   ├── (delivery)/        # Delivery rider route group
│   ├── auth/              # Authentication pages
│   └── api/               # External webhook Route Handlers ONLY
├── components/            # Shared, reusable UI components
│   ├── ui/                # shadcn/ui primitives (auto-generated, do not edit)
│   ├── layout/            # Structural components (Navbar, Footer, Sidebar)
│   └── shared/            # Cross-domain shared components (ProductCard, Badge)
├── features/              # Domain-specific feature modules
│   ├── menu/              # Menu browsing, product customizer
│   ├── cart/              # Cart drawer, cart logic
│   ├── checkout/          # Checkout flow, Razorpay integration
│   ├── tracking/          # Order tracking, status timeline
│   ├── auth/              # OTP login, session handling
│   ├── profile/           # Customer account, address book
│   └── admin/             # KDS, product CRUD, revenue dashboard
├── stores/                # Zustand global state stores
├── hooks/                 # Shared custom React hooks
├── actions/               # Next.js Server Actions (all mutations)
├── types/                 # TypeScript types, interfaces, Zod schemas
├── lib/                   # Framework-agnostic utilities
│   └── supabase/          # Supabase client factories
└── providers/             # React Context Providers
```

---

### 2.2 `app/` — What Belongs Here

**Belongs:**
- `layout.tsx` files for each route group.
- `page.tsx` files for each route.
- `loading.tsx` skeleton files for each route.
- `error.tsx` error boundary files.
- `not-found.tsx` for 404 states.
- `api/` Route Handlers for external webhooks only.

**Forbidden:**
- Business logic of any kind inside a `page.tsx` or `layout.tsx`. Pages are composition roots only.
- Direct Supabase queries inside `page.tsx`. Data fetching is delegated to Server Actions or `lib/`.
- UI component definitions inside `app/`. All components live in `components/` or `features/`.
- State management imports (`useStore`) inside Server Component pages.

---

### 2.3 `features/` — What Belongs Here

**Belongs:**
- Components that are domain-specific and unlikely to be reused across domains.
- Custom hooks used exclusively within that feature (e.g., `useCartSync`, `useCustomizerPrice`).
- Feature-local TypeScript types that are not shared cross-domain.
- Feature-local Zod validation schemas.

**Forbidden:**
- A feature importing deeply into another feature's internals.

  ```typescript
  // ❌ WRONG: features cross-pollinating
  import { CartItem } from '@/features/cart/components/CartItem'
  // in features/checkout/...

  // ✅ CORRECT: lift to shared components or types
  import { CartItemType } from '@/types/cart'
  ```

- Global state stores inside a feature directory. Stores live in `src/stores/`.
- Server Actions inside a feature directory. Actions live in `src/actions/`.

---

### 2.4 `components/` — What Belongs Here

**Belongs:**
- Primitive UI components: `Button`, `Input`, `Badge`, `Modal`, `Skeleton`, `Stepper`, `Toast`.
- Layout structure: `Navbar`, `Footer`, `Sidebar`, `MobileBottomBar`.
- Cross-domain shared components: `ProductCard`, `OrderStatusBadge`.

**Forbidden:**
- Business logic inside shared components. A `ProductCard` renders data — it does not fetch it.
- Hardcoded data or strings. All text content comes from props or a future i18n layer.
- Direct Supabase calls inside any component in this directory.

---

### 2.5 `stores/` — What Belongs Here

**Belongs:**
- Zustand store definitions: `useCartStore`, `useCustomizerStore`, `useUIStore`, `useOrderStore`, `useKitchenStore`, `useAuthStore`.
- Store slices if a store grows large.

**Forbidden:**
- API calls (fetch / Supabase queries) directly inside a Zustand store action. Stores hold and transform state only. Data fetching happens in Server Actions or Server Components; results are passed into stores.
- More than one store file per domain concept.

---

### 2.6 `actions/` — What Belongs Here

**Belongs:**
- Every `'use server'` function that mutates or reads authenticated data.
- Grouped by domain: `actions/orders.ts`, `actions/products.ts`, `actions/auth.ts`.

**Forbidden:**
- Client-side code or imports inside an actions file.
- Returning raw Supabase errors to the client. Always return the standardized `ActionResponse<T>`.
- Calling one Server Action from another Server Action directly in a way that creates a chain. If orchestration is needed, extract shared logic into `lib/`.

---

### 2.7 `hooks/` — What Belongs Here

**Belongs:**
- Custom React hooks shared across multiple features: `useRealtime`, `useOptimistic`, `useDebounce`, `useMediaQuery`.

**Forbidden:**
- Hooks that are only used in a single feature (those belong in the feature's directory).
- Hooks that contain Server Action calls — hooks are client-side; actions are invoked via `startTransition` or form actions, not inside hooks.

---

### 2.8 `types/` — What Belongs Here

**Belongs:**
- TypeScript `interface` and `type` definitions shared across multiple domains.
- Shared Zod schemas that are reused in both Server Actions and Client forms.
- Database row type definitions (exported from Supabase CLI-generated types).
- The `ActionResponse<T>` generic type.
- Environment variable typings (`env.d.ts`).

**Forbidden:**
- Runtime logic of any kind. This directory is purely type declarations.
- Component-level prop types (those are co-located with the component).

---

### 2.9 `lib/` — What Belongs Here

**Belongs:**
- `supabase/client.ts` — Browser Supabase client factory.
- `supabase/server.ts` — Server Supabase client factory (async, cookie-based).
- `utils.ts` — The `cn()` (clsx + tailwind-merge) utility and other pure functions.
- Framework-agnostic helpers: formatters (`formatPrice`, `formatDate`), validators (`isValidPhone`).

**Forbidden:**
- React-specific code (hooks, components, JSX) in `lib/`.
- Business logic that belongs in a Server Action.
- Supabase queries that bypass the client factories in `lib/supabase/`.

---

## 3. Component Rules

### 3.1 Maximum Component Responsibilities

Each component has **one primary responsibility**. A component that is doing more than one of the following is doing too much and must be split:

- Rendering data structure (layout, lists, grids)
- Rendering a single interactive control (button, input, toggle)
- Managing a single piece of UI state (open/closed modal, selected tab)
- Handling a single form section

**Rule of thumb:** If a component file exceeds 150 lines of JSX/TSX, it is a candidate for decomposition.

---

### 3.2 Server vs Client Component Rules

| Signal | Component Type |
|---|---|
| Reads data via async/await at the top level | Server Component |
| Uses `useState`, `useReducer`, `useContext` | Client Component |
| Uses `useEffect` | Client Component |
| Handles DOM events (`onClick`, `onChange`) | Client Component |
| Uses browser APIs (`window`, `localStorage`) | Client Component |
| Subscribes to Supabase Realtime | Client Component |
| Renders only from props with no hooks | Server Component (preferred) |

**Explicit boundary rule:** When a Server Component must render a Client Component, the data it needs is passed as props at the boundary. The Client Component does **not** fetch its own data independently unless it is responding to a user action.

```typescript
// ✅ CORRECT: Server Component fetches, passes to Client
// app/(storefront)/menu/page.tsx (Server Component)
export default async function MenuPage() {
  const products = await getProducts() // Server Action / lib call
  return <ProductGrid products={products} /> // ProductGrid is a Server Component
}

// features/menu/components/CategoryFilter.tsx ('use client')
// CategoryFilter receives initial categories as a prop, handles client-side filtering
```

---

### 3.3 State Ownership Rules

- **UI state** (is the modal open? which tab is active?) belongs in the component that renders it, using `useState`. If it needs to be shared across siblings, lift to the nearest common ancestor or `useUIStore`.
- **Cart state** belongs exclusively in `useCartStore`.
- **Form state** belongs in `react-hook-form`. Never manage form state with `useState` field-by-field.
- **Server state** (menu data, order details) is fetched in Server Components and passed as props. It is never re-fetched client-side unless a mutation requires it.
- **Realtime state** (live order status, kitchen queue) is stored in a Zustand store and updated by the Realtime subscription handler.

---

### 3.4 Reusability Rules

A component is promoted to `components/shared/` only when it is:
1. Used in **two or more distinct features** or pages.
2. **Stateless** from a business logic perspective (renders from props only).
3. **Fully typed** with a documented props interface.

Components that are used only within one feature remain inside that feature's directory.

---

### 3.5 Component Anti-Patterns

The following are prohibited without exception:

| Anti-Pattern | Why It Is Forbidden |
|---|---|
| `useEffect` for data fetching on mount | Causes waterfalls; use RSC or Server Actions instead |
| Direct `fetch()` calls inside a component | All data fetching is server-side or via Server Actions |
| `any` type on props | Destroys TypeScript's value; use proper types from `src/types/` |
| Inline styles (`style={{ ... }}`) | Prevents design system enforcement; use Tailwind utilities |
| Business logic inside a render function | Components render; `lib/` and `actions/` compute |
| `console.log` statements | Must be removed before merge |
| Hardcoded currency, text, or color values | Use design tokens and constants |
| Prop drilling beyond 2 levels | Use Zustand or React Context |

---

## 4. State Management Rules

### 4.1 Zustand — What Belongs Here

Zustand stores are for **client-side state that must persist across component unmounts or be shared across the component tree**.

| Store | Contents |
|---|---|
| `useCartStore` | Cart items, applied promo code, session ID |
| `useCustomizerStore` | Active customization selections (ephemeral) |
| `useUIStore` | Cart drawer open, mobile menu open, active toast list |
| `useOrderStore` | Active order being tracked, status history from Realtime |
| `useKitchenStore` | Kitchen order queue populated by Realtime |
| `useAuthStore` | Current user session, role |

**Rules:**
- Stores do **not** contain derived computed values that can be calculated from other state — use `get()` selectors or compute inline at the component level.
- Stores are **not** a cache for server data. If data can be fetched fresh in a Server Component, it does not belong in a Zustand store.
- Every store action must be a pure state mutation. No async calls, no `fetch`, no Supabase queries inside store actions.

---

### 4.2 URL State — What Belongs Here

URL query parameters and path segments are the source of truth for:

- Active menu category filter (`?category=pizzas`)
- Search query (`?q=margherita`)
- Pagination (`?page=2`)
- Admin filter state (`?status=preparing&date=today`)

**Rule:** Any UI state that a user would expect to survive a page refresh or be shareable via a link belongs in the URL, not in Zustand.

---

### 4.3 Server State — What Belongs Here

Server state is data that originates in the database and is rendered by the server.

- Menu products and categories → fetched in Server Components via `lib/supabase/server.ts`
- Order details for admin → fetched via Server Actions
- User profile → fetched via Server Actions after authentication

**Rule:** Server state is **never duplicated** into a Zustand store unless a Realtime subscription needs to update it live. Even then, the Zustand store is populated once from the server and then kept fresh by Realtime — not refetched by the client on demand.

---

### 4.4 Component State — What Belongs Here

`useState` is appropriate for state that is:

- Ephemeral and local to a single component (e.g., `isLoading`, `isExpanded`)
- Not needed by any other component in the tree
- Not expected to survive a component unmount

**Anti-patterns that create unnecessary global state:**

| Violation | Correct Approach |
|---|---|
| Putting a form field value into Zustand | Use `react-hook-form` |
| Putting a loading spinner state into Zustand | Use `useState` locally |
| Putting modal open/closed state into Zustand (unless cross-tree) | Use `useState` in the parent |
| Creating a new Zustand store for a single feature's ephemeral UI | Use `useState` |

---

## 5. Database Rules

### 5.1 RLS First

**Rule:** Every table in the database must have Row Level Security (RLS) **enabled** and **at least one explicitly defined policy**. There are no exceptions.

- The `anon` role can only read publicly appropriate data: non-archived products, categories, active coupons.
- The `authenticated` role can read and write data scoped to their own `auth.uid()`.
- The `owner` role (verified via `profiles.role = 'owner'`) has elevated access to all operational tables.
- `kitchen` and `delivery` roles have narrowly scoped read access matching their operational context.
- **Disabling RLS on any table is a critical security violation.**

```sql
-- ✅ REQUIRED on every table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- ✅ REQUIRED: explicit deny-by-default
CREATE POLICY "deny_all_default" ON table_name AS RESTRICTIVE FOR ALL USING (false);
-- Then add permissive policies on top
```

---

### 5.2 No Direct Admin Bypasses from Client Code

**Rule:** The `SUPABASE_SERVICE_ROLE_KEY` (which bypasses RLS) must **never** be used in or near client-side code.

The service role key is exclusively used in:
- Next.js Server Actions (`'use server'`)
- API Route Handlers in `app/api/`
- Supabase Edge Functions

Before using the service role client in a Server Action, the action **must** manually authenticate and authorize the calling user:

```typescript
// ✅ REQUIRED pattern when using service_role client
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  'use server'
  const authClient = await createClient() // cookie-based, respects RLS
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const profile = await getProfile(user.id) // check role
  if (!['owner', 'kitchen', 'delivery'].includes(profile.role)) {
    return { success: false, error: 'FORBIDDEN' }
  }

  // Only NOW proceed with service_role client
  const adminClient = createAdminClient() // service_role
  // ... mutation
}
```

---

### 5.3 Migration Standards

- All schema changes are managed exclusively through the **Supabase CLI** and version-controlled in `supabase/migrations/`.
- **Never** apply schema changes directly via the Supabase Dashboard SQL editor in staging or production.
- Migration file naming: `YYYYMMDDHHMMSS_descriptive_name.sql` (e.g., `20260620120000_add_address_table.sql`).
- Each migration file must be **idempotent** where possible (use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- Migrations are **append-only**. Never modify or delete an existing migration file after it has been applied to any environment.
- Every migration must be reviewed for: backward compatibility, index impact, RLS policy updates, and data integrity.

**Migration Workflow:**
1. `supabase db diff -f descriptive_name` — generate migration locally
2. Review the generated SQL
3. Commit to `supabase/migrations/`
4. CI applies migration to staging: `supabase db push`
5. After staging validation: promote to production

---

### 5.4 Naming Standards

| Object | Convention | Example |
|---|---|---|
| Tables | `snake_case`, plural | `order_items`, `product_variants` |
| Columns | `snake_case` | `created_at`, `is_available`, `total_amount` |
| Enums | `snake_case` type name, lowercase values | `order_status`, `'pending_payment'` |
| Functions | `snake_case` verbs | `generate_order_short_id()`, `update_modified_column()` |
| Triggers | `trigger_verb_table` | `trigger_generate_order_short_id` |
| Indexes | `idx_table_column(s)` | `idx_orders_status`, `idx_products_category` |
| Policies | Descriptive quoted strings | `"Customers can view their own orders"` |
| Migrations | `TIMESTAMP_descriptive_name` | `20260620000000_initial_schema` |

---

### 5.5 Indexing Standards

**Rule:** Every column used in a `WHERE`, `ORDER BY`, or `JOIN` clause in a high-frequency query path must have an explicit index.

Mandatory indexes (already defined in `DatabaseDesign.md`) are non-negotiable. When adding a new query pattern, ask:

1. Is this column in a `WHERE` clause?
2. Is this column used in a `JOIN`?
3. Is this query executed on every page load or on every order update?

If yes to any, an index is required. Partial indexes (e.g., `WHERE is_archived = false`) are preferred for filtered access patterns.

**Forbidden:** `SELECT *` in production queries. Always select only the columns required.

---

## 6. API Rules

### 6.1 Server Actions First

**Rule:** Server Actions are the only mechanism for client-initiated data mutations. The decision tree for where logic lives:

```
Mutation from UI?
  └── Yes → Server Action in src/actions/
      └── External webhook? → Route Handler in app/api/
          └── Background job? → Inngest function / Edge Function
```

Server Actions are never created inline inside a component file. They are always defined in `src/actions/` and imported.

---

### 6.2 Route Handlers — When Permitted

Route Handlers (`app/api/*/route.ts`) are permitted **only** for:

| Purpose | Example |
|---|---|
| External webhook receivers | `POST /api/webhooks/razorpay` |
| On-demand ISR revalidation | `POST /api/revalidate` |
| Future versioned mobile REST API | `GET /api/v1/mobile/products` |

**Forbidden:** Creating a Route Handler to replace a Server Action for internal UI mutations.

---

### 6.3 Validation Requirements

Every Server Action and Route Handler must validate all inputs using **Zod** before any business logic executes:

```typescript
// ✅ REQUIRED pattern
const schema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.nativeEnum(OrderStatus),
})

export async function updateOrderStatus(input: unknown): Promise<ActionResponse<void>> {
  'use server'
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'VALIDATION_ERROR' }
  // proceed with parsed.data
}
```

**Specific rules:**
- UUIDs: `z.string().uuid()`
- Phone numbers: `z.string().regex(/^\+?[0-9]{10,15}$/)`
- Monetary amounts: `z.number().int().nonnegative()` (Paisa — no floats)
- Text inputs: `z.string().max(255)` at minimum
- Arrays (cart items): `.max(20)` to prevent payload bloat
- Order status: `z.nativeEnum(OrderStatus)` — never a raw string

---

### 6.4 Error Handling Standards

**Rule:** Server Actions never throw raw errors to the client. Every Server Action returns:

```typescript
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
```

Standard error codes:

| Code | Meaning |
|---|---|
| `UNAUTHORIZED` | No valid session |
| `FORBIDDEN` | Session exists but role is insufficient |
| `VALIDATION_ERROR` | Zod parse failure |
| `OUT_OF_STOCK` | Cart contains unavailable items |
| `PRICE_MISMATCH` | Client total does not match server recalculation |
| `NOT_FOUND` | Requested record does not exist |
| `INTERNAL_ERROR` | Catch-all for unexpected failures |

Errors are logged to Sentry with order/user context tags. They are **never** returned verbatim as raw database error messages.

---

## 7. Security Rules

### 7.1 Authentication

- All authentication is handled by **Supabase Auth**. No custom authentication system is to be implemented.
- Sessions are stored in **httpOnly, Secure, SameSite=Lax cookies** managed by Next.js middleware via `@supabase/ssr`.
- The Next.js middleware at `src/middleware.ts` must call `supabase.auth.getUser()` on every request to refresh the session token.
- Session tokens expire after **1 hour**. Refresh tokens expire after **30 days**.
- CSRF protection is provided natively by Next.js Server Actions. No additional CSRF tokens are needed for Server Actions.

---

### 7.2 Authorization

- Authorization is enforced at **two layers**:
  1. **Database layer:** RLS policies on every table.
  2. **Application layer:** Role check at the start of every Server Action that requires a specific role.
- Middleware enforces route-level access. The `(admin)` route group requires `role = 'owner'`. `(kitchen)` requires `role = 'kitchen'`. `(delivery)` requires `role = 'delivery'`.
- Role is read from `profiles.role` — never from JWT claims alone, as JWT metadata can be stale.

---

### 7.3 Environment Variables

- All environment variables are typed in `src/types/env.d.ts`.
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Only non-sensitive values may use this prefix.
- Variables without the prefix are server-only. They are never accessed in Client Components.

| Variable | Prefix | Who Can Access |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Browser + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Browser + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | None | Server only |
| `RAZORPAY_KEY_SECRET` | None | Server only |
| `RAZORPAY_WEBHOOK_SECRET` | None | Server only |
| `WHATSAPP_API_TOKEN` | None | Server only (Edge Functions) |

---

### 7.4 Secrets Management

- Secrets are stored in `.env.local` for local development (this file is in `.gitignore` and is never committed).
- Production secrets are managed through Vercel's Environment Variables dashboard.
- **No secret is hardcoded in source code.** If a secret is found in the codebase, the PR is rejected and the secret is rotated immediately.
- The `.env.example` file contains all required variable names with placeholder values and is committed to the repository.

---

### 7.5 Service Role Usage

- The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. Its use is classified as **high-risk**.
- It is initialized in `lib/supabase/server.ts` only.
- It is used only after explicit authentication and authorization checks (see Rule 5.2).
- Every use of the service role client must have a code comment explaining **why** RLS bypass is necessary for that specific operation.

---

### 7.6 Forbidden Security Practices

The following are zero-tolerance violations:

- ❌ Exposing `SUPABASE_SERVICE_ROLE_KEY` to the client (via `NEXT_PUBLIC_` prefix or in a Client Component import)
- ❌ Disabling RLS on any table (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`)
- ❌ Using `SELECT *` in queries that could return sensitive fields (phone numbers, tokens)
- ❌ Returning raw database error messages to the client
- ❌ Trusting client-provided prices or totals without server-side recalculation
- ❌ Storing secrets in source code or committed `.env` files
- ❌ Processing a Razorpay webhook without verifying the `x-razorpay-signature` header
- ❌ Creating user accounts with `owner` or `kitchen` roles without admin approval flow

---

## 8. Styling Rules

### 8.1 Tailwind Usage

- Tailwind CSS is the **only** styling mechanism. No external CSS-in-JS libraries, no plain `.css` module files for component styles, and no inline `style={{}}` props.
- All styles are applied via Tailwind utility classes.
- The `cn()` utility (`src/lib/utils.ts`) is used for all conditional class merging:
  ```typescript
  import { cn } from '@/lib/utils'
  // ✅ CORRECT
  <div className={cn('base-class', isActive && 'active-class', className)} />
  ```
- **Never** use string concatenation to build class names. Always use `cn()`.

---

### 8.2 Design Token Usage

Design tokens are defined as CSS custom properties in `src/app/globals.css` and registered in the Tailwind `@theme` block. They are the **only** source of truth for colors, spacing semantics, and radius values.

| Token Category | CSS Variable | Tailwind Class |
|---|---|---|
| Primary Brand | `--primary` (#E74C3C) | `bg-primary`, `text-primary` |
| Background | `--background` (#FFF8F0 light / #091D2E dark) | `bg-background` |
| Foreground | `--foreground` | `text-foreground` |
| Card Surface | `--card` | `bg-card` |
| Border | `--border` | `border-border` |
| Muted Text | `--muted-foreground` | `text-muted-foreground` |
| Destructive | `--destructive` | `text-destructive` |
| Radius | `--radius` (0.5rem base) | `rounded-lg`, `rounded-xl` |

**Forbidden:**
- Hardcoding hex color values in Tailwind classes (e.g., `bg-[#E74C3C]`) instead of using `bg-primary`.
- Using non-token colors (e.g., `bg-red-500`) for brand or semantic UI states.
- Overriding token values inline for a specific component without updating the token system.

---

### 8.3 Glassmorphism Rules

The `.liquid-glass-surface` utility class is the standard glassmorphism pattern for this project.

```css
/* Definition in globals.css */
.liquid-glass-surface {
  @apply bg-background/60 backdrop-blur-md backdrop-saturate-150
         border border-white/20 dark:border-white/10
         shadow-lg isolation-auto;
}
```

**Usage rules:**
- Apply `.liquid-glass-surface` to overlay panels, product cards with glass treatment, cart drawers, and modals.
- **Anti-blur text isolation is mandatory.** Never apply `opacity` to a container that holds text. Use `rgba` backgrounds or `bg-background/60` — the text itself must remain at full opacity.
- Blur levels are standardized:
  - Subtle (headers, nav): `backdrop-blur-sm`
  - Standard (cards, panels): `backdrop-blur-md`
  - Heavy (modals, drawers): `backdrop-blur-xl`
- Do not apply glass effects to elements that do not have a meaningful background layer behind them. The blur effect requires content underneath.

---

### 8.4 Responsive Requirements

- All components must be tested at three breakpoints: 375px (mobile), 768px (tablet), 1280px (desktop).
- Every grid, flex layout, and absolute position must be verified for no horizontal overflow at 375px.
- Typography scales must not cause text truncation or overflow on mobile.
- Card components must use a single-column layout on mobile, multi-column on desktop.

**Preventing Design Drift:**
- New color values require an update to the CSS token system — never a one-off utility class.
- New spacing patterns that deviate from the 4px base grid must be justified.
- Component-level glassmorphism treatments must use the standardized utility — no ad-hoc `backdrop-blur` combinations.

---

## 9. Performance Rules

### 9.1 Bundle Limits

| Budget | Limit | Tool |
|---|---|---|
| Initial JS bundle | < 200KB | Next.js Bundle Analyzer |
| Largest Contentful Paint (LCP) | < 2.5 seconds | Lighthouse CI |
| First Contentful Paint (FCP) | < 1.5 seconds | Lighthouse CI |
| Time to Interactive (TTI) | < 3.5 seconds | Lighthouse CI |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse CI |
| API Response Time (P95) | < 500ms | Supabase Monitoring |

Any new feature that causes the initial bundle to exceed 200KB must dynamically import its heaviest dependencies.

---

### 9.2 Lazy Loading

Heavy third-party libraries must be dynamically imported using `next/dynamic`:

```typescript
// ✅ REQUIRED for heavy dependencies
const RazorpayButton = dynamic(() => import('@/features/checkout/RazorpayButton'), {
  ssr: false,
  loading: () => <Skeleton className="h-12 w-full" />
})
```

Mandatory lazy-loaded libraries:
- Razorpay SDK
- Lottie animations
- Any charting libraries (Phase 2 analytics)
- Any map libraries

Images below the fold must use `loading="lazy"` (the default for `next/image`).

---

### 9.3 Image Optimization

- All images must use the `next/image` component. Raw `<img>` tags are forbidden.
- Images are served in WebP format with `next/image` automatic format selection.
- Product images uploaded to Supabase Storage are auto-resized to a maximum of 800px width at upload time.
- Every `next/image` usage must specify `width` and `height` (or use `fill` with a sized container) to prevent CLS.
- Hero images and above-the-fold product images use `priority={true}` to preload.

```typescript
// ✅ CORRECT
<Image src={product.image_url} alt={product.name} width={400} height={300} />

// ❌ FORBIDDEN
<img src={product.image_url} alt={product.name} />
```

---

### 9.4 Caching Rules

| Data Type | Strategy | Revalidation |
|---|---|---|
| Homepage | ISR | Every 60 seconds |
| Menu pages | ISR | Every 60 seconds |
| Product detail pages | ISR | Every 60 seconds, + on-demand via `revalidateTag('products')` after admin update |
| Admin dashboard | No cache (dynamic) | N/A — always fresh |
| Order tracking | No cache (dynamic) | N/A — Realtime |
| Supabase Realtime | WebSocket, no cache | N/A |

- `revalidateTag('products')` must be called in any Server Action that mutates a product.
- `revalidatePath('/menu')` must be called after category or availability changes.
- Never use `cache: 'no-store'` on public-facing menu pages — use ISR instead.

---

## 10. Code Review Checklist

Every unit of AI-generated or human-written code submitted for review must satisfy **all** of the following before acceptance. A single `NO` is grounds for rejection.

### Architecture

- [ ] Does this component default to Server Component, with `'use client'` added only when strictly necessary?
- [ ] Is all mutation logic in a Server Action in `src/actions/`, not inline in a component?
- [ ] Does the code adhere to the correct `src/` folder ownership rules?
- [ ] Is there no cross-feature import of internal component details?

### Security

- [ ] Is the `SUPABASE_SERVICE_ROLE_KEY` used only in server-side contexts with prior auth/authz checks?
- [ ] Are all inputs to Server Actions and Route Handlers validated with Zod?
- [ ] Does no query return `SELECT *` where sensitive columns could be exposed?
- [ ] Is every new table protected by RLS?

### State Management

- [ ] Is client state using the correct Zustand store, URL state, or `useState` as per the rules?
- [ ] Is server state fetched server-side and not re-fetched unnecessarily on the client?
- [ ] Are all Realtime subscriptions cleaned up in `useEffect` return functions?

### Styling

- [ ] Are all colors using design token Tailwind classes (e.g., `bg-primary`, not `bg-[#E74C3C]`)?
- [ ] Is the `cn()` utility used for all conditional class merging?
- [ ] Is the mobile layout verified at 375px viewport width?
- [ ] Is glassmorphism applied using `.liquid-glass-surface` or the approved blur tokens?

### Performance

- [ ] Are all images using `next/image` with explicit dimensions?
- [ ] Are heavy libraries (Razorpay, Lottie) lazy-loaded with `next/dynamic`?
- [ ] Is the ISR strategy (`revalidate`) correctly set for public-facing pages?
- [ ] Does cache invalidation (`revalidateTag`) trigger after the relevant mutation?

### Accessibility

- [ ] Is semantic HTML used (no `<div>` as a button, no `<span>` as a heading)?
- [ ] Do all interactive elements have visible focus states (`focus-visible:ring`)?
- [ ] Do all images have meaningful `alt` text?
- [ ] Do dynamic updates use ARIA live regions?

### Code Quality

- [ ] Are there **zero** `TODO`, `FIXME`, `HACK`, or `any` occurrences?
- [ ] Are there **zero** `console.log` statements?
- [ ] Are there **zero** mock implementations or placeholder data?
- [ ] Are there **zero** hardcoded strings that should be constants or tokens?
- [ ] Does every Server Action return `ActionResponse<T>`, never a raw throw?
- [ ] Are Supabase errors logged to Sentry, never returned raw to the client?

### Database (if applicable)

- [ ] Does the migration file follow the naming convention?
- [ ] Is the migration additive-only (no destructive changes without approval)?
- [ ] Are all new high-frequency query columns indexed?
- [ ] Is RLS enabled and at least one policy defined for any new table?

---

## 11. Technical Debt Policy

### 11.1 Definition of Technical Debt

Technical debt in this project is formally defined as any of the following:

- Code that violates a rule defined in this document but was merged under time pressure.
- An undocumented shortcut that will require rework before scaling.
- A `// TODO:` comment that represents a real feature gap.
- A pattern that works but does not conform to the established architecture (e.g., a `fetch()` call in a component instead of a Server Action).
- A missing index on a high-frequency query column.

### 11.2 How Technical Debt Is Identified

- **At review:** Reviewers flag violations with a `[DEBT]` label in comments. The author must either fix it before merge or open a tracked issue.
- **In code:** If a shortcut is necessary for a release deadline, a `// DEBT(issue-#): description` comment is required inline. No standalone `// TODO` comments without an issue number.
- **At sprint retrospectives:** The team reviews the debt registry and prioritizes paydown in the next sprint.

### 11.3 How Technical Debt Is Tracked

- A dedicated GitHub Issues label: `technical-debt`.
- Every debt issue includes:
  - Description of the shortcut taken.
  - The standard it violates (with section reference from this document).
  - The risk level (Low / Medium / High / Critical).
  - The estimated effort to remediate.

### 11.4 How Technical Debt Is Resolved

- **Critical debt** (security violation, RLS disabled, service role key exposed): Must be resolved in the **current** sprint before any other work.
- **High debt** (architectural drift, missing index on high-traffic column): Must be resolved within **2 sprints**.
- **Medium debt** (missing Zod validation, non-standard state management): Resolved within **4 sprints**.
- **Low debt** (stylistic non-conformance, missing `cn()` usage): Resolved opportunistically.

### 11.5 Debt Non-Negotiables

The following categories of technical debt are **never** deferred and must be resolved immediately:

- Any exposure of a secret key in client-accessible code.
- Any table with RLS disabled in production.
- Any unhandled exception reaching the client with a raw database error message.
- Any mutation bypassing Zod validation.

---

## 12. AI Code Generation Rules

These rules apply to all code generated by AI assistants (Claude, Gemini, GPT, or any other LLM) for this project. AI-generated code is subject to the same review checklist as human-written code.

### 12.1 Mandatory Requirements

All AI-generated code must:

- [ ] Satisfy every rule in this `EngineeringStandards.md` document.
- [ ] Be complete and production-ready. No partial implementations.
- [ ] Be immediately compilable with zero TypeScript errors.
- [ ] Include no `TODO`, `FIXME`, `HACK`, `@ts-ignore`, or `as any` occurrences.
- [ ] Use the correct `ActionResponse<T>` envelope for every Server Action.
- [ ] Use Zod for all input validation in Server Actions.
- [ ] Use `cn()` for all conditional Tailwind class merging.
- [ ] Use `next/image` for all image rendering.
- [ ] Use design tokens, not hardcoded values, for all colors and spacing.

### 12.2 Prohibited Outputs

AI-generated code must **never** include:

| Prohibited Pattern | Reason |
|---|---|
| `// TODO: implement this` | Incomplete code is not acceptable |
| Mock data arrays hardcoded in components | Production code requires real data sources |
| `export const data = [{ id: 1, name: "..." }]` placeholder arrays | Same as above |
| `any` type used to suppress TypeScript errors | Type safety is mandatory |
| Duplicate utility functions already defined in `src/lib/utils.ts` | DRY principle |
| Business logic inside a React component | Components render; `lib/` and `actions/` compute |
| `fetch('/api/...')` calls in Client Components for mutations | Use Server Actions |
| Direct Supabase client calls from Client Components | Use Server Actions for mutations |
| `console.log` for debugging | Not acceptable in production code |
| Inline `style={{}}` props | Use Tailwind utilities |
| Unauthenticated mutations | All write operations require auth checks |
| Hardcoded API keys or secrets | Always use environment variables |
| `SELECT *` in Supabase queries | Always select specific columns |

### 12.3 Code Generation Scope Rule

AI must only generate code for what is **explicitly requested**. It must not:

- Generate files for features not yet specified.
- Add "nice to have" features beyond the current requirement.
- Refactor existing, working code without explicit instruction.
- Change the structure of folders or existing file naming without explicit instruction.

### 12.4 Verification Requirement

After generating code, AI must confirm:

1. The generated file paths match the `src/` folder ownership rules.
2. Every import path uses the `@/` alias correctly.
3. Any new Supabase query selects only necessary columns with correct RLS assumptions noted.
4. Any new Server Action follows the 7-step pipeline (auth → authz → validate → logic → mutate → side effects → return).
5. Any new table or column change is accompanied by the corresponding migration file.

---

> [!NOTE]
> This document is a living standard. Updates require approval from the Technical Lead and must be versioned with a change log entry at the top of the document. All team members and AI assistants operating on this codebase are bound by the version in effect at the time of their code generation.

---

*Pizza Planet Engineering Constitution — Version 1.0 — Ratified June 20, 2026*
