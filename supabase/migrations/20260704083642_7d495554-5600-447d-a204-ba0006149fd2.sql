
ALTER TABLE public.spin_config
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT false;

-- Ensure singleton row exists so admin UI can load
INSERT INTO public.spin_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
