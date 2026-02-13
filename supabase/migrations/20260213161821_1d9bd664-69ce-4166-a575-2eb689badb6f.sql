-- Create storage bucket for wine images
INSERT INTO storage.buckets (id, name, public) VALUES ('wine-images', 'wine-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Wine images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'wine-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload wine images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wine-images');
