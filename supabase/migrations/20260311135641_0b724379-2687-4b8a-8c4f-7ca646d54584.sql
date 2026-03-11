
-- Favorites table for persistent cross-device sync
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users_leads(id) ON DELETE CASCADE,
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  winery_id uuid NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, wine_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct select on favorites" ON public.favorites FOR SELECT TO public USING (false);
CREATE POLICY "No direct insert on favorites" ON public.favorites FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "No direct delete on favorites" ON public.favorites FOR DELETE TO public USING (false);
