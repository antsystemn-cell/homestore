UPDATE public.active_carts
SET items = (
  SELECT jsonb_agg(
    CASE WHEN COALESCE((it->>'quantity')::numeric, 1) > 20
      THEN jsonb_set(it, '{quantity}', '1'::jsonb)
      ELSE it END
  )
  FROM jsonb_array_elements(items::jsonb) AS it
)
WHERE items IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(items::jsonb) AS it
    WHERE COALESCE((it->>'quantity')::numeric, 1) > 20
  );