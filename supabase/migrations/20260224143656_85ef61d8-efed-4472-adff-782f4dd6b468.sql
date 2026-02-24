
-- Add NPS score to vouchers table (0-10 scale, nullable)
ALTER TABLE public.vouchers ADD COLUMN nps_score integer;
