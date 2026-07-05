-- =============================================================================
-- Pizza Planet — Migration 002: Canonical Order State Machine Guard (Gate 3: SYS-07)
-- Authoritative database-level transition enforcement preventing illegal state updates.
-- Source of truth: DatabaseDesign.md §2.3, PRODUCTION_ENGINEERING_SPECIFICATION.md
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_valid_order_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid boolean := false;
BEGIN
  -- 1. If status is unchanged, allow update of other columns without checking rules
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- 2. Terminal state lock: Once delivered, cancelled, or rejected, no further transitions allowed
  IF OLD.status IN ('delivered', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'ILLEGAL_TRANSITION: Order is currently in a terminal state (%) and cannot be transitioned to (%)', OLD.status, NEW.status
      USING ERRCODE = 'PZ001';
  END IF;

  -- 3. Legal transition map evaluation (matching canonical transitionMatrix.ts)
  CASE OLD.status
    WHEN 'pending_payment' THEN
      IF NEW.status IN ('confirmed', 'cancelled', 'rejected') THEN is_valid := true; END IF;
    WHEN 'confirmed' THEN
      IF NEW.status IN ('preparing', 'cancelled', 'rejected', 'pending_payment') THEN is_valid := true; END IF;
    WHEN 'preparing' THEN
      IF NEW.status IN ('ready', 'cancelled', 'confirmed') THEN is_valid := true; END IF;
    WHEN 'ready' THEN
      IF NEW.status IN ('out_for_delivery', 'delivered', 'cancelled', 'preparing') THEN is_valid := true; END IF;
    WHEN 'out_for_delivery' THEN
      IF NEW.status IN ('delivered', 'cancelled', 'ready') THEN is_valid := true; END IF;
    ELSE
      is_valid := false;
  END CASE;

  IF NOT is_valid THEN
    RAISE EXCEPTION 'ILLEGAL_TRANSITION: Cannot transition order status from (%) to (%)', OLD.status, NEW.status
      USING ERRCODE = 'PZ002';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_enforce_transition ON public.orders;
CREATE TRIGGER trg_orders_enforce_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_valid_order_transition();
