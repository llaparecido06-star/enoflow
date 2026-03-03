
CREATE TABLE public.capture_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users_leads(id) ON DELETE CASCADE,
  winery_id UUID NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  capture_category TEXT,
  capture_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.capture_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct select on capture_history" ON public.capture_history FOR SELECT USING (false);
CREATE POLICY "No direct insert on capture_history" ON public.capture_history FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on capture_history" ON public.capture_history FOR UPDATE USING (false);
CREATE POLICY "No direct delete on capture_history" ON public.capture_history FOR DELETE USING (false);

CREATE INDEX idx_capture_history_user ON public.capture_history(user_id);
CREATE INDEX idx_capture_history_winery ON public.capture_history(winery_id);
