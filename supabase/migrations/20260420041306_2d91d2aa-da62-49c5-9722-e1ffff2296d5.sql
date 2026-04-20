ALTER TABLE public.story_videos
ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_story_view(_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.story_videos
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = _story_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_story_view(uuid) TO anon, authenticated;