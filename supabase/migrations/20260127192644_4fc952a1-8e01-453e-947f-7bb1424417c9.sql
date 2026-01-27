-- Create storage bucket for category icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-icons', 'category-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view category icons (public bucket)
CREATE POLICY "Anyone can view category icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-icons');

-- Only admins can upload/update/delete category icons
CREATE POLICY "Admins can upload category icons"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'category-icons' AND is_admin());

CREATE POLICY "Admins can update category icons"
ON storage.objects FOR UPDATE
USING (bucket_id = 'category-icons' AND is_admin());

CREATE POLICY "Admins can delete category icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'category-icons' AND is_admin());