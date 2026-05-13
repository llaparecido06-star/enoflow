ALTER TABLE public.capture_points
ADD COLUMN IF NOT EXISTS enabled_modules text[] NULL;

COMMENT ON COLUMN public.capture_points.enabled_modules IS 'Override de módulos exibidos ao escanear este QR (tasting, restaurant, shop). NULL = herda da vinícola.';