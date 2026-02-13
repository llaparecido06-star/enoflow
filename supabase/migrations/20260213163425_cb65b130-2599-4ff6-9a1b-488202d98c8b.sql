
-- Add ficha técnica and harmonização fields to wines
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS grape text;
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS alcohol_content text;
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS serving_temp text;
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS aging text;
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS enologist text;
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS aromatic_notes text[];
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS harmonization text[];
ALTER TABLE public.wines ADD COLUMN IF NOT EXISTS year integer;
