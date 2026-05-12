ALTER TABLE public.wine_reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_wine_reviews_wine ON public.wine_reviews(wine_id);
CREATE INDEX IF NOT EXISTS idx_wine_reviews_user ON public.wine_reviews(user_id);