
CREATE TABLE public.delivery_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  estimated_days_min INTEGER DEFAULT 1,
  estimated_days_max INTEGER DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active delivery options"
ON public.delivery_options
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage delivery options"
ON public.delivery_options
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add delivery_option_id to orders
ALTER TABLE public.orders
ADD COLUMN delivery_option_id UUID REFERENCES public.delivery_options(id),
ADD COLUMN delivery_fee NUMERIC DEFAULT 0;
