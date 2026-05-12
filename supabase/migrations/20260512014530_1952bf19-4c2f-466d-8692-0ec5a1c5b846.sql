
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  admin_id uuid,
  admin_name text,
  entity text NOT NULL,
  entity_id text,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_winery ON public.audit_logs(winery_id, created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity, entity_id);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.audit_logs FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.audit_logs FOR DELETE USING (false);

ALTER TABLE public.wineries
  ADD COLUMN IF NOT EXISTS google_business_url text,
  ADD COLUMN IF NOT EXISTS tripadvisor_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text;

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;
