
-- 1) Frequently bought together
CREATE OR REPLACE FUNCTION public.get_frequently_bought_together(
  _product_id uuid,
  _limit int DEFAULT 3
)
RETURNS TABLE(product_id uuid, score int, source text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
BEGIN
  SELECT category_id INTO v_category_id
  FROM public.products
  WHERE id = _product_id;

  RETURN QUERY
  WITH source_orders AS (
    SELECT o.id, o.user_id, o.created_at, o.items
    FROM public.orders o
    WHERE o.status IN ('completed','confirmed','delivering','delivered','paid')
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(o.items,'[]'::jsonb)) it
        WHERE (it->>'product_id') = _product_id::text
      )
  ),
  co_in_order AS (
    SELECT NULLIF(item->>'product_id','')::uuid AS pid
    FROM source_orders s,
         LATERAL jsonb_array_elements(COALESCE(s.items,'[]'::jsonb)) item
    WHERE (item->>'product_id') IS NOT NULL
      AND (item->>'product_id') <> _product_id::text
  ),
  co_by_user AS (
    SELECT NULLIF(item->>'product_id','')::uuid AS pid
    FROM source_orders s
    JOIN public.orders o3
      ON o3.user_id = s.user_id
     AND s.user_id IS NOT NULL
     AND o3.id <> s.id
     AND o3.created_at BETWEEN s.created_at - interval '90 days'
                            AND s.created_at + interval '90 days',
         LATERAL jsonb_array_elements(COALESCE(o3.items,'[]'::jsonb)) item
    WHERE (item->>'product_id') IS NOT NULL
      AND (item->>'product_id') <> _product_id::text
  ),
  counted AS (
    SELECT pid, count(*)::int AS score
    FROM (SELECT pid FROM co_in_order UNION ALL SELECT pid FROM co_by_user) u
    WHERE pid IS NOT NULL
    GROUP BY pid
  ),
  primary_ranked AS (
    SELECT c.pid AS product_id, c.score, 'co_purchase'::text AS source
    FROM counted c
    JOIN public.products p
      ON p.id = c.pid
     AND COALESCE(p.is_active, true) = true
    ORDER BY c.score DESC
    LIMIT _limit
  ),
  fallback_ranked AS (
    SELECT p.id AS product_id, COALESCE(p.sales,0)::int AS score, 'category_top'::text AS source
    FROM public.products p
    WHERE COALESCE(p.is_active, true) = true
      AND p.id <> _product_id
      AND v_category_id IS NOT NULL
      AND p.category_id = v_category_id
      AND p.id NOT IN (SELECT product_id FROM primary_ranked)
    ORDER BY COALESCE(p.sales,0) DESC
    LIMIT _limit
  ),
  combined AS (
    SELECT * FROM primary_ranked
    UNION ALL
    SELECT * FROM fallback_ranked
  )
  SELECT combined.product_id, combined.score, combined.source
  FROM combined
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_frequently_bought_together(uuid, int) TO anon, authenticated;

-- 2) Personalized recommendations (For You)
CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(
  _limit int DEFAULT 8
)
RETURNS TABLE(product_id uuid, score int)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY
    SELECT p.id, COALESCE(p.sales,0)::int
    FROM public.products p
    WHERE COALESCE(p.is_active,true) = true
    ORDER BY COALESCE(p.sales,0) DESC
    LIMIT _limit;
    RETURN;
  END IF;

  RETURN QUERY
  WITH user_orders AS (
    SELECT items
    FROM public.orders
    WHERE user_id = v_uid
      AND status IN ('completed','confirmed','delivering','delivered','paid')
  ),
  purchased AS (
    SELECT DISTINCT NULLIF(item->>'product_id','')::uuid AS pid
    FROM user_orders,
         LATERAL jsonb_array_elements(COALESCE(items,'[]'::jsonb)) item
    WHERE (item->>'product_id') IS NOT NULL
  ),
  user_cats AS (
    SELECT DISTINCT p.category_id
    FROM purchased pp
    JOIN public.products p ON p.id = pp.pid
    WHERE p.category_id IS NOT NULL
  )
  SELECT p.id, COALESCE(p.sales,0)::int
  FROM public.products p
  WHERE COALESCE(p.is_active,true) = true
    AND p.category_id IN (SELECT category_id FROM user_cats)
    AND p.id NOT IN (SELECT pid FROM purchased WHERE pid IS NOT NULL)
  ORDER BY COALESCE(p.sales,0) DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_personalized_recommendations(int) TO anon, authenticated;
