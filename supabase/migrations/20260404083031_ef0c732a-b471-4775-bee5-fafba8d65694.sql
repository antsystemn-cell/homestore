DROP TRIGGER IF EXISTS trg_increment_sales_on_complete ON public.orders;

CREATE OR REPLACE FUNCTION public.generate_slug(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        trim(name),
        '\s+', '-', 'g'
      ),
      '[^a-zA-Z0-9\u0400-\u04FF\u1800-\u18AF-]', '', 'g'
    )
  );
END;
$function$;