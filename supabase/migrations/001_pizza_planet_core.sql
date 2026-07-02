-- =============================================================================
-- Pizza Planet — Core Migration
-- File    : 001_pizza_planet_core.sql
-- Target  : PostgreSQL 16 / Supabase
-- Created : 2026-06-20
-- =============================================================================

-- =============================================================================
-- SECTION 1: EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for future full-text search on menu


-- =============================================================================
-- SECTION 2: ENUM TYPES
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'guest',
    'customer',
    'kitchen',
    'delivery',
    'owner'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending_payment',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_type AS ENUM (
    'delivery',
    'pickup'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'online',
    'cod'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.option_type AS ENUM (
    'crust',
    'sauce',
    'topping',
    'size'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM (
    'percentage',
    'fixed_amount'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM (
    'order_confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'payment_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM (
    'pending',
    'sent',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- =============================================================================

-- 3.1 auto-update updated_at on any table
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3.2 short human-readable order ID: PP-10001, PP-10002, …
CREATE SEQUENCE IF NOT EXISTS public.order_short_id_seq START WITH 10001 INCREMENT BY 1 NO CYCLE;

CREATE OR REPLACE FUNCTION public.generate_order_short_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.short_id := 'PP-' || nextval('public.order_short_id_seq')::text;
  RETURN NEW;
END;
$$;

-- 3.3 enforce singleton on store_settings
CREATE OR REPLACE FUNCTION public.enforce_single_store_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.store_settings) >= 1 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'store_settings must remain a singleton. Use UPDATE instead of INSERT.';
  END IF;
  RETURN NEW;
END;
$$;

-- 3.4 write product_audit_log after any product change
CREATE OR REPLACE FUNCTION public.log_product_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_diff   jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_diff   := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_diff   := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_diff   := to_jsonb(OLD);
  END IF;

  INSERT INTO public.product_audit_log (product_id, action, changed_fields, changed_by)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_diff,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3.5 append to order_status_log after order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_log (order_id, old_status, new_status, changed_by, role)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      COALESCE(
        (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()),
        'guest'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


-- =============================================================================
-- SECTION 4: CORE TABLES
-- =============================================================================

-- 4.1 profiles — extends auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role NOT NULL DEFAULT 'customer',
  full_name   text        NOT NULL DEFAULT '',
  phone       text        NOT NULL DEFAULT '',
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_phone_format
    CHECK (phone = '' OR phone ~ '^\+?[0-9]{10,15}$'),
  CONSTRAINT profiles_phone_unique
    UNIQUE (phone)
);

-- 4.2 store_settings — singleton global config
CREATE TABLE IF NOT EXISTS public.store_settings (
  id                        integer     PRIMARY KEY DEFAULT 1,
  store_name                text        NOT NULL DEFAULT 'Pizza Planet',
  tagline                   text        NOT NULL DEFAULT 'Out of this world pizza.',
  logo_url                  text,
  is_open                   boolean     NOT NULL DEFAULT true,
  opening_hours             jsonb       NOT NULL DEFAULT '{
    "monday":    {"open": "11:00", "close": "23:00", "closed": false},
    "tuesday":   {"open": "11:00", "close": "23:00", "closed": false},
    "wednesday": {"open": "11:00", "close": "23:00", "closed": false},
    "thursday":  {"open": "11:00", "close": "23:00", "closed": false},
    "friday":    {"open": "11:00", "close": "23:59", "closed": false},
    "saturday":  {"open": "11:00", "close": "23:59", "closed": false},
    "sunday":    {"open": "12:00", "close": "22:00", "closed": false}
  }'::jsonb,
  delivery_radius_km        integer     NOT NULL DEFAULT 5,
  delivery_fee              integer     NOT NULL DEFAULT 4900,
  free_delivery_threshold   integer     NOT NULL DEFAULT 49900,
  tax_rate_percent          numeric(4,2) NOT NULL DEFAULT 5.00,
  cod_max_order_amount      integer     NOT NULL DEFAULT 50000,
  currency                  text        NOT NULL DEFAULT 'INR',
  currency_symbol           text        NOT NULL DEFAULT '₹',
  support_phone             text        NOT NULL DEFAULT '',
  whatsapp_number           text        NOT NULL DEFAULT '',
  support_email             text        NOT NULL DEFAULT '',
  updated_by                uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT store_settings_singleton CHECK (id = 1),
  CONSTRAINT store_settings_delivery_fee_positive CHECK (delivery_fee >= 0),
  CONSTRAINT store_settings_threshold_positive CHECK (free_delivery_threshold >= 0),
  CONSTRAINT store_settings_tax_positive CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100),
  CONSTRAINT store_settings_radius_positive CHECK (delivery_radius_km > 0)
);

-- 4.3 categories
CREATE TABLE IF NOT EXISTS public.categories (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text        NOT NULL,
  name          text        NOT NULL,
  icon_url      text,
  display_order integer     NOT NULL DEFAULT 0,
  is_archived   boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT categories_slug_not_empty CHECK (trim(slug) <> '')
);

-- 4.4 products
CREATE TABLE IF NOT EXISTS public.products (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   uuid        NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name          text        NOT NULL,
  description   text,
  image_url     text,
  base_price    integer     NOT NULL,
  is_veg        boolean     NOT NULL DEFAULT true,
  is_available  boolean     NOT NULL DEFAULT true,
  is_archived   boolean     NOT NULL DEFAULT false,
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT products_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT products_base_price_nonnegative CHECK (base_price >= 0)
);

-- 4.5 product_variants (size tiers)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_name        text    NOT NULL,
  size_label       text    NOT NULL DEFAULT '',
  price_adjustment integer NOT NULL DEFAULT 0,
  display_order    integer NOT NULL DEFAULT 0,

  CONSTRAINT product_variants_size_name_not_empty CHECK (trim(size_name) <> '')
);

