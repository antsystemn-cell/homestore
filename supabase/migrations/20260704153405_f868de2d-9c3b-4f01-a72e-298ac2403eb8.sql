
-- 1) Notifications table
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_created
  ON public.in_app_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread
  ON public.in_app_notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.in_app_notifications TO authenticated;
GRANT ALL ON public.in_app_notifications TO service_role;

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.in_app_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.in_app_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.in_app_notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 2) Realtime
ALTER TABLE public.in_app_notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 3) Cron jobs for scans (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_url text := 'https://jiqjebbxcwetakdhfuel.supabase.co/functions/v1';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcWplYmJ4Y3dldGFrZGhmdWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDk2NzEsImV4cCI6MjA4OTYyNTY3MX0.-SOaK2hWFgUviUwrd2_DIOx133rya3xEbwkANhhQXCE';
BEGIN
  BEGIN PERFORM cron.unschedule('scan-cart-reminders-15m'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('scan-reorder-reminders-daily'); EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule(
    'scan-cart-reminders-15m',
    '*/15 * * * *',
    format($f$SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:='{}'::jsonb);$f$,
      v_url || '/scan-cart-reminders',
      jsonb_build_object('Content-Type','application/json','apikey',v_anon,'Authorization','Bearer '||v_anon)::text)
  );

  PERFORM cron.schedule(
    'scan-reorder-reminders-daily',
    '0 10 * * *',
    format($f$SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:='{}'::jsonb);$f$,
      v_url || '/scan-reorder-reminders',
      jsonb_build_object('Content-Type','application/json','apikey',v_anon,'Authorization','Bearer '||v_anon)::text)
  );
END $$;
