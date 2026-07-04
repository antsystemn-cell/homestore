
-- 1. Profile consent
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sms_reminders_consent boolean NOT NULL DEFAULT false;

-- 2. Product average reorder cycle
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS average_reorder_days integer;

-- 3. Active carts snapshot
CREATE TABLE IF NOT EXISTS public.active_carts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  reminded_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_carts TO authenticated;
GRANT ALL ON public.active_carts TO service_role;

ALTER TABLE public.active_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_carts_self" ON public.active_carts;
CREATE POLICY "active_carts_self" ON public.active_carts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Reminder config
CREATE TABLE IF NOT EXISTS public.reminder_config (
  id integer PRIMARY KEY DEFAULT 1,
  cart_enabled boolean NOT NULL DEFAULT true,
  cart_delay_hours numeric NOT NULL DEFAULT 2,
  reorder_enabled boolean NOT NULL DEFAULT true,
  sms_sender text NOT NULL DEFAULT 'easyshop',
  order_link_base text NOT NULL DEFAULT 'https://easyshop.mn/cart',
  sms_provider text NOT NULL DEFAULT 'none',  -- 'none' | 'twilio' | 'gatewayapi'
  cart_message_template text NOT NULL DEFAULT 'Таны сагсанд {product} хүлээж байна. Захиалгаа дуусгана уу: {link}',
  reorder_message_template text NOT NULL DEFAULT 'Таны {product} дуусах цаг боллоо. Дахин захиалах уу? {link}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reminder_config_singleton CHECK (id = 1)
);

GRANT SELECT ON public.reminder_config TO anon, authenticated;
GRANT ALL ON public.reminder_config TO service_role;

ALTER TABLE public.reminder_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_config_read" ON public.reminder_config;
CREATE POLICY "reminder_config_read" ON public.reminder_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "reminder_config_admin_write" ON public.reminder_config;
CREATE POLICY "reminder_config_admin_write" ON public.reminder_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.reminder_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_reminder_config_updated_at ON public.reminder_config;
CREATE TRIGGER update_reminder_config_updated_at
  BEFORE UPDATE ON public.reminder_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Reminder log
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text NOT NULL,               -- 'cart' | 'reorder'
  product_id uuid,
  order_id uuid,
  phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'queued', -- 'queued' | 'sent' | 'failed' | 'skipped'
  provider text,
  provider_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reminder_log_user_kind_idx ON public.reminder_log(user_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS reminder_log_reorder_lookup_idx ON public.reminder_log(user_id, product_id, kind) WHERE kind = 'reorder';

GRANT SELECT ON public.reminder_log TO authenticated;
GRANT ALL ON public.reminder_log TO service_role;

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminder_log_admin_read" ON public.reminder_log;
CREATE POLICY "reminder_log_admin_read" ON public.reminder_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));
