-- Create Storage Buckets for VeggieScore
-- Task 07: Storage Integration

-- 1. Menus bucket (public read for approved content)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menus',
  'menus',
  true,  -- Public read access
  10485760,  -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Artifacts bucket (private, for raw crawl data)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artifacts',
  'artifacts',
  false,  -- Private access
  52428800,  -- 50MB limit
  ARRAY['text/html', 'application/json', 'application/pdf', 'image/jpeg', 'image/png', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- 3. User uploads bucket (private with user-specific access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads',
  false,  -- Private access
  20971520,  -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'menus' bucket
-- Allow public to read approved menus
CREATE POLICY "Public read access to menus"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'menus');

-- Allow authenticated users to upload menus (will be reviewed)
CREATE POLICY "Authenticated users can upload menus"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menus');

-- Allow service role full access
CREATE POLICY "Service role full access to menus"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'menus');

-- Storage Policies for 'artifacts' bucket
-- Only service role can access artifacts
CREATE POLICY "Service role full access to artifacts"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'artifacts');

-- Storage Policies for 'user-uploads' bucket
-- Users can only access their own uploads
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Service role full access to user uploads
CREATE POLICY "Service role full access to user-uploads"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'user-uploads');

-- Helper function to get file extension
CREATE OR REPLACE FUNCTION get_file_extension(filename TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(SUBSTRING(filename FROM '\.([^.]+)$'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to generate storage path
CREATE OR REPLACE FUNCTION generate_storage_path(
  p_bucket TEXT,
  p_place_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_filename TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_path TEXT;
  v_timestamp TEXT;
BEGIN
  v_timestamp := TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');

  CASE p_bucket
    WHEN 'menus' THEN
      v_path := p_place_id::TEXT || '/' || v_timestamp || '-' || COALESCE(p_filename, 'menu');
    WHEN 'artifacts' THEN
      v_path := p_place_id::TEXT || '/' || v_timestamp || '-' || COALESCE(p_filename, 'artifact');
    WHEN 'user-uploads' THEN
      v_path := p_user_id::TEXT || '/' || v_timestamp || '-' || COALESCE(p_filename, 'upload');
    ELSE
      RAISE EXCEPTION 'Invalid bucket: %', p_bucket;
  END CASE;

  RETURN v_path;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_storage_path IS 'Generate organized storage paths for different buckets';
