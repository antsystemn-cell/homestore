ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS public.reel_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reel_likes_user_uniq ON public.reel_likes(reel_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reel_likes_device_uniq ON public.reel_likes(reel_id, device_id) WHERE user_id IS NULL AND device_id IS NOT NULL;

GRANT SELECT, INSERT, DELETE ON public.reel_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.reel_likes TO anon;
GRANT ALL ON public.reel_likes TO service_role;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reel_likes_read" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "reel_likes_insert" ON public.reel_likes FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "reel_likes_delete" ON public.reel_likes FOR DELETE USING (user_id IS NULL OR user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.reel_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reel_comments_reel_idx ON public.reel_comments(reel_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reel_comments TO authenticated;
GRANT SELECT ON public.reel_comments TO anon;
GRANT ALL ON public.reel_comments TO service_role;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reel_comments_read" ON public.reel_comments FOR SELECT USING (is_hidden = false);
CREATE POLICY "reel_comments_insert" ON public.reel_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reel_comments_own_delete" ON public.reel_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reel_comments_admin_update" ON public.reel_comments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reel_comments_admin_read" ON public.reel_comments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));