-- 4.6 customization_options (master list: crusts, sauces, toppings)
CREATE TABLE IF NOT EXISTS public.customization_options (
  id           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  type         public.option_type NOT NULL,
  name         text             NOT NULL,
  description  text,
  price        integer          NOT NULL DEFAULT 0,
  is_veg       boolean          NOT NULL DEFAULT true,
  is_available boolean          NOT NULL DEFAULT true,
  display_order integer         NOT NULL DEFAULT 0,

  CONSTRAINT customization_options_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT customization_options_price_nonnegative CHECK (price >= 0)
);

-- 4.7 product_customizations (mapping: which products allow which options)
CREATE TABLE IF NOT EXISTS public.product_customizations (
  product_id uuid    NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_id  uuid    NOT NULL REFERENCES public.customization_options(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,

  PRIMARY KEY (product_id, option_id)
);

-- 4.8 coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id                    uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text               NOT NULL,
  description           text,
  discount_type         public.discount_type NOT NULL,
  discount_value        integer            NOT NULL,
  minimum_order_amount  integer            NOT NULL DEFAULT 0,
  maximum_discount_amount integer,
  usage_limit           integer,
  usage_count           integer            NOT NULL DEFAULT 0,
  valid_from            timestamptz        NOT NULL DEFAULT now(),
  valid_until           timestamptz,
  is_active             boolean            NOT NULL DEFAULT true,
  created_at            timestamptz        NOT NULL DEFAULT now(),
  updated_at            timestamptz        NOT NULL DEFAULT now(),

  CONSTRAINT coupons_code_unique UNIQUE (code),
  CONSTRAINT coupons_code_uppercase CHECK (code = upper(code)),
  CONSTRAINT coupons_discount_value_positive CHECK (discount_value > 0),
  CONSTRAINT coupons_percentage_max CHECK (discount_type <> 'percentage' OR discount_value <= 100),
  CONSTRAINT coupons_usage_count_nonnegative CHECK (usage_count >= 0),
  CONSTRAINT coupons_minimum_order_nonnegative CHECK (minimum_order_amount >= 0),
  CONSTRAINT coupons_valid_date_range CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- 4.9 orders — core business transaction
CREATE TABLE IF NOT EXISTS public.orders (
  id                  uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id            text                   NOT NULL,
  order_type          public.order_type      NOT NULL DEFAULT 'delivery',
  customer_id         uuid                   REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name       text                   NOT NULL,
  customer_phone      text                   NOT NULL,
  customer_email      text,
  delivery_address    jsonb,
  special_instructions text,
  status              public.order_status    NOT NULL DEFAULT 'pending_payment',
  payment_method      public.payment_method  NOT NULL,
  payment_status      public.payment_status  NOT NULL DEFAULT 'pending',
  coupon_id           uuid                   REFERENCES public.coupons(id) ON DELETE RESTRICT,
  discount_amount     integer                NOT NULL DEFAULT 0,
  subtotal            integer                NOT NULL,
  tax                 integer                NOT NULL,
  delivery_fee        integer                NOT NULL DEFAULT 0,
  total_amount        integer                NOT NULL,
  razorpay_order_id   text,
  razorpay_payment_id text,
  delivery_rider_id   uuid                   REFERENCES public.profiles(id) ON DELETE SET NULL,
  tracking_token      uuid                   NOT NULL DEFAULT gen_random_uuid(),
  estimated_ready_at  timestamptz,
  created_at          timestamptz            NOT NULL DEFAULT now(),

  CONSTRAINT orders_short_id_unique UNIQUE (short_id),
  CONSTRAINT orders_tracking_token_unique UNIQUE (tracking_token),
  CONSTRAINT orders_customer_name_not_empty CHECK (trim(customer_name) <> ''),
  CONSTRAINT orders_customer_phone_format CHECK (customer_phone ~ '^\+?[0-9]{10,15}$'),
  CONSTRAINT orders_subtotal_nonnegative CHECK (subtotal >= 0),
  CONSTRAINT orders_tax_nonnegative CHECK (tax >= 0),
  CONSTRAINT orders_delivery_fee_nonnegative CHECK (delivery_fee >= 0),
  CONSTRAINT orders_total_nonnegative CHECK (total_amount >= 0),
  CONSTRAINT orders_discount_nonnegative CHECK (discount_amount >= 0),
  CONSTRAINT orders_cod_limit CHECK (
    payment_method <> 'cod' OR total_amount <= 50000
  ),
  CONSTRAINT orders_delivery_requires_address CHECK (
    order_type = 'pickup'
    OR status = 'cancelled'
    OR delivery_address IS NOT NULL
  ),
  CONSTRAINT orders_total_math CHECK (
    total_amount = subtotal - discount_amount + tax + delivery_fee
  )
);

-- 4.10 order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid    NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id          uuid    NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id          uuid    REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  product_name_snapshot text  NOT NULL,
  quantity            integer NOT NULL,
  unit_price          integer NOT NULL,
  total_price         integer NOT NULL,
  special_instructions text,

  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_nonnegative CHECK (unit_price >= 0),
  CONSTRAINT order_items_total_price_nonnegative CHECK (total_price >= 0),
  CONSTRAINT order_items_total_math CHECK (total_price = unit_price * quantity)
);

-- 4.11 order_item_customizations — snapshot of selections at order time
CREATE TABLE IF NOT EXISTS public.order_item_customizations (
  order_item_id  uuid    NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_id      uuid    NOT NULL REFERENCES public.customization_options(id) ON DELETE RESTRICT,
  option_name_snapshot text NOT NULL,
  price_snapshot integer NOT NULL,

  PRIMARY KEY (order_item_id, option_id),
  CONSTRAINT order_item_customizations_price_nonnegative CHECK (price_snapshot >= 0)
);

-- 4.12 order_status_log — immutable append-only ledger
CREATE TABLE IF NOT EXISTS public.order_status_log (
  id          uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid                 NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status  public.order_status,
  new_status  public.order_status  NOT NULL,
  changed_by  uuid                 REFERENCES public.profiles(id) ON DELETE SET NULL,
  role        public.user_role     NOT NULL DEFAULT 'guest',
  note        text,
  created_at  timestamptz          NOT NULL DEFAULT now()
);

