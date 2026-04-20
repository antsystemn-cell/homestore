-- Create public storage bucket for story thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-thumbnails', 'story-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Story thumbnails are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-thumbnails');

-- Admins can upload
CREATE POLICY "Admins can upload story thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'story-thumbnails'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update
CREATE POLICY "Admins can update story thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'story-thumbnails'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete
CREATE POLICY "Admins can delete story thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'story-thumbnails'
  AND has_role(auth.uid(), 'admin'::app_role)
);
