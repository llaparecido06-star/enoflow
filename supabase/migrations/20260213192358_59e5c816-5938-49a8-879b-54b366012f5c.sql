
-- Block direct access to ratings table
DROP POLICY IF EXISTS "Ratings are publicly readable" ON public.ratings;
CREATE POLICY "No direct select on ratings" ON public.ratings FOR SELECT USING (false);
