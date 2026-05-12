DROP POLICY IF EXISTS "Wine reviews readable" ON public.wine_reviews;
CREATE POLICY "no direct select" ON public.wine_reviews FOR SELECT USING (false);