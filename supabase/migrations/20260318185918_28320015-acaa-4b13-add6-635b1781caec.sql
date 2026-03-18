
CREATE TABLE public.landing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  winery_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form)
CREATE POLICY "Anyone can submit landing lead" ON public.landing_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated admins can read
CREATE POLICY "Authenticated can read leads" ON public.landing_leads
  FOR SELECT TO authenticated
  USING (true);
