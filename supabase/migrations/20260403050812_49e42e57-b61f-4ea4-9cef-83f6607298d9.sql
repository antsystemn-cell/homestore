
-- Make user_id nullable on payment_intents for guest payments
ALTER TABLE public.payment_intents ALTER COLUMN user_id DROP NOT NULL;

-- Allow anonymous users to insert guest payment intents
CREATE POLICY "Anon can create payment intents"
ON public.payment_intents
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Allow anonymous users to view payment intents they created (by id)
CREATE POLICY "Anon can view payment intents"
ON public.payment_intents
FOR SELECT
TO anon
USING (user_id IS NULL);
