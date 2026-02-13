-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winery_id UUID NOT NULL REFERENCES public.wineries(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  suggested_wine_id UUID REFERENCES public.wines(id),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Public read access (tourists need to see the menu)
CREATE POLICY "Menu items are publicly readable"
ON public.menu_items FOR SELECT
USING (true);

-- Admin write via edge functions (using service role)
-- No INSERT/UPDATE/DELETE policies needed for anonymous users
