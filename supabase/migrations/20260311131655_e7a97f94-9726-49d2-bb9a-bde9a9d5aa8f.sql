ALTER TABLE public.capture_points 
  ADD COLUMN linked_restaurant_cp_id uuid REFERENCES public.capture_points(id) ON DELETE SET NULL,
  ADD COLUMN linked_shop_cp_id uuid REFERENCES public.capture_points(id) ON DELETE SET NULL,
  ADD COLUMN linked_tasting_cp_id uuid REFERENCES public.capture_points(id) ON DELETE SET NULL;