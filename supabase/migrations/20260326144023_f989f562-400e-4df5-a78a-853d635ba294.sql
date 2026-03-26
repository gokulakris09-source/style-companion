
-- Allow anyone to upload to clothing-images bucket
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'clothing-images');
CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT TO public USING (bucket_id = 'clothing-images' OR bucket_id = 'tryon-images');
CREATE POLICY "Allow public uploads tryon" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'tryon-images');
