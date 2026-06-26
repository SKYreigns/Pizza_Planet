# 🗄️ SPRINT 02: SUPABASE & DATABASE

> **Version:** 1.0  
> **Last Updated:** June 19, 2026  
> **Author:** Lead Database Engineer & Supabase Architect  
> **Role:** Execution Plan  
> **Phase Mapping:** Maps directly to Phase 3 & 4 of the Implementation Roadmap

---

## 1. Sprint Goal

**Objective:** Implement the complete Supabase foundation and production database for Pizza Planet.

By the end of this sprint, the local Supabase instance will possess the exact PostgreSQL schema defined in `DatabaseDesign.md`. This includes all tables, strict Row Level Security (RLS) policies, critical database triggers, real-time publication settings, and a robust set of seed data. The database must be ready to interface securely with the Next.js frontend.

---

## 2. Database Setup Tasks

- **Task 1:** Boot the local Supabase Docker container (`supabase start`).
- **Task 2:** Initialize the database migration strategy via the Supabase CLI (`supabase migration new ...`).
- **Task 3:** Write the core schema creation migration (Enums, Tables, Columns, Foreign Keys).
- **Task 4:** Write the Row Level Security (RLS) migration to lock down public access.
- **Task 5:** Write the Database Triggers migration (Timestamps, Short IDs, Profile linkage).
- **Task 6:** Configure Realtime replication on required tables.
- **Task 7:** Configure Supabase Auth settings locally (Email/Password, Phone OTP placeholders).
- **Task 8:** Write the `seed.sql` script to populate dummy products, categories, and settings.
- **Task 9:** Verify the schema locally via Supabase Studio.

---

## 3. Migration Strategy

Migrations will be broken down into explicit, modular steps rather than one massive file. This isolates errors and simplifies debugging.

- `001_core_schema.sql`: Custom Enums, Base Tables, Foreign Keys.
- `002_rls_policies.sql`: `ALTER TABLE ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` statements.
- `003_functions_and_triggers.sql`: PostgreSQL functions (`updated_at`, `handle_new_user`) and triggers.
- `004_analytics_indexes.sql`: B-Tree and GIN indexes for dashboard performance.
- `005_realtime_config.sql`: Adding tables to the `supabase_realtime` publication.

---

## 4. Table Creation Order

To avoid Foreign Key constraint violations, tables MUST be created in the following strict dependency order:

1. **Custom Enums:** `order_status`, `payment_status`, `role_type`, `discount_type`.
2. **Independent Base Tables:**
   - `store_settings` (Singleton)
   - `categories`
   - `coupons`
3. **Auth Dependent Tables:**
   - `profiles` (References `auth.users`)
   - `addresses` (References `profiles`)
4. **Catalog Tables:**
   - `products` (References `categories`)
   - `product_variants` (References `products`)
   - `customizations` (References `products`)
5. **Transactional Tables:**
   - `orders` (References `profiles`, `addresses`, `coupons`)
   - `order_items` (References `orders`, `products`)
   - `payment_log` (References `orders`)

---

## 5. RLS Implementation Plan

Strict "Default Deny" posture. All tables must have RLS enabled.

- **`profiles` / `addresses`**: Customers can `SELECT`, `INSERT`, `UPDATE` only where `auth.uid() = user_id`.
- **`products` / `categories`**: `SELECT` is open to the public (`anon` and `authenticated` roles). Mutations are restricted to `owner`.
- **`orders`**: 
  - Customers can `SELECT` where `auth.uid() = customer_id`.
  - Customers can `INSERT` (to place an order).
  - Admins (`owner`, `kitchen`, `delivery`) can `SELECT` and `UPDATE` all orders.
- **`store_settings`**: Open to public `SELECT`. Mutations restricted to `owner`.

---

## 6. Trigger Implementation Plan

PostgreSQL Triggers handle automated backend logic to reduce API layer complexity.

