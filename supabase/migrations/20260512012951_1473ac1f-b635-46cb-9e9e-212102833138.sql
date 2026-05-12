
-- ═══════════════════════════════════════════════════════════
-- BLOCO CRÍTICO: Reservas, Estoque, Financeiro, Config Winery
-- ═══════════════════════════════════════════════════════════

-- 1. RESERVAS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reservation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  capture_point_id uuid,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer NOT NULL DEFAULT 10,
  price numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservation_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.reservation_slots FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.reservation_slots FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.reservation_slots FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.reservation_slots FOR DELETE USING (false);
CREATE INDEX IF NOT EXISTS idx_slots_winery ON public.reservation_slots(winery_id, weekday);

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  lead_id uuid,
  slot_id uuid,
  capture_point_id uuid,
  scheduled_at timestamptz NOT NULL,
  party_size integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pendente',
  assigned_admin_id uuid,
  notes text,
  source text NOT NULL DEFAULT 'admin',
  contact_name text,
  contact_whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.reservations FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.reservations FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.reservations FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.reservations FOR DELETE USING (false);
CREATE INDEX IF NOT EXISTS idx_reservations_winery_date ON public.reservations(winery_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reservations_admin ON public.reservations(assigned_admin_id);

-- 2. ESTOQUE ──────────────────────────────────────────────
ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_min integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  wine_id uuid NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL DEFAULT 'ajuste',
  voucher_id uuid,
  admin_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.stock_movements FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.stock_movements FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.stock_movements FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.stock_movements FOR DELETE USING (false);
CREATE INDEX IF NOT EXISTS idx_stock_winery ON public.stock_movements(winery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_wine ON public.stock_movements(wine_id, created_at DESC);

-- 3. FINANCEIRO ──────────────────────────────────────────
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'mixed';
CREATE INDEX IF NOT EXISTS idx_vouchers_winery_date ON public.vouchers(winery_id, created_at DESC);

-- 4. CONFIG WINERY ──────────────────────────────────────────
ALTER TABLE public.wineries
  ADD COLUMN IF NOT EXISTS business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS lgpd_policy_url text,
  ADD COLUMN IF NOT EXISTS default_language text NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS supported_languages text[] NOT NULL DEFAULT ARRAY['pt-BR'];
