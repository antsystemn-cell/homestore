-- Allow admins and moderators to manually create offline/external orders
CREATE POLICY "Admins can create manual orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Moderators can create manual orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'moderator'::public.app_role));

-- Track order source channel (web, facebook, phone, instagram, store, other)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS source_note text;