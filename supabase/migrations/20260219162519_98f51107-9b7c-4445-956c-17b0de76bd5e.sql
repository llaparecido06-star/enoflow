
-- LGPD: Add consent columns to users_leads
ALTER TABLE public.users_leads
  ADD COLUMN IF NOT EXISTS accepted_terms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lgpd_consent_date timestamptz;
