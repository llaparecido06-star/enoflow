
ALTER TABLE public.capture_history ADD COLUMN capture_point_id UUID REFERENCES public.capture_points(id) ON DELETE SET NULL;
CREATE INDEX idx_capture_history_point ON public.capture_history(capture_point_id);
