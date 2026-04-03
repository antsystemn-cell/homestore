
-- Allow moderators to view all orders
CREATE POLICY "Moderators can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to update orders
CREATE POLICY "Moderators can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to view all delivery options (already public, but ensure)
-- delivery_options already has "Anyone can view active delivery options" so no change needed

-- Allow moderators to view payment intents
CREATE POLICY "Moderators can view all payment intents"
  ON public.payment_intents FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to view all profiles (for order customer info)
CREATE POLICY "Moderators can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'moderator'::app_role));
