CREATE POLICY "product-videos public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-videos');

CREATE POLICY "product-videos admin insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "product-videos admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "product-videos admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));