-- 4.13 payment_log — ledger of Razorpay webhook events
CREATE TABLE IF NOT EXISTS public.payment_log (
  id                  uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid                  NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  razorpay_payment_id text                  NOT NULL,
  razorpay_order_id   text,
  event_type          text                  NOT NULL,
  amount              integer               NOT NULL,
  status              public.payment_status NOT NULL,
  raw_payload         jsonb                 NOT NULL DEFAULT '{}',
  created_at          timestamptz           NOT NULL DEFAULT now(),

  CONSTRAINT payment_log_amount_nonnegative CHECK (amount >= 0)
);

-- 4.14 notifications — outbound WhatsApp log
CREATE TABLE IF NOT EXISTS public.notifications (
  id                uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid                      NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  phone             text                      NOT NULL,
  notification_type public.notification_type  NOT NULL,
  provider          text                      NOT NULL DEFAULT 'whatsapp',
  status            public.notification_status NOT NULL DEFAULT 'pending',
  payload           jsonb                     NOT NULL DEFAULT '{}',
  error_message     text,
  sent_at           timestamptz,
  created_at        timestamptz               NOT NULL DEFAULT now(),

  CONSTRAINT notifications_phone_format CHECK (phone ~ '^\+?[0-9]{10,15}$')
);

-- 4.15 product_audit_log — immutable ledger of menu changes
CREATE TABLE IF NOT EXISTS public.product_audit_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  action         text        NOT NULL,
  changed_fields jsonb       NOT NULL DEFAULT '{}',
  changed_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_audit_log_action_valid CHECK (action IN ('CREATE', 'UPDATE', 'DELETE'))
);

-- 4.16 failed_jobs — dead letter queue for background processing
CREATE TABLE IF NOT EXISTS public.failed_jobs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name    text        NOT NULL,
  payload       jsonb       NOT NULL DEFAULT '{}',
  error_message text        NOT NULL,
  attempts      integer     NOT NULL DEFAULT 1,
  resolved      boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT failed_jobs_attempts_positive CHECK (attempts > 0)
);


-- =============================================================================
-- SECTION 5: INDEXES
-- =============================================================================

