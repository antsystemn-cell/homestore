
CREATE TABLE public.payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  color text NOT NULL DEFAULT 'bg-blue-500',
  icon text DEFAULT '💳',
  position integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment providers viewable by everyone"
ON public.payment_providers FOR SELECT TO public
USING (true);

CREATE POLICY "Admins can manage payment providers"
ON public.payment_providers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default data
INSERT INTO public.payment_providers (name, color, icon, position) VALUES
('Golomt Bank', 'bg-blue-500', '🏦', 0),
('Pocket', 'bg-red-500', '💳', 1),
('Store Pay', 'bg-teal-500', '🛒', 2),
('DigiPay', 'bg-green-500', '💰', 3),
('HiPay', 'bg-purple-500', '📱', 4),
('MonPay', 'bg-cyan-500', '🔄', 5);
