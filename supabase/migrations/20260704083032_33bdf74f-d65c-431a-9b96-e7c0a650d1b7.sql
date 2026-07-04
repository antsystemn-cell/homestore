
-- Extend reviews with images, hidden flag, order link, timestamp
ALTER TABLE public.reviews 
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verified purchase check
CREATE OR REPLACE FUNCTION public.has_purchased_product(_user_id uuid, _product_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.user_id = _user_id
      AND o.status IN ('delivered','completed')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(o.items,'[]'::jsonb)) it
        WHERE (it->>'product_id') = _product_id::text
      )
  )
$$;

-- Replace insert policy: user_id matches AND user has purchased+received the product
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Verified buyers can create reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_purchased_product(auth.uid(), product_id));

-- Allow users to update their own reviews (edit rating/comment/images)
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Replace select policy: hide hidden reviews from non-admins
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews
  FOR SELECT USING (is_hidden = false OR public.has_role(auth.uid(),'admin'::app_role));

-- Batch aggregate stats
CREATE OR REPLACE FUNCTION public.get_product_review_stats(_ids uuid[])
RETURNS TABLE(product_id uuid, avg_rating numeric, review_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.product_id,
         ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
         COUNT(*)::int AS review_count
  FROM public.reviews r
  WHERE r.product_id = ANY(_ids) AND r.is_hidden = false
  GROUP BY r.product_id
$$;

-- Unique buyer count for a product
CREATE OR REPLACE FUNCTION public.get_product_buyer_count(_product_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT COALESCE(o.user_id::text, o.phone))::int
  FROM public.orders o
  WHERE o.status IN ('delivered','completed','confirmed','delivering','paid')
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(o.items,'[]'::jsonb)) it
      WHERE (it->>'product_id') = _product_id::text
    )
$$;

-- Admin moderation list (includes hidden)
CREATE OR REPLACE FUNCTION public.admin_list_reviews(_limit int DEFAULT 200, _offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, product_id uuid, product_name text, product_image text,
  user_id uuid, user_name text, rating smallint, comment text,
  images text[], is_hidden boolean, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT r.id, r.product_id, p.name, p.thumbnail_url,
         r.user_id, r.user_name, r.rating, r.comment,
         r.images, r.is_hidden, r.created_at
  FROM public.reviews r
  LEFT JOIN public.products p ON p.id = r.product_id
  ORDER BY r.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;
