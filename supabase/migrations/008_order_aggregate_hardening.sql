-- =============================================================================
-- Pizza Planet — Migration 008: Order Aggregate Hardening (Gate 3: SYS-07.5)
-- Authoritative database architecture for Aggregate Root, OCC, Outbox, and Idempotency.
-- Source of truth: ORDER_AGGREGATE_ARCHITECTURE.md, PRD.md
-- =============================================================================

-- 1. Extend user_role enum to formally support 'system' actor role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'system';

-- 2. Add Optimistic Concurrency Control (OCC) aggregate version column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 3. Create Transactional Outbox Events ledger for guaranteed event delivery
CREATE TABLE IF NOT EXISTS public.order_outbox_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id      uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  aggregate_version integer NOT NULL,
  event_type        text NOT NULL,
  event_payload     jsonb NOT NULL,
  schema_version    integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  retry_count       integer NOT NULL DEFAULT 0,
  error_message     text
);

CREATE INDEX IF NOT EXISTS idx_order_outbox_unprocessed 
  ON public.order_outbox_events (created_at) 
  WHERE processed_at IS NULL;

-- 4. Create Order Idempotency Keys ledger for deduplication
CREATE TABLE IF NOT EXISTS public.order_idempotency_keys (
  idempotency_key   text PRIMARY KEY,
  order_id          uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  request_hash      text NOT NULL,
  response_body     jsonb NOT NULL,
  status_code       integer NOT NULL DEFAULT 200,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 5. Drop legacy automatic trigger to prevent duplicate audit logs and enforce application workflow ownership
DROP TRIGGER IF EXISTS trg_orders_log_status_change ON public.orders;

-- 6. Authoritative atomic RPC transaction function for Order Aggregate transitions
CREATE OR REPLACE FUNCTION public.execute_order_transition_tx(
  p_order_id        uuid,
  p_expected_version integer,
  p_new_status      text,
  p_actor_id        uuid,
  p_actor_role      text,
  p_note            text,
  p_idempotency_key text,
  p_request_hash    text,
  p_outbox_event    jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           record;
  v_old_status      text;
  v_new_version     integer;
  v_cached_response record;
  v_audit_role      public.user_role;
BEGIN
  -- A. Idempotency Check: if key exists, verify request hash and return cached response
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT request_hash, response_body, status_code 
      INTO v_cached_response 
      FROM public.order_idempotency_keys 
     WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      IF v_cached_response.request_hash = p_request_hash THEN
        RETURN v_cached_response.response_body;
      ELSE
        RAISE EXCEPTION 'IDEMPOTENCY_KEY_MISMATCH: Idempotency key (%) was already used with a different request payload.', p_idempotency_key
          USING ERRCODE = 'PZ009';
      END IF;
    END IF;
  END IF;

  -- B. Lock and read order aggregate for update
  SELECT id, status, version, order_type, customer_id
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Order (%) does not exist.', p_order_id
      USING ERRCODE = 'PZ004';
  END IF;

  v_old_status := v_order.status::text;

  -- C. Optimistic Concurrency Control (OCC) Check
  IF p_expected_version IS NOT NULL AND v_order.version <> p_expected_version THEN
    RAISE EXCEPTION 'CONCURRENT_MODIFICATION: Aggregate version mismatch for order (%). Expected version %, but found %.', p_order_id, p_expected_version, v_order.version
      USING ERRCODE = 'PZ003';
  END IF;

  -- D. Handle No-Op (status unchanged) without mutating DB state
  IF v_old_status = p_new_status THEN
    DECLARE
      v_noop_res jsonb := jsonb_build_object(
        'success', true,
        'noop', true,
        'orderId', p_order_id,
        'oldStatus', v_old_status,
        'newStatus', p_new_status,
        'version', v_order.version,
        'transitionedAt', now()
      );
    BEGIN
      IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        INSERT INTO public.order_idempotency_keys (idempotency_key, order_id, request_hash, response_body, status_code)
        VALUES (p_idempotency_key, p_order_id, p_request_hash, v_noop_res, 200);
      END IF;
      RETURN v_noop_res;
    END;
  END IF;

  -- E. Execute Order Status & Version Update
  -- Note: Updating status automatically fires trg_orders_enforce_transition to verify state graph integrity!
  UPDATE public.orders
     SET status = p_new_status::public.order_status,
         version = version + 1
   WHERE id = p_order_id
   RETURNING version INTO v_new_version;

  -- F. Resolve user_role for audit log safely
  BEGIN
    v_audit_role := p_actor_role::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    v_audit_role := 'guest'::public.user_role;
  END;

  -- G. Explicitly insert immutable audit record with exact attribution
  INSERT INTO public.order_status_log (
    order_id,
    old_status,
    new_status,
    changed_by,
    role,
    note
  ) VALUES (
    p_order_id,
    v_old_status::public.order_status,
    p_new_status::public.order_status,
    p_actor_id,
    v_audit_role,
    p_note
  );

  -- H. Insert Transactional Outbox Event atomically
  IF p_outbox_event IS NOT NULL THEN
    INSERT INTO public.order_outbox_events (
      aggregate_id,
      aggregate_version,
      event_type,
      event_payload,
      schema_version
    ) VALUES (
      p_order_id,
      v_new_version,
      COALESCE(p_outbox_event->>'eventType', 'OrderStatusChanged'),
      p_outbox_event,
      COALESCE((p_outbox_event->>'schemaVersion')::integer, 1)
    );
  END IF;

  -- I. Build success response
  DECLARE
    v_success_res jsonb := jsonb_build_object(
      'success', true,
      'noop', false,
      'orderId', p_order_id,
      'oldStatus', v_old_status,
      'newStatus', p_new_status,
      'version', v_new_version,
      'transitionedAt', now()
    );
  BEGIN
    -- J. Record idempotency key if provided
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
      INSERT INTO public.order_idempotency_keys (idempotency_key, order_id, request_hash, response_body, status_code)
      VALUES (p_idempotency_key, p_order_id, p_request_hash, v_success_res, 200);
    END IF;

    RETURN v_success_res;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_order_transition_tx TO anon, authenticated, service_role;
