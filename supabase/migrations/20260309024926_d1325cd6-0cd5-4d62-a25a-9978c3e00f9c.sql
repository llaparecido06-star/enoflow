
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'promotion',
  status text NOT NULL DEFAULT 'draft',
  target_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz,
  sent_at timestamptz
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct select on campaigns" ON public.campaigns FOR SELECT USING (false);
CREATE POLICY "No direct insert on campaigns" ON public.campaigns FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on campaigns" ON public.campaigns FOR UPDATE USING (false);
CREATE POLICY "No direct delete on campaigns" ON public.campaigns FOR DELETE USING (false);
