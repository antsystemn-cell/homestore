ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_temporarily_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.is_temporarily_out IS 'Түр дууссан тэмдэг — бараа түр хугацаагаар дууссан гэдгийг илэрхийлнэ';