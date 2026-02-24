INSERT INTO public.wineries (name, slug, status, primary_color, currency)
VALUES 
  ('Vinícola Góes', 'vinicola-goes', 'active', '#630D16', 'BRL'),
  ('Casa Valduga', 'casa-valduga', 'active', '#7A1D2D', 'BRL')
ON CONFLICT (slug) DO NOTHING;