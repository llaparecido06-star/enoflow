
-- ─── Reviews ───
CREATE TABLE public.wine_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  wine_id uuid NOT NULL,
  user_id uuid,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  public_response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wine_reviews_winery ON public.wine_reviews(winery_id);
CREATE INDEX idx_wine_reviews_wine ON public.wine_reviews(wine_id);
ALTER TABLE public.wine_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wine reviews readable" ON public.wine_reviews FOR SELECT USING (true);
CREATE POLICY "no direct insert" ON public.wine_reviews FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.wine_reviews FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.wine_reviews FOR DELETE USING (false);

CREATE TABLE public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  voucher_id uuid,
  user_id uuid,
  score int NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_nps_winery ON public.nps_responses(winery_id);
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.nps_responses FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.nps_responses FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.nps_responses FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.nps_responses FOR DELETE USING (false);

-- ─── Loyalty ───
ALTER TABLE public.loyalty_rewards
  ADD COLUMN IF NOT EXISTS points_cost int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE TABLE public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  name text NOT NULL,
  min_points int NOT NULL DEFAULT 0,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  color text NOT NULL DEFAULT '#9CA3AF',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_tiers_winery ON public.loyalty_tiers(winery_id);
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Loyalty tiers readable" ON public.loyalty_tiers FOR SELECT USING (true);
CREATE POLICY "no direct insert" ON public.loyalty_tiers FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.loyalty_tiers FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.loyalty_tiers FOR DELETE USING (false);

CREATE TABLE public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL,
  points_spent int NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  redeemed_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_redemptions_winery ON public.loyalty_redemptions(winery_id);
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.loyalty_redemptions FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.loyalty_redemptions FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.loyalty_redemptions FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.loyalty_redemptions FOR DELETE USING (false);

ALTER TABLE public.wineries
  ADD COLUMN IF NOT EXISTS loyalty_rules jsonb NOT NULL DEFAULT '{"points_per_currency":1,"points_per_visit":50,"points_per_referral":100}'::jsonb;

-- ─── Events ───
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  capture_point_id uuid,
  title text NOT NULL,
  description text,
  cover_url text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  capacity int NOT NULL DEFAULT 30,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'agendado',
  rsvp_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_winery ON public.events(winery_id);
CREATE INDEX idx_events_starts ON public.events(starts_at);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events readable" ON public.events FOR SELECT USING (true);
CREATE POLICY "no direct insert" ON public.events FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.events FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.events FOR DELETE USING (false);

CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  event_id uuid NOT NULL,
  lead_id uuid,
  contact_name text NOT NULL,
  contact_whatsapp text,
  party_size int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_rsvps_winery ON public.event_rsvps(winery_id);
CREATE INDEX idx_event_rsvps_event ON public.event_rsvps(event_id);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.event_rsvps FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.event_rsvps FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.event_rsvps FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.event_rsvps FOR DELETE USING (false);
