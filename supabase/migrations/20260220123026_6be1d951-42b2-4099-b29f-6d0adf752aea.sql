
-- Add financial columns to wineries
ALTER TABLE public.wineries
  ADD COLUMN subscription_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN platform_commission_rate numeric NOT NULL DEFAULT 0;
