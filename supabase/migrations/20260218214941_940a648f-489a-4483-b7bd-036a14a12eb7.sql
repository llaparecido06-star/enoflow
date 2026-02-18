-- Drop the overly permissive INSERT policy on storage.objects
DROP POLICY IF EXISTS "Authenticated users can upload wine images" ON storage.objects;