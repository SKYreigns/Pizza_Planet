-- =============================================================================
-- Migration 006: Create kitchen_staff table & PIN authentication support
-- Author: Principal Software Engineer
-- Source of Truth: EDR-2026-07-04-01 / ARDR §3.1
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.kitchen_staff (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  pin_hash    text        NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for active status check during login
CREATE INDEX IF NOT EXISTS idx_kitchen_staff_active ON public.kitchen_staff(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.kitchen_staff ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DROP POLICY IF EXISTS "service_role_kitchen_staff_all" ON public.kitchen_staff;
CREATE POLICY "service_role_kitchen_staff_all"
  ON public.kitchen_staff
  FOR ALL
  USING (auth.role() = 'service_role');

-- Seed default MVP test PIN '8842' (hashed via pgcrypto crypt with bf/bcrypt salt)
INSERT INTO public.kitchen_staff (name, pin_hash, is_active)
VALUES ('Chef Suresh', crypt('8842', gen_salt('bf')), true)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- RPC: verify_kitchen_pin(p_pin text)
-- Securely verifies a PIN against active kitchen staff using pgcrypto crypt().
-- Returns staff id and name if valid.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.verify_kitchen_pin(p_pin text)
RETURNS TABLE (
  staff_id uuid,
  staff_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ks.id AS staff_id,
    ks.name AS staff_name
  FROM public.kitchen_staff ks
  WHERE ks.is_active = true
    AND ks.pin_hash = crypt(p_pin, ks.pin_hash)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_kitchen_pin(text) TO anon, authenticated, service_role;
