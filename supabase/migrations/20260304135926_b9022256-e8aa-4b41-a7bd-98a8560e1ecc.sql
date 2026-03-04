-- Allow public SELECT on vouchers so Supabase Realtime works for tourist app
CREATE POLICY "Vouchers are publicly readable"
ON public.vouchers
FOR SELECT
USING (true);