-- orders — high-frequency query paths
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
  ON public.orders(customer_phone);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON public.orders(customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON public.orders(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token
  ON public.orders(tracking_token);

CREATE INDEX IF NOT EXISTS idx_orders_delivery_rider_id
  ON public.orders(delivery_rider_id)
  WHERE delivery_rider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_created_at_status
  ON public.orders(created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(payment_status);

-- products — menu rendering
CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON public.products(category_id)
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_products_availability
  ON public.products(is_available, is_archived);

CREATE INDEX IF NOT EXISTS idx_products_display_order
  ON public.products(category_id, display_order)
  WHERE is_archived = false;

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_display_order
  ON public.categories(display_order)
  WHERE is_archived = false;

-- coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code_active
  ON public.coupons(code)
  WHERE is_active = true;

-- order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items(product_id);

-- order_status_log
CREATE INDEX IF NOT EXISTS idx_order_status_log_order_id
  ON public.order_status_log(order_id);

CREATE INDEX IF NOT EXISTS idx_order_status_log_created_at
  ON public.order_status_log(created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_order_id
  ON public.notifications(order_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON public.notifications(status)
  WHERE status = 'pending';

-- payment_log
CREATE INDEX IF NOT EXISTS idx_payment_log_order_id
  ON public.payment_log(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_log_razorpay_payment_id
  ON public.payment_log(razorpay_payment_id);

-- product_audit_log
CREATE INDEX IF NOT EXISTS idx_product_audit_log_product_id
  ON public.product_audit_log(product_id);

-- customization_options
CREATE INDEX IF NOT EXISTS idx_customization_options_type
  ON public.customization_options(type)
  WHERE is_available = true;

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_profiles_phone
  ON public.profiles(phone)
  WHERE phone <> '';

-- failed_jobs
CREATE INDEX IF NOT EXISTS idx_failed_jobs_unresolved
  ON public.failed_jobs(created_at DESC)
  WHERE resolved = false;


-- =============================================================================
-- SECTION 6: TRIGGERS
-- =============================================================================

-- 6.1 auto-update updated_at
CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE OR REPLACE TRIGGER trg_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE OR REPLACE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE OR REPLACE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE OR REPLACE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- 6.2 generate short order ID before insert
CREATE OR REPLACE TRIGGER trg_orders_generate_short_id
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.short_id IS NULL OR NEW.short_id = '')
  EXECUTE FUNCTION public.generate_order_short_id();

-- 6.3 log order status transitions after update
CREATE OR REPLACE TRIGGER trg_orders_log_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- 6.4 audit product changes
CREATE OR REPLACE TRIGGER trg_products_audit_insert
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_product_change();

CREATE OR REPLACE TRIGGER trg_products_audit_update
  AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_product_change();

-- 6.5 enforce singleton on store_settings
CREATE OR REPLACE TRIGGER trg_store_settings_singleton
  BEFORE INSERT ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_store_settings();


-- =============================================================================
-- SECTION 7: ROW LEVEL SECURITY — ENABLE ON ALL TABLES
-- =============================================================================

ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_options    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_customizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_jobs              ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 8: RLS POLICIES
-- =============================================================================

-- Helper: check if the current user has a specific role in profiles
-- Used inside policy USING expressions to avoid subquery repetition

-- ---------------------------------------------------------------------------
-- 8.1 profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_owner"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_delivery"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_owner"     ON public.profiles;

-- Any authenticated user can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Owner can read all profiles (for staff management)
CREATE POLICY "profiles_select_owner"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

-- Delivery riders can read the customer profile for their assigned orders
CREATE POLICY "profiles_select_delivery"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.delivery_rider_id = auth.uid()
      AND o.customer_id = profiles.id
      AND o.status = 'out_for_delivery'
  ));

-- New profile can only be created for self (called from auth trigger context)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users update their own non-role fields
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- role column must not change via this policy
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Owner can update any profile's role
CREATE POLICY "profiles_update_owner"
  ON public.profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.2 store_settings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "store_settings_select_public" ON public.store_settings;
DROP POLICY IF EXISTS "store_settings_update_owner"  ON public.store_settings;

-- Everyone (including anon) can read store settings for storefront rendering
CREATE POLICY "store_settings_select_public"
  ON public.store_settings FOR SELECT
  USING (true);

-- Only owner can mutate store settings
CREATE POLICY "store_settings_update_owner"
  ON public.store_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.3 categories
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "categories_select_public"  ON public.categories;
DROP POLICY IF EXISTS "categories_mutate_owner"   ON public.categories;

-- Public can read non-archived categories
CREATE POLICY "categories_select_public"
  ON public.categories FOR SELECT
  USING (is_archived = false);

-- Owner can read all (including archived)
CREATE POLICY "categories_select_owner_all"
  ON public.categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

-- Owner can insert, update, delete categories
CREATE POLICY "categories_insert_owner"
  ON public.categories FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "categories_update_owner"
  ON public.categories FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "categories_delete_owner"
  ON public.categories FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.4 products
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_select_public"        ON public.products;
DROP POLICY IF EXISTS "products_select_owner_all"     ON public.products;
DROP POLICY IF EXISTS "products_insert_owner"         ON public.products;
DROP POLICY IF EXISTS "products_update_owner"         ON public.products;
DROP POLICY IF EXISTS "products_delete_owner"         ON public.products;

CREATE POLICY "products_select_public"
  ON public.products FOR SELECT
  USING (is_archived = false);

CREATE POLICY "products_select_owner_all"
  ON public.products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "products_insert_owner"
  ON public.products FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "products_update_owner"
  ON public.products FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "products_delete_owner"
  ON public.products FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.5 product_variants
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "product_variants_select_public" ON public.product_variants;
DROP POLICY IF EXISTS "product_variants_mutate_owner"  ON public.product_variants;

CREATE POLICY "product_variants_select_public"
  ON public.product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products pr
    WHERE pr.id = product_variants.product_id AND pr.is_archived = false
  ));

CREATE POLICY "product_variants_insert_owner"
  ON public.product_variants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "product_variants_update_owner"
  ON public.product_variants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "product_variants_delete_owner"
  ON public.product_variants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.6 customization_options
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customization_options_select_public" ON public.customization_options;
DROP POLICY IF EXISTS "customization_options_mutate_owner"  ON public.customization_options;

CREATE POLICY "customization_options_select_public"
  ON public.customization_options FOR SELECT
  USING (true);

CREATE POLICY "customization_options_insert_owner"
  ON public.customization_options FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "customization_options_update_owner"
  ON public.customization_options FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "customization_options_delete_owner"
  ON public.customization_options FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.7 product_customizations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "product_customizations_select_public" ON public.product_customizations;
DROP POLICY IF EXISTS "product_customizations_mutate_owner"  ON public.product_customizations;

CREATE POLICY "product_customizations_select_public"
  ON public.product_customizations FOR SELECT
  USING (true);

CREATE POLICY "product_customizations_insert_owner"
  ON public.product_customizations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "product_customizations_update_owner"
  ON public.product_customizations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "product_customizations_delete_owner"
  ON public.product_customizations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.8 coupons
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coupons_select_public_active" ON public.coupons;
DROP POLICY IF EXISTS "coupons_select_owner_all"     ON public.coupons;
DROP POLICY IF EXISTS "coupons_mutate_owner"         ON public.coupons;

-- Public sees only active coupons (for coupon validation flow)
CREATE POLICY "coupons_select_public_active"
  ON public.coupons FOR SELECT
  USING (is_active = true);

-- Owner sees all coupons including inactive
CREATE POLICY "coupons_select_owner_all"
  ON public.coupons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "coupons_insert_owner"
  ON public.coupons FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "coupons_update_owner"
  ON public.coupons FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "coupons_delete_owner"
  ON public.coupons FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.9 orders
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "orders_insert_public"           ON public.orders;
DROP POLICY IF EXISTS "orders_select_customer_own"     ON public.orders;
DROP POLICY IF EXISTS "orders_select_tracking_token"   ON public.orders;
DROP POLICY IF EXISTS "orders_select_kitchen"          ON public.orders;
DROP POLICY IF EXISTS "orders_select_delivery"         ON public.orders;
DROP POLICY IF EXISTS "orders_select_owner"            ON public.orders;
DROP POLICY IF EXISTS "orders_update_kitchen"          ON public.orders;
DROP POLICY IF EXISTS "orders_update_delivery"         ON public.orders;
DROP POLICY IF EXISTS "orders_update_owner"            ON public.orders;

-- Direct inserts disabled; use create_order_transactional RPC instead
CREATE POLICY "orders_insert_public"
  ON public.orders FOR INSERT
  WITH CHECK (false);

-- Authenticated customers see their own orders
CREATE POLICY "orders_select_customer_own"
  ON public.orders FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND customer_id = auth.uid()
  );

-- Anyone with a tracking token can view that specific order (unauthenticated tracking)
-- Note: application layer uses service_role admin client to fetch this, so public select is disabled
CREATE POLICY "orders_select_tracking_token"
  ON public.orders FOR SELECT
  USING (false);
-- Narrowing to tracking_token is enforced in the Server Action's WHERE clause +
-- the service_role client is used there. The anon client for the tracking page
-- reads a specific row by tracking_token; RLS on the orders table allows anon reads
-- and the WHERE clause in the query limits exposure. Sensitive columns (phone,
-- delivery_address) must be column-level restricted or selected explicitly.

-- Kitchen staff sees orders in active kitchen statuses
CREATE POLICY "orders_select_kitchen"
  ON public.orders FOR SELECT
  USING (
    status IN ('confirmed', 'preparing', 'ready')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'kitchen'
    )
  );

