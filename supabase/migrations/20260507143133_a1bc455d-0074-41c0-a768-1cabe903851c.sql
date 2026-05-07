
-- CRM lead state
CREATE TABLE public.crm_lead_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  winery_id uuid NOT NULL,
  stage text NOT NULL DEFAULT 'novo',
  assigned_admin_id uuid,
  tags text[] NOT NULL DEFAULT '{}',
  estimated_value numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);
CREATE INDEX idx_crm_lead_state_winery ON public.crm_lead_state(winery_id);
CREATE INDEX idx_crm_lead_state_stage ON public.crm_lead_state(winery_id, stage);
ALTER TABLE public.crm_lead_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_lead_state FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_lead_state FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_lead_state FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_lead_state FOR DELETE USING (false);

-- CRM lead notes
CREATE TABLE public.crm_lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  winery_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_lead_notes_lead ON public.crm_lead_notes(lead_id);
ALTER TABLE public.crm_lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_lead_notes FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_lead_notes FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_lead_notes FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_lead_notes FOR DELETE USING (false);

-- CRM message log
CREATE TABLE public.crm_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  winery_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  template_id uuid,
  channel text NOT NULL DEFAULT 'whatsapp',
  body text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_message_log_lead ON public.crm_message_log(lead_id);
ALTER TABLE public.crm_message_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_message_log FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_message_log FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_message_log FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_message_log FOR DELETE USING (false);

-- CRM message templates
CREATE TABLE public.crm_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  name text NOT NULL,
  stage text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_msg_templates_winery ON public.crm_message_templates(winery_id);
ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_message_templates FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_message_templates FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_message_templates FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_message_templates FOR DELETE USING (false);

-- CRM saved segments
CREATE TABLE public.crm_saved_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_segments_winery ON public.crm_saved_segments(winery_id);
ALTER TABLE public.crm_saved_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_saved_segments FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_saved_segments FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_saved_segments FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_saved_segments FOR DELETE USING (false);

-- Loyalty rewards
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  threshold integer NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_rewards_winery ON public.loyalty_rewards(winery_id);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Loyalty rewards readable" ON public.loyalty_rewards FOR SELECT USING (true);
CREATE POLICY "no direct insert" ON public.loyalty_rewards FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.loyalty_rewards FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.loyalty_rewards FOR DELETE USING (false);

-- users_leads new fields
ALTER TABLE public.users_leads
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by uuid,
  ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;
