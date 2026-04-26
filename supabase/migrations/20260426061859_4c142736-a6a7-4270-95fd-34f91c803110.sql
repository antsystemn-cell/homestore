-- 1. Status history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_by_email text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osh_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_osh_created_at ON public.order_status_history(created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS: admins, moderators see all; drivers see only their own assigned orders' history
DROP POLICY IF EXISTS "Admins view status history" ON public.order_status_history;
CREATE POLICY "Admins view status history"
ON public.order_status_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Moderators view status history" ON public.order_status_history;
CREATE POLICY "Moderators view status history"
ON public.order_status_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Drivers view their orders history" ON public.order_status_history;
CREATE POLICY "Drivers view their orders history"
ON public.order_status_history FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'driver'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_status_history.order_id
      AND (o.driver_id = auth.uid() OR (o.driver_id IS NULL AND o.status = 'ready')
           OR o.status IN ('out_for_delivery', 'delivered'))
  )
);

-- 2. Trigger to auto-record status transitions
CREATE OR REPLACE FUNCTION public.record_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_email text;
BEGIN
  -- INSERT: record initial status
  IF (TG_OP = 'INSERT') THEN
    SELECT email::text INTO actor_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, changed_by_email)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), actor_email);
    RETURN NEW;
  END IF;

  -- UPDATE: only if status actually changed
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT email::text INTO actor_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, changed_by_email)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), actor_email);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status_history ON public.orders;
CREATE TRIGGER trg_orders_status_history
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.record_order_status_change();

-- 3. Backfill: insert one "current status" row for any existing order without history
INSERT INTO public.order_status_history (order_id, from_status, to_status, created_at)
SELECT o.id, NULL, o.status, o.created_at
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_status_history h WHERE h.order_id = o.id
);

-- 4. Enable realtime
ALTER TABLE public.order_status_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;