-- Delivery riders see orders assigned to them
CREATE POLICY "orders_select_delivery"
  ON public.orders FOR SELECT
  USING (
    delivery_rider_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'delivery'
    )
  );

-- Owner sees all orders
CREATE POLICY "orders_select_owner"
  ON public.orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

-- Kitchen can update status on active orders
CREATE POLICY "orders_update_kitchen"
  ON public.orders FOR UPDATE
  USING (
    status IN ('confirmed', 'preparing')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'kitchen'
    )
  );

-- Delivery rider can update status on their assigned orders
CREATE POLICY "orders_update_delivery"
  ON public.orders FOR UPDATE
  USING (
    delivery_rider_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'delivery'
    )
  );

-- Owner can update any order
CREATE POLICY "orders_update_owner"
  ON public.orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.10 order_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "order_items_select_customer" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_kitchen"  ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_delivery" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_owner"    ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_public"   ON public.order_items;

-- Direct inserts disabled; use create_order_transactional RPC instead
CREATE POLICY "order_items_insert_public"
  ON public.order_items FOR INSERT
  WITH CHECK (false);

CREATE POLICY "order_items_select_customer"
  ON public.order_items FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "order_items_select_kitchen"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('kitchen', 'owner', 'delivery')
  ));

CREATE POLICY "order_items_select_owner"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.11 order_item_customizations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "order_item_customizations_select_staff" ON public.order_item_customizations;
DROP POLICY IF EXISTS "order_item_customizations_select_customer" ON public.order_item_customizations;
DROP POLICY IF EXISTS "order_item_customizations_insert_public" ON public.order_item_customizations;

-- Direct inserts disabled; use create_order_transactional RPC instead
CREATE POLICY "order_item_customizations_insert_public"
  ON public.order_item_customizations FOR INSERT
  WITH CHECK (false);

CREATE POLICY "order_item_customizations_select_staff"
  ON public.order_item_customizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('kitchen', 'owner', 'delivery')
  ));

CREATE POLICY "order_item_customizations_select_customer"
  ON public.order_item_customizations FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_customizations.order_item_id
        AND o.customer_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 8.12 order_status_log
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "order_status_log_select_customer" ON public.order_status_log;
DROP POLICY IF EXISTS "order_status_log_select_staff"    ON public.order_status_log;
DROP POLICY IF EXISTS "order_status_log_no_update"       ON public.order_status_log;
DROP POLICY IF EXISTS "order_status_log_no_delete"       ON public.order_status_log;

-- Immutable: no direct UPDATE or DELETE allowed by any role
CREATE POLICY "order_status_log_no_update"
  ON public.order_status_log FOR UPDATE
  USING (false);

CREATE POLICY "order_status_log_no_delete"
  ON public.order_status_log FOR DELETE
  USING (false);

-- Customers see their own order history
CREATE POLICY "order_status_log_select_customer"
  ON public.order_status_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_log.order_id AND o.customer_id = auth.uid()
  ));

-- Staff and owner see all logs
CREATE POLICY "order_status_log_select_staff"
  ON public.order_status_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('owner', 'kitchen', 'delivery')
  ));


-- ---------------------------------------------------------------------------
-- 8.13 payment_log
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "payment_log_select_owner" ON public.payment_log;
DROP POLICY IF EXISTS "payment_log_no_update"    ON public.payment_log;
DROP POLICY IF EXISTS "payment_log_no_delete"    ON public.payment_log;

CREATE POLICY "payment_log_no_update"
  ON public.payment_log FOR UPDATE
  USING (false);

CREATE POLICY "payment_log_no_delete"
  ON public.payment_log FOR DELETE
  USING (false);

-- Only owner can read payment logs
CREATE POLICY "payment_log_select_owner"
  ON public.payment_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.14 notifications
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select_owner" ON public.notifications;
DROP POLICY IF EXISTS "notifications_no_client_mutate" ON public.notifications;

CREATE POLICY "notifications_select_owner"
  ON public.notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

-- Client-side INSERT/UPDATE/DELETE is not allowed; service_role handles this
CREATE POLICY "notifications_no_client_mutate"
  ON public.notifications FOR INSERT
  WITH CHECK (false);


-- ---------------------------------------------------------------------------
-- 8.15 product_audit_log
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "product_audit_log_select_owner" ON public.product_audit_log;
DROP POLICY IF EXISTS "product_audit_log_no_update"    ON public.product_audit_log;
DROP POLICY IF EXISTS "product_audit_log_no_delete"    ON public.product_audit_log;

CREATE POLICY "product_audit_log_no_update"
  ON public.product_audit_log FOR UPDATE
  USING (false);

CREATE POLICY "product_audit_log_no_delete"
  ON public.product_audit_log FOR DELETE
  USING (false);

CREATE POLICY "product_audit_log_select_owner"
  ON public.product_audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- ---------------------------------------------------------------------------
-- 8.16 failed_jobs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "failed_jobs_select_owner"  ON public.failed_jobs;
DROP POLICY IF EXISTS "failed_jobs_update_owner"  ON public.failed_jobs;

CREATE POLICY "failed_jobs_select_owner"
  ON public.failed_jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));

CREATE POLICY "failed_jobs_update_owner"
  ON public.failed_jobs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner'
  ));


-- =============================================================================
-- SECTION 9: SUPABASE REALTIME PUBLICATIONS
-- =============================================================================

