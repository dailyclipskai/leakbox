
CREATE POLICY "storage_boxes_public_read" ON storage.objects FOR SELECT USING (bucket_id IN ('boxes','avatars'));
CREATE POLICY "storage_boxes_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('boxes','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "storage_boxes_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('boxes','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "storage_boxes_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('boxes','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
