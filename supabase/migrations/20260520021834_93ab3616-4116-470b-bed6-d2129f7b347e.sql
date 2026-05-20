ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gifts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Migrate any existing single gift_name into the array
UPDATE public.products
SET gifts = jsonb_build_array(jsonb_build_object('name', gift_name))
WHERE has_gift = true AND gift_name IS NOT NULL AND gift_name <> '' AND (gifts IS NULL OR jsonb_array_length(gifts) = 0);