1. **`set_updated_at`**: Attached to all tables to automatically bump the `updated_at` timestamp on row modifications.
2. **`create_profile_for_user`**: Listens to `INSERT` on `auth.users` and automatically generates a row in `public.profiles`.
3. **`generate_order_short_id`**: Listens to `INSERT` on `orders`. Pulls from a PostgreSQL Sequence (`order_short_id_seq`) to generate a human-readable ID (e.g., `PP-10001`) before the row is finalized.

---

## 7. Realtime Configuration

Supabase Realtime must be explicitly configured to prevent flooding clients with unnecessary data.

Only the following tables will be added to the `supabase_realtime` publication:
- **`orders`**: Required for Kitchen Display System (KDS) and Customer Live Tracking.
- **`store_settings`**: Required to instantly update the UI if the store closes unexpectedly.
- **`products`**: Required to instantly grey-out "Add to Cart" buttons if an item goes out of stock.

---

## 8. Authentication Setup

- **Providers:** Email/Password (for admins), Phone OTP (for customers via WhatsApp/SMS).
- **Configuration:** Update local `config.toml` to mock OTP delivery for local development to prevent blocking the frontend team.
- **Security:** Ensure standard JWT expiration (1 hour) and robust refresh token rotation.

---

## 9. Role Configuration

The system relies on custom RBAC (Role-Based Access Control).

- Roles: `customer` (default), `owner`, `kitchen`, `delivery`.
- Implementation: Rather than using complex JWT claims immediately, roles will be stored securely in the `profiles.role` column. RLS policies will execute `SELECT role FROM profiles WHERE id = auth.uid()` to verify administrative access.

---

## 10. Seed Data Strategy

`supabase/seed.sql` must contain realistic placeholder data to allow the frontend team to build immediately.

- **Admin User:** Inject a dummy `owner` into `auth.users` and `public.profiles`.
- **Store Settings:** Insert the single active row (`is_open = true`).
- **Catalog:** Insert 3 Categories (Pizzas, Sides, Drinks).
- **Products:** Insert 5 realistic Pizzas (Margherita, Pepperoni, Veggie, etc.) with associated variants (Small, Medium, Large) and customizations (Extra Cheese).
- **Coupons:** Insert 1 percentage coupon (`WELCOME10`) and 1 flat-rate coupon.

---

## 11. Local Development Workflow

- The database engineer executes `supabase migration new <name>`.
- Writes the SQL schema.
- Runs `supabase db reset` to completely wipe the local database, re-apply all migrations in order, and inject the seed data.
- If an error occurs, fix the migration file and run `supabase db reset` again.
- NEVER modify the database manually via Supabase Studio during schema development; all changes must exist in migration files.

---

## 12. Validation Checklist

- [ ] `supabase start` runs without Docker errors.
- [ ] `supabase db reset` executes flawlessly and returns `Success`.
- [ ] Querying `products` anonymously via Postman/cURL returns the seed catalog.
- [ ] Attempting to `INSERT` an order anonymously fails via RLS.
- [ ] Creating a user via Auth UI automatically creates a `profiles` row.
- [ ] Inserting a test order generates a `PP-XXXXX` short ID automatically.
- [ ] Modifying a product updates its `updated_at` timestamp automatically.

---

## 13. Common Risks

- **Circular Dependencies:** Creating foreign keys referencing tables that haven't been created yet. *Mitigation:* Strict adherence to the Table Creation Order (Section 4).
- **RLS Infinite Loops:** An RLS policy on `profiles` that queries `profiles` can crash the database. *Mitigation:* Use `auth.uid()` directly instead of querying the table whenever possible.
- **Seed Data Auth ID Mismatch:** Inserting rows into `public.profiles` in `seed.sql` without corresponding matching UUIDs in `auth.users` will fail foreign key constraints. *Mitigation:* Hardcode a static UUID for the test admin user in both tables.

---

## 14. Definition Of Done

Sprint 2 is considered **DONE** when the `supabase db reset` command runs completely cleanly, the Database Studio shows all tables and RLS policies correctly applied, and the frontend team is unblocked to begin fetching catalog data from the local API.

---

## 15. Storage Architecture

- **Bucket Strategy:** Create a single `public` bucket named `product-assets` for all catalog images.
- **Product Images:** Stored under `/products/{product_id}/main.webp`.
- **Category Images:** Stored under `/categories/{category_id}/cover.webp`.
- **Access Policies:**
  - `SELECT`: Fully public to allow anonymous users to view menu images.
  - `INSERT/UPDATE/DELETE`: Restricted strictly to users with the `owner` role.
- **Upload Workflow:** Admins upload images via the dashboard. Images are optimized on the frontend to WebP before upload to save bandwidth and storage costs.

---

## 16. Backup & Recovery Strategy

- **Local Recovery:** Use `supabase db dump` to occasionally save complex dummy states if `seed.sql` is insufficient. `supabase db reset` handles standard clean slates.
- **Production Recovery:** Enable Supabase Point-in-Time Recovery (PITR) for the production database.
- **Migration Rollback Philosophy:** Never manually delete tables in production. Always write a new `down` migration or a forward-fixing `up` migration to correct mistakes.
- **Backup Verification Checklist:** Verify PITR is active in the Supabase Dashboard before the system goes live.

---

## 17. Database Observability

- **Slow Query Monitoring:** Enable Supabase `pg_stat_statements` to monitor and identify unindexed, slow-running queries.
- **Auth Monitoring:** Use the Supabase Auth Logs to track failed login attempts and OTP failures.
- **Realtime Monitoring:** Monitor concurrent Realtime connections in the Supabase Dashboard to ensure we remain within tier limits.
- **Error Tracking:** API layer (Next.js) will pipe database errors to Sentry.
- **Operational Dashboards:** Rely on the built-in Supabase Database Health and API Analytics dashboards for primary observability.

---

## 18. Coupon & Promotion Seed Strategy

- **Demo Coupons:** `seed.sql` must include:
  - `WELCOME10`: 10% off, max discount ₹100.
  - `FLAT50`: ₹50 off, minimum order ₹500.
- **Validation Expectations:** Coupons must have `valid_from` in the past and `valid_until` in the future to be testable immediately.
- **Testing Requirements:** Frontend developers must be able to test both percentage-based and fixed-amount math using these specific seeds.

---

## 19. Environment Promotion Strategy

- **Local:** `supabase start`. Rapid prototyping, destructive migrations (`db reset` used heavily).
- **Staging (Optional but Recommended):** A separate Supabase project linked to the Vercel Preview branch. Migrations applied manually or via simple CI script.
- **Production:** The primary Supabase project. Migrations MUST be applied via GitHub Actions or the Supabase Dashboard CLI. Destructive commands are strictly forbidden.

---

## 20. Final Sprint Readiness Review

| Dimension | Score | Justification |
|---|---|---|
| **Security** | 10 / 10 | RLS, explicit bucket policies, and RBAC via database columns ensure zero trust. |
| **Scalability** | 9 / 10 | Proper indexing, strict realtime scoping, and PITR backups support production load. |
| **Maintainability** | 10 / 10 | Numbered migration files and predictable environment promotion prevent schema drift. |
| **Operational Readiness** | 9 / 10 | Observability hooks and storage workflows are fully defined for Day-2 operations. |

### Remaining Risks
- **Storage Bucket Configuration:** Forgetting to set the bucket to `public` can break the frontend menu entirely.
  - *Mitigation:* Include the bucket creation and policy directly in the `001_core_schema.sql` migration rather than doing it manually in the dashboard.

### Recommendations
- Perform a "Dry Run" of the `seed.sql` script to ensure all foreign keys align perfectly with the auto-generated UUIDs.

### Final Approval Status: **APPROVED**
The Database and Supabase Sprint 2 execution plan rigorously enforces the architectural designs. It isolates risk via modular migrations, ensures a rock-solid data layer, and establishes the operational observability required for a real business. The database team is cleared to initialize the CLI and begin writing SQL.