-- Ensure the default Supabase realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to the realtime publication (idempotent)
DO $$
DECLARE
  tbl text;
  tbl_list text[] := ARRAY[
    'orders',
    'products',
    'store_settings',
    'order_status_log',
    'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbl_list LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;


-- =============================================================================
-- SECTION 10: PRODUCTION SEED DATA
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 10.1 store_settings (singleton — INSERT only if empty)
-- ---------------------------------------------------------------------------
INSERT INTO public.store_settings (
  id,
  store_name,
  tagline,
  is_open,
  delivery_radius_km,
  delivery_fee,
  free_delivery_threshold,
  tax_rate_percent,
  cod_max_order_amount,
  currency,
  currency_symbol,
  support_phone,
  whatsapp_number,
  support_email
)
VALUES (
  1,
  'Pizza Planet',
  'Out of this world pizza.',
  true,
  5,
  4900,
  49900,
  5.00,
  50000,
  'INR',
  '₹',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 10.2 categories
-- ---------------------------------------------------------------------------
INSERT INTO public.categories (id, slug, name, display_order)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'signature-pizzas', 'Signature Pizzas', 1),
  ('11111111-0000-0000-0000-000000000002', 'classic-pizzas',   'Classic Pizzas',   2),
  ('11111111-0000-0000-0000-000000000003', 'sides',            'Sides',            3),
  ('11111111-0000-0000-0000-000000000004', 'beverages',        'Beverages',        4)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 10.3 customization_options — master list
-- ---------------------------------------------------------------------------

-- Crusts
INSERT INTO public.customization_options (id, type, name, price, is_veg, display_order)
VALUES
  ('22220001-0000-0000-0000-000000000001', 'crust', 'Thin Crust',           0,    true, 1),
  ('22220001-0000-0000-0000-000000000002', 'crust', 'Classic Hand-Tossed',  0,    true, 2),
  ('22220001-0000-0000-0000-000000000003', 'crust', 'Cheese-Burst',         7900, true, 3),
  ('22220001-0000-0000-0000-000000000004', 'crust', 'Whole Wheat',          0,    true, 4)
ON CONFLICT (id) DO NOTHING;

-- Sauces
INSERT INTO public.customization_options (id, type, name, price, is_veg, display_order)
VALUES
  ('22220002-0000-0000-0000-000000000001', 'sauce', 'Classic Tomato',  0,    true, 1),
  ('22220002-0000-0000-0000-000000000002', 'sauce', 'Peri-Peri',       0,    true, 2),
  ('22220002-0000-0000-0000-000000000003', 'sauce', 'BBQ',             0,    true, 3),
  ('22220002-0000-0000-0000-000000000004', 'sauce', 'White Garlic',    0,    true, 4),
  ('22220002-0000-0000-0000-000000000005', 'sauce', 'Pesto',           2900, true, 5),
  ('22220002-0000-0000-0000-000000000006', 'sauce', 'Truffle Cream',   4900, true, 6)
ON CONFLICT (id) DO NOTHING;

-- Toppings — Veg
INSERT INTO public.customization_options (id, type, name, price, is_veg, display_order)
VALUES
  ('22220003-0000-0000-0000-000000000001', 'topping', 'Mozzarella',          0,    true, 1),
  ('22220003-0000-0000-0000-000000000002', 'topping', 'Fresh Basil',         0,    true, 2),
  ('22220003-0000-0000-0000-000000000003', 'topping', 'Mushrooms',           2900, true, 3),
  ('22220003-0000-0000-0000-000000000004', 'topping', 'Bell Peppers',        1900, true, 4),
  ('22220003-0000-0000-0000-000000000005', 'topping', 'Jalapeños',           1900, true, 5),
  ('22220003-0000-0000-0000-000000000006', 'topping', 'Black Olives',        1900, true, 6),
  ('22220003-0000-0000-0000-000000000007', 'topping', 'Red Onions',          1500, true, 7),
  ('22220003-0000-0000-0000-000000000008', 'topping', 'Cherry Tomatoes',     1900, true, 8),
  ('22220003-0000-0000-0000-000000000009', 'topping', 'Spinach',             1900, true, 9),
  ('22220003-0000-0000-0000-000000000010', 'topping', 'Truffle Oil Drizzle', 4900, true, 10),
  ('22220003-0000-0000-0000-000000000011', 'topping', 'Hot Honey',           3900, true, 11),
  ('22220003-0000-0000-0000-000000000012', 'topping', 'Ricotta Dollops',     3900, true, 12)
ON CONFLICT (id) DO NOTHING;

-- Toppings — Non-Veg
INSERT INTO public.customization_options (id, type, name, price, is_veg, display_order)
VALUES
  ('22220003-0000-0000-0000-000000000020', 'topping', 'Pepperoni',        3900, false, 20),
  ('22220003-0000-0000-0000-000000000021', 'topping', 'Grilled Chicken',  3900, false, 21),
  ('22220003-0000-0000-0000-000000000022', 'topping', 'Bacon Crumbles',   4900, false, 22)
ON CONFLICT (id) DO NOTHING;

-- Sizes (used as option_type 'size' — actual pricing is in product_variants)
INSERT INTO public.customization_options (id, type, name, price, is_veg, display_order)
VALUES
  ('22220004-0000-0000-0000-000000000001', 'size', 'Small (7")',   0, true, 1),
  ('22220004-0000-0000-0000-000000000002', 'size', 'Medium (10")', 0, true, 2),
  ('22220004-0000-0000-0000-000000000003', 'size', 'Large (12")',  0, true, 3),
  ('22220004-0000-0000-0000-000000000004', 'size', 'Party (16")',  0, true, 4)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 10.4 products — 3 launch products
-- ---------------------------------------------------------------------------

-- Product 1: Margherita Classico
INSERT INTO public.products (id, category_id, name, description, base_price, is_veg, display_order)
VALUES (
  '33330001-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000002',  -- Classic Pizzas
  'Margherita Classico',
  'San Marzano tomato sauce, fresh buffalo mozzarella, fragrant basil, and a drizzle of extra virgin olive oil on a hand-tossed crust. Timeless for a reason.',
  24900,  -- ₹249 base (Small 7")
  true,
  1
)
ON CONFLICT (id) DO NOTHING;

-- Product 2: Hot Honey Pepperoni
INSERT INTO public.products (id, category_id, name, description, base_price, is_veg, display_order)
VALUES (
  '33330001-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',  -- Signature Pizzas
  'Hot Honey Pepperoni',
  'Cupped pepperoni crisped to the edges, pooled in their own spice, hit with a finishing drizzle of artisan hot honey. Sweet. Smoky. Absolutely savage.',
  31900,  -- ₹319 base (Small 7")
  false,
  1
)
ON CONFLICT (id) DO NOTHING;

-- Product 3: Truffle Fungi Bianca
INSERT INTO public.products (id, category_id, name, description, base_price, is_veg, display_order)
VALUES (
  '33330001-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001',  -- Signature Pizzas
  'Truffle Fungi Bianca',
  'White garlic cream base, wild mushroom medley, ricotta dollops, aged parmesan, finished with black truffle oil. No tomato. No apologies.',
  37900,  -- ₹379 base (Small 7")
  true,
  2
)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 10.5 product_variants — size tiers per product
-- ---------------------------------------------------------------------------

-- Margherita Classico variants
INSERT INTO public.product_variants (id, product_id, size_name, size_label, price_adjustment, display_order)
VALUES
  ('44440001-0001-0000-0000-000000000001', '33330001-0000-0000-0000-000000000001', 'Small',  '7"',   0,     1),
  ('44440001-0001-0000-0000-000000000002', '33330001-0000-0000-0000-000000000001', 'Medium', '10"',  7000,  2),
  ('44440001-0001-0000-0000-000000000003', '33330001-0000-0000-0000-000000000001', 'Large',  '12"',  12000, 3),
  ('44440001-0001-0000-0000-000000000004', '33330001-0000-0000-0000-000000000001', 'Party',  '16"',  22000, 4)
ON CONFLICT (id) DO NOTHING;

-- Hot Honey Pepperoni variants
INSERT INTO public.product_variants (id, product_id, size_name, size_label, price_adjustment, display_order)
VALUES
  ('44440001-0002-0000-0000-000000000001', '33330001-0000-0000-0000-000000000002', 'Small',  '7"',   0,     1),
  ('44440001-0002-0000-0000-000000000002', '33330001-0000-0000-0000-000000000002', 'Medium', '10"',  8000,  2),
  ('44440001-0002-0000-0000-000000000003', '33330001-0000-0000-0000-000000000002', 'Large',  '12"',  14000, 3),
  ('44440001-0002-0000-0000-000000000004', '33330001-0000-0000-0000-000000000002', 'Party',  '16"',  25000, 4)
ON CONFLICT (id) DO NOTHING;

-- Truffle Fungi Bianca variants
INSERT INTO public.product_variants (id, product_id, size_name, size_label, price_adjustment, display_order)
VALUES
  ('44440001-0003-0000-0000-000000000001', '33330001-0000-0000-0000-000000000003', 'Small',  '7"',   0,     1),
  ('44440001-0003-0000-0000-000000000002', '33330001-0000-0000-0000-000000000003', 'Medium', '10"',  9000,  2),
  ('44440001-0003-0000-0000-000000000003', '33330001-0000-0000-0000-000000000003', 'Large',  '12"',  16000, 3),
  ('44440001-0003-0000-0000-000000000004', '33330001-0000-0000-0000-000000000003', 'Party',  '16"',  28000, 4)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 10.6 product_customizations — link products to their allowed options
-- ---------------------------------------------------------------------------

-- All three products share the same crusts, sauces, and base toppings.
-- Defaults: Classic Hand-Tossed crust, Classic Tomato sauce, Mozzarella topping.

-- Margherita Classico
INSERT INTO public.product_customizations (product_id, option_id, is_default)
VALUES
  -- crusts
  ('33330001-0000-0000-0000-000000000001', '22220001-0000-0000-0000-000000000001', false),  -- Thin
  ('33330001-0000-0000-0000-000000000001', '22220001-0000-0000-0000-000000000002', true),   -- Hand-Tossed (default)
  ('33330001-0000-0000-0000-000000000001', '22220001-0000-0000-0000-000000000003', false),  -- Cheese-Burst
  ('33330001-0000-0000-0000-000000000001', '22220001-0000-0000-0000-000000000004', false),  -- Whole Wheat
  -- sauces
  ('33330001-0000-0000-0000-000000000001', '22220002-0000-0000-0000-000000000001', true),   -- Classic Tomato (default)
  ('33330001-0000-0000-0000-000000000001', '22220002-0000-0000-0000-000000000002', false),  -- Peri-Peri
  ('33330001-0000-0000-0000-000000000001', '22220002-0000-0000-0000-000000000003', false),  -- BBQ
  ('33330001-0000-0000-0000-000000000001', '22220002-0000-0000-0000-000000000004', false),  -- White Garlic
  ('33330001-0000-0000-0000-000000000001', '22220002-0000-0000-0000-000000000005', false),  -- Pesto
  -- toppings
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000001', true),   -- Mozzarella (default)
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000002', true),   -- Fresh Basil (default)
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000003', false),  -- Mushrooms
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000004', false),  -- Bell Peppers
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000005', false),  -- Jalapeños
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000006', false),  -- Black Olives
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000007', false),  -- Red Onions
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000008', false),  -- Cherry Tomatoes
  ('33330001-0000-0000-0000-000000000001', '22220003-0000-0000-0000-000000000009', false)   -- Spinach
ON CONFLICT (product_id, option_id) DO NOTHING;

-- Hot Honey Pepperoni
INSERT INTO public.product_customizations (product_id, option_id, is_default)
VALUES
  -- crusts
  ('33330001-0000-0000-0000-000000000002', '22220001-0000-0000-0000-000000000001', false),
  ('33330001-0000-0000-0000-000000000002', '22220001-0000-0000-0000-000000000002', true),
  ('33330001-0000-0000-0000-000000000002', '22220001-0000-0000-0000-000000000003', false),
  ('33330001-0000-0000-0000-000000000002', '22220001-0000-0000-0000-000000000004', false),
  -- sauces
  ('33330001-0000-0000-0000-000000000002', '22220002-0000-0000-0000-000000000001', true),
  ('33330001-0000-0000-0000-000000000002', '22220002-0000-0000-0000-000000000002', false),
  ('33330001-0000-0000-0000-000000000002', '22220002-0000-0000-0000-000000000003', false),
  ('33330001-0000-0000-0000-000000000002', '22220002-0000-0000-0000-000000000004', false),
  -- toppings
  ('33330001-0000-0000-0000-000000000002', '22220003-0000-0000-0000-000000000001', true),   -- Mozzarella
  ('33330001-0000-0000-0000-000000000002', '22220003-0000-0000-0000-000000000005', false),  -- Jalapeños
  ('33330001-0000-0000-0000-000000000002', '22220003-0000-0000-0000-000000000011', true),   -- Hot Honey (default)
  ('33330001-0000-0000-0000-000000000002', '22220003-0000-0000-0000-000000000004', false),  -- Bell Peppers
  ('33330001-0000-0000-0000-000000000002', '22220003-0000-0000-0000-000000000007', false),  -- Red Onions
  -- non-veg
  ('33330001-0000-0000-0000-000000000002', '22220003-0000-0000-0000-000000000020', true),   -- Pepperoni (default)
  ('33330001-0000-0000-0000-000000000002', '22220003-0000-0000-0000-000000000022', false)   -- Bacon
ON CONFLICT (product_id, option_id) DO NOTHING;

-- Truffle Fungi Bianca
INSERT INTO public.product_customizations (product_id, option_id, is_default)
VALUES
  -- crusts
  ('33330001-0000-0000-0000-000000000003', '22220001-0000-0000-0000-000000000001', false),
  ('33330001-0000-0000-0000-000000000003', '22220001-0000-0000-0000-000000000002', true),
  ('33330001-0000-0000-0000-000000000003', '22220001-0000-0000-0000-000000000003', false),
  -- sauces — white garlic is the signature default for Bianca
  ('33330001-0000-0000-0000-000000000003', '22220002-0000-0000-0000-000000000004', true),   -- White Garlic (default)
  ('33330001-0000-0000-0000-000000000003', '22220002-0000-0000-0000-000000000006', false),  -- Truffle Cream
  ('33330001-0000-0000-0000-000000000003', '22220002-0000-0000-0000-000000000005', false),  -- Pesto
  -- toppings
  ('33330001-0000-0000-0000-000000000003', '22220003-0000-0000-0000-000000000001', true),   -- Mozzarella (default)
  ('33330001-0000-0000-0000-000000000003', '22220003-0000-0000-0000-000000000003', true),   -- Mushrooms (default)
  ('33330001-0000-0000-0000-000000000003', '22220003-0000-0000-0000-000000000010', true),   -- Truffle Oil (default)
  ('33330001-0000-0000-0000-000000000003', '22220003-0000-0000-0000-000000000012', true),   -- Ricotta (default)
  ('33330001-0000-0000-0000-000000000003', '22220003-0000-0000-0000-000000000009', false),  -- Spinach
  ('33330001-0000-0000-0000-000000000003', '22220003-0000-0000-0000-000000000007', false),  -- Red Onions
  ('33330001-0000-0000-0000-000000000003', '22220003-0000-0000-0000-000000000006', false)   -- Black Olives
ON CONFLICT (product_id, option_id) DO NOTHING;


-- =============================================================================
-- SECTION 11: POST-MIGRATION VERIFICATION STATEMENTS
-- =============================================================================
-- The following DO block performs a silent self-check after the migration runs.
-- It raises an exception if any critical setup is missing, failing the migration
-- cleanly rather than leaving the database in a partially valid state.

DO $$
DECLARE
  v_table_count   integer;
  v_enum_count    integer;
  v_rls_count     integer;
  v_category_count integer;
  v_product_count  integer;
BEGIN
  -- Verify all expected tables exist
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'profiles', 'store_settings', 'categories', 'products',
      'product_variants', 'customization_options', 'product_customizations',
      'coupons', 'orders', 'order_items', 'order_item_customizations',
      'order_status_log', 'payment_log', 'notifications',
      'product_audit_log', 'failed_jobs'
    );

  IF v_table_count < 16 THEN
    RAISE EXCEPTION 'Migration verification failed: expected 16 tables, found %', v_table_count;
  END IF;

  -- Verify RLS is enabled on all tables
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_tables pt
  JOIN pg_class pc ON pc.relname = pt.tablename
  WHERE pt.schemaname = 'public'
    AND pc.relrowsecurity = true
    AND pt.tablename IN (
      'profiles', 'store_settings', 'categories', 'products',
      'product_variants', 'customization_options', 'product_customizations',
      'coupons', 'orders', 'order_items', 'order_item_customizations',
      'order_status_log', 'payment_log', 'notifications',
      'product_audit_log', 'failed_jobs'
    );

  IF v_rls_count < 16 THEN
    RAISE EXCEPTION 'Migration verification failed: RLS not enabled on all tables (found % / 16)', v_rls_count;
  END IF;

  -- Verify seed categories
  SELECT COUNT(*) INTO v_category_count
  FROM public.categories
  WHERE slug IN ('signature-pizzas', 'classic-pizzas', 'sides', 'beverages');

  IF v_category_count < 4 THEN
    RAISE EXCEPTION 'Migration verification failed: expected 4 seed categories, found %', v_category_count;
  END IF;

  -- Verify seed products
  SELECT COUNT(*) INTO v_product_count
  FROM public.products
  WHERE name IN ('Margherita Classico', 'Hot Honey Pepperoni', 'Truffle Fungi Bianca');

  IF v_product_count < 3 THEN
    RAISE EXCEPTION 'Migration verification failed: expected 3 seed products, found %', v_product_count;
  END IF;

  RAISE NOTICE 'Pizza Planet migration 001 — verification passed. Tables: %, RLS: %, Categories: %, Products: %',
    v_table_count, v_rls_count, v_category_count, v_product_count;
END $$;
