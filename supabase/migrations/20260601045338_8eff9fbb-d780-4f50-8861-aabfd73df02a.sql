CREATE TABLE public.driver_role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  phone text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX driver_role_requests_pending_unique
  ON public.driver_role_requests (user_id)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.driver_role_requests TO authenticated;
GRANT ALL ON public.driver_role_requests TO service_role;

ALTER TABLE public.driver_role_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own driver requests"
  ON public.driver_role_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own driver requests"
  ON public.driver_role_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all driver requests"
  ON public.driver_role_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update driver requests"
  ON public.driver_role_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_driver_requests_updated
  BEFORE UPDATE ON public.driver_role_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-grant 'driver' role when a request is approved
CREATE OR REPLACE FUNCTION public.grant_driver_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'driver'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    IF NEW.reviewed_at IS NULL THEN NEW.reviewed_at := now(); END IF;
    IF NEW.reviewed_by IS NULL THEN NEW.reviewed_by := auth.uid(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_driver_on_approval
  BEFORE UPDATE ON public.driver_role_requests
  FOR EACH ROW EXECUTE FUNCTION public.grant_driver_on_approval();

-- Helper for admins to list pending requests with user email
CREATE OR REPLACE FUNCTION public.list_driver_requests()
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, phone text, note text,
  status text, email text, created_at timestamptz,
  reviewed_at timestamptz, review_note text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id, r.full_name, r.phone, r.note,
         r.status, u.email::text, r.created_at,
         r.reviewed_at, r.review_note
  FROM public.driver_role_requests r
  LEFT JOIN auth.users u ON u.id = r.user_id
  ORDER BY (r.status = 'pending') DESC, r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_driver_requests() TO authenticated;