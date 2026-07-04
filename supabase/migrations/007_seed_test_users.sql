-- =============================================================================
-- Migration 007: Seed Development Test Users (Owner & Customer)
-- Author: Principal Software Engineer
-- Source of Truth: EDR-2026-07-04-01 / ARDR §3.1 / P1-03 & P1-01 Remediation
-- Requirements: Idempotent, safe, development only testing credentials
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Development Owner Account (owner@pizzaplanet.in / admin123)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-a000-000000000001',
  'authenticated',
  'authenticated',
  'owner@pizzaplanet.in',
  extensions.crypt('admin123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"owner","full_name":"Pizza Planet Owner"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000001',
  format('{"sub":"00000000-0000-4000-a000-000000000001","email":"%s"}', 'owner@pizzaplanet.in')::jsonb,
  'email',
  'owner@pizzaplanet.in',
  now(),
  now(),
  now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

INSERT INTO public.profiles (
  id,
  phone,
  role,
  full_name,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-a000-000000000001',
  '+910000000001',
  'owner',
  'Pizza Planet Owner',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- -----------------------------------------------------------------------------
-- 2. Development Customer Account (+919999999999 / customer123)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  phone,
  encrypted_password,
  email_confirmed_at,
  phone_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-a000-000000000002',
  'authenticated',
  'authenticated',
  'dev_customer_9999999999@pizzaplanet.in',
  '+919999999999',
  extensions.crypt('customer123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  '{"provider":"phone","providers":["phone","email"]}',
  '{"role":"customer","full_name":"Customer (9999)"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  phone = EXCLUDED.phone,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000002',
  format('{"sub":"00000000-0000-4000-a000-000000000002","phone":"%s"}', '+919999999999')::jsonb,
  'phone',
  '+919999999999',
  now(),
  now(),
  now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

INSERT INTO public.profiles (
  id,
  phone,
  role,
  full_name,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-4000-a000-000000000002',
  '+919999999999',
  'customer',
  'Customer (9999)',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;
