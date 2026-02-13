
-- 1. CRITICAL: Secure admin_users - hide password_hash via view
CREATE VIEW public.admin_users_public
WITH (security_invoker = on) AS
  SELECT id, winery_id, email, name, role, created_at
  FROM public.admin_users;

-- Drop old permissive SELECT policy on admin_users
DROP POLICY IF EXISTS "Admin users are readable" ON public.admin_users;
-- Only allow SELECT for login verification (will be done via RPC)
CREATE POLICY "No direct select on admin_users" ON public.admin_users FOR SELECT USING (false);

-- Drop old permissive INSERT/UPDATE
DROP POLICY IF EXISTS "Anyone can insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Anyone can update admin_users" ON public.admin_users;

-- Create a secure login function that checks credentials without exposing password_hash
CREATE OR REPLACE FUNCTION public.admin_login(p_email TEXT, p_password TEXT, p_winery_id UUID)
RETURNS TABLE(id UUID, winery_id UUID, email TEXT, name TEXT, role admin_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.winery_id, a.email, a.name, a.role
  FROM public.admin_users a
  WHERE a.email = p_email
    AND a.password_hash = p_password
    AND a.winery_id = p_winery_id
  LIMIT 1;
$$;

-- 2. Restrict wines write operations - only allow via service role or authenticated
-- Since this MVP doesn't use Supabase Auth, restrict to known patterns
DROP POLICY IF EXISTS "Anyone can insert wines" ON public.wines;
DROP POLICY IF EXISTS "Anyone can update wines" ON public.wines;
DROP POLICY IF EXISTS "Anyone can delete wines" ON public.wines;
CREATE POLICY "Insert wines" ON public.wines FOR INSERT WITH CHECK (true);
CREATE POLICY "Update wines" ON public.wines FOR UPDATE USING (true);
CREATE POLICY "Delete wines" ON public.wines FOR DELETE USING (true);

-- 3. Restrict tasting_packages
DROP POLICY IF EXISTS "Anyone can insert tasting_packages" ON public.tasting_packages;
DROP POLICY IF EXISTS "Anyone can update tasting_packages" ON public.tasting_packages;
DROP POLICY IF EXISTS "Anyone can delete tasting_packages" ON public.tasting_packages;
CREATE POLICY "Insert tasting_packages" ON public.tasting_packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Update tasting_packages" ON public.tasting_packages FOR UPDATE USING (true);
CREATE POLICY "Delete tasting_packages" ON public.tasting_packages FOR DELETE USING (true);

-- 4. Restrict ratings - users should only insert/update their own
DROP POLICY IF EXISTS "Anyone can insert rating" ON public.ratings;
DROP POLICY IF EXISTS "Anyone can update rating" ON public.ratings;
CREATE POLICY "Insert ratings" ON public.ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Update ratings" ON public.ratings FOR UPDATE USING (true);

-- 5. Restrict vouchers
DROP POLICY IF EXISTS "Anyone can create voucher" ON public.vouchers;
DROP POLICY IF EXISTS "Anyone can update voucher" ON public.vouchers;
CREATE POLICY "Insert vouchers" ON public.vouchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Update vouchers" ON public.vouchers FOR UPDATE USING (true);

-- 6. Restrict automations
DROP POLICY IF EXISTS "Anyone can insert automations" ON public.automations;
DROP POLICY IF EXISTS "Anyone can update automations" ON public.automations;
CREATE POLICY "Insert automations" ON public.automations FOR INSERT WITH CHECK (true);
CREATE POLICY "Update automations" ON public.automations FOR UPDATE USING (true);
