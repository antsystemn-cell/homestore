CREATE TABLE public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'ORDER',
  provider text NOT NULL DEFAULT 'STOREPAY',
  status text NOT NULL DEFAULT 'INITIATED',
  phone text NOT NULL,
  amount numeric NOT NULL,
  loan_id text,
  request_id text UNIQUE NOT NULL,
  storepay_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment intents"
  ON public.payment_intents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment intents"
  ON public.payment_intents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment intents"
  ON public.payment_intents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payment intents"
  ON public.payment_intents FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_intent_id uuid;