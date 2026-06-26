-- =============================================================================
-- Pizza Planet — Transactional Order Creation
-- File    : 002_create_order_transactional.sql
-- Target  : PostgreSQL 16 / Supabase
-- Created : 2026-06-20
-- =============================================================================

-- Add idempotency_key column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Add unique constraint on idempotency_key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_idempotency_key_unique'
  ) THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_idempotency_key_unique UNIQUE (idempotency_key);
  END IF;
END $$;

-- Create transactional order function
CREATE OR REPLACE FUNCTION public.create_order_transactional(
  p_order_type text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_address jsonb,
  p_special_instructions text,
  p_payment_method text,
  p_discount_amount integer,
  p_subtotal integer,
  p_tax integer,
  p_delivery_fee integer,
  p_total_amount integer,
  p_idempotency_key text,
  p_items jsonb
)
RETURNS TABLE (
  order_id uuid,
  short_id text,
  tracking_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_short_id text;
  v_tracking_token uuid;
  v_item jsonb;
  v_option jsonb;
  v_order_item_id uuid;
BEGIN
  -- 1. Idempotency Check: if idempotency key exists, return the matching order info
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT id, public.orders.short_id, public.orders.tracking_token
    INTO v_order_id, v_short_id, v_tracking_token
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN QUERY SELECT v_order_id, v_short_id, v_tracking_token;
      RETURN;
    END IF;
  END IF;

  -- 2. Insert the parent order row
  INSERT INTO public.orders (
    order_type,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    special_instructions,
    payment_method,
    discount_amount,
    subtotal,
    tax,
    delivery_fee,
    total_amount,
    idempotency_key
  ) VALUES (
    p_order_type::public.order_type,
    p_customer_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_delivery_address,
    p_special_instructions,
    p_payment_method::public.payment_method,
    p_discount_amount,
    p_subtotal,
    p_tax,
    p_delivery_fee,
    p_total_amount,
    p_idempotency_key
  )
  RETURNING id, public.orders.short_id, public.orders.tracking_token
  INTO v_order_id, v_short_id, v_tracking_token;

  -- 3. Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name_snapshot,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'variant_id')::uuid,
      v_item->>'product_name_snapshot',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::integer,
      (v_item->>'total_price')::integer
    )
    RETURNING id INTO v_order_item_id;

    -- 4. Insert customizations if they exist for the item
    IF v_item ? 'options' AND jsonb_typeof(v_item->'options') = 'array' THEN
      FOR v_option IN SELECT * FROM jsonb_array_elements(v_item->'options') LOOP
        INSERT INTO public.order_item_customizations (
          order_item_id,
          option_id,
          option_name_snapshot,
          price_snapshot
        ) VALUES (
          v_order_item_id,
          (v_option->>'option_id')::uuid,
          v_option->>'option_name_snapshot',
          (v_option->>'price_snapshot')::integer
        );
      END LOOP;
    END IF;
  END LOOP;

  -- 5. Return the created order info
  RETURN QUERY SELECT v_order_id, v_short_id, v_tracking_token;
END;
$$;

-- Grant execution rights to storefront and service role users
GRANT EXECUTE ON FUNCTION public.create_order_transactional TO anon, authenticated, service_role;
