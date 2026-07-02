-- =============================================================================
-- Fix RLS Infinite Recursion on profiles and orders
-- File: 004_fix_rls_recursion.sql
-- Purpose: Creates SECURITY DEFINER role check helpers to prevent infinite
--          recursion and circular dependencies between profiles and orders.
-- =============================================================================

-- 1. SECURITY DEFINER role check functions
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_kitchen()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'kitchen'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_delivery()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'delivery'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_kitchen() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_delivery() TO anon, authenticated, service_role;

-- 2. Recreate policies on public.profiles
DROP POLICY IF EXISTS "profiles_select_owner" ON public.profiles;
CREATE POLICY "profiles_select_owner"
  ON public.profiles FOR SELECT
  USING (public.is_owner());

DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner"
  ON public.profiles FOR UPDATE
  USING (public.is_owner());

DROP POLICY IF EXISTS "profiles_select_delivery" ON public.profiles;
CREATE POLICY "profiles_select_delivery"
  ON public.profiles FOR SELECT
  USING (
    public.is_delivery()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.delivery_rider_id = auth.uid()
        AND o.customer_id = profiles.id
        AND o.status = 'out_for_delivery'
    )
  );

-- 3. Recreate policies on public.orders
DROP POLICY IF EXISTS "orders_select_owner" ON public.orders;
CREATE POLICY "orders_select_owner"
  ON public.orders FOR SELECT
  USING (public.is_owner());

DROP POLICY IF EXISTS "orders_select_kitchen" ON public.orders;
CREATE POLICY "orders_select_kitchen"
  ON public.orders FOR SELECT
  USING (status IN ('confirmed', 'preparing', 'ready') AND public.is_kitchen());

DROP POLICY IF EXISTS "orders_select_delivery" ON public.orders;
CREATE POLICY "orders_select_delivery"
  ON public.orders FOR SELECT
  USING (delivery_rider_id = auth.uid() AND public.is_delivery());

DROP POLICY IF EXISTS "orders_update_owner" ON public.orders;
CREATE POLICY "orders_update_owner"
  ON public.orders FOR UPDATE
  USING (public.is_owner());

DROP POLICY IF EXISTS "orders_update_kitchen" ON public.orders;
CREATE POLICY "orders_update_kitchen"
  ON public.orders FOR UPDATE
  USING (status IN ('confirmed', 'preparing', 'ready') AND public.is_kitchen());

DROP POLICY IF EXISTS "orders_update_delivery" ON public.orders;
CREATE POLICY "orders_update_delivery"
  ON public.orders FOR UPDATE
  USING (delivery_rider_id = auth.uid() AND public.is_delivery());

-- 4. Recreate policies on menu tables to use fast helper
DROP POLICY IF EXISTS "categories_select_owner_all" ON public.categories;
CREATE POLICY "categories_select_owner_all"
  ON public.categories FOR SELECT
  USING (public.is_owner());

DROP POLICY IF EXISTS "products_select_owner_all" ON public.products;
CREATE POLICY "products_select_owner_all"
  ON public.products FOR SELECT
  USING (public.is_owner());
