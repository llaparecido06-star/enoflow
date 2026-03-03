
ALTER TABLE public.menu_items ADD COLUMN capture_point_id UUID REFERENCES public.capture_points(id) ON DELETE SET NULL;
CREATE INDEX idx_menu_items_capture_point ON public.menu_items(capture_point_id);
