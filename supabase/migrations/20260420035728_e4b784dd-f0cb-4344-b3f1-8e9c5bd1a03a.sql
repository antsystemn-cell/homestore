CREATE TABLE public.story_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.story_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active story videos"
ON public.story_videos FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert story videos"
ON public.story_videos FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update story videos"
ON public.story_videos FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete story videos"
ON public.story_videos FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_story_videos_updated_at
BEFORE UPDATE ON public.story_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_story_videos_active_position ON public.story_videos(is_active, position);