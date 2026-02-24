
-- Add max_locations and currency to wineries
ALTER TABLE public.wineries 
  ADD COLUMN IF NOT EXISTS max_locations integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL';

-- Create capture_points table
CREATE TABLE public.capture_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winery_id uuid NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'restaurant',
  redirect_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.capture_points ENABLE ROW LEVEL SECURITY;

-- Only allow access via edge functions (service role)
CREATE POLICY "No direct select on capture_points" ON public.capture_points FOR SELECT USING (false);
CREATE POLICY "No direct insert on capture_points" ON public.capture_points FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on capture_points" ON public.capture_points FOR UPDATE USING (false);
CREATE POLICY "No direct delete on capture_points" ON public.capture_points FOR DELETE USING (false);
