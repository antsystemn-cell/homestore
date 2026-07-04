
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
  v_category text;
BEGIN
  SELECT category INTO v_category
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
    SELECT c.pid AS r_pid, c.score AS r_score, 'co_purchase'::text AS r_source
    FROM counted c
    JOIN public.products p
      ON p.id = c.pid
     AND COALESCE(p.is_active, true) = true
    ORDER BY c.score DESC
    LIMIT _limit
  ),
  fallback_ranked AS (
    SELECT p.id AS r_pid, COALESCE(p.sales,0)::int AS r_score, 'category_top'::text AS r_source
    FROM public.products p
    WHERE COALESCE(p.is_active, true) = true
      AND p.id <> _product_id
      AND v_category IS NOT NULL
      AND p.category = v_category
      AND p.id NOT IN (SELECT r_pid FROM primary_ranked)
    ORDER BY COALESCE(p.sales,0) DESC
    LIMIT _limit
  ),
  combined AS (
    SELECT r_pid, r_score, r_source FROM primary_ranked
    UNION ALL
    SELECT r_pid, r_score, r_source FROM fallback_ranked
  )
  SELECT combined.r_pid, combined.r_score, combined.r_source
  FROM combined
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_frequently_bought_together(uuid, int) TO anon, authenticated;
