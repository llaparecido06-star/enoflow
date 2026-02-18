
-- ═══════════════════════════════════════════════════════════
-- SECURITY LOCKDOWN: Remove all overly permissive write policies
-- All writes go through edge functions with service_role (bypasses RLS)
-- ═══════════════════════════════════════════════════════════

-- ─── WINES ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Insert wines" ON public.wines;
DROP POLICY IF EXISTS "Update wines" ON public.wines;
DROP POLICY IF EXISTS "Delete wines" ON public.wines;

CREATE POLICY "No direct insert on wines" ON public.wines FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on wines" ON public.wines FOR UPDATE USING (false);
CREATE POLICY "No direct delete on wines" ON public.wines FOR DELETE USING (false);

-- ─── TASTING_PACKAGES ────────────────────────────────────
DROP POLICY IF EXISTS "Insert tasting_packages" ON public.tasting_packages;
DROP POLICY IF EXISTS "Update tasting_packages" ON public.tasting_packages;
DROP POLICY IF EXISTS "Delete tasting_packages" ON public.tasting_packages;

CREATE POLICY "No direct insert on tasting_packages" ON public.tasting_packages FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on tasting_packages" ON public.tasting_packages FOR UPDATE USING (false);
CREATE POLICY "No direct delete on tasting_packages" ON public.tasting_packages FOR DELETE USING (false);

-- ─── RATINGS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Insert ratings" ON public.ratings;
DROP POLICY IF EXISTS "Update ratings" ON public.ratings;

CREATE POLICY "No direct insert on ratings" ON public.ratings FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on ratings" ON public.ratings FOR UPDATE USING (false);

-- ─── VOUCHERS ────────────────────────────────────────────
DROP POLICY IF EXISTS "Insert vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Update vouchers" ON public.vouchers;

CREATE POLICY "No direct insert on vouchers" ON public.vouchers FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on vouchers" ON public.vouchers FOR UPDATE USING (false);

-- ─── AUTOMATIONS ─────────────────────────────────────────
DROP POLICY IF EXISTS "Insert automations" ON public.automations;
DROP POLICY IF EXISTS "Update automations" ON public.automations;

CREATE POLICY "No direct insert on automations" ON public.automations FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on automations" ON public.automations FOR UPDATE USING (false);

-- ─── ADMIN_USERS ─────────────────────────────────────────
DROP POLICY IF EXISTS "Allow insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow update admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow delete admin_users" ON public.admin_users;

CREATE POLICY "No direct insert on admin_users" ON public.admin_users FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on admin_users" ON public.admin_users FOR UPDATE USING (false);
CREATE POLICY "No direct delete on admin_users" ON public.admin_users FOR DELETE USING (false);

-- ─── USERS_LEADS ─────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can create a lead" ON public.users_leads;
DROP POLICY IF EXISTS "Users can update own lead" ON public.users_leads;

CREATE POLICY "No direct insert on users_leads" ON public.users_leads FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on users_leads" ON public.users_leads FOR UPDATE USING (false);

-- ─── MENU_ITEMS ──────────────────────────────────────────
-- Menu items already has no INSERT/UPDATE/DELETE policies - add deny-all for safety
DROP POLICY IF EXISTS "Insert menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Update menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Delete menu_items" ON public.menu_items;

CREATE POLICY "No direct insert on menu_items" ON public.menu_items FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on menu_items" ON public.menu_items FOR UPDATE USING (false);
CREATE POLICY "No direct delete on menu_items" ON public.menu_items FOR DELETE USING (false);

-- ─── WINERIES ────────────────────────────────────────────
DROP POLICY IF EXISTS "Insert wineries" ON public.wineries;
DROP POLICY IF EXISTS "Update wineries" ON public.wineries;
DROP POLICY IF EXISTS "Delete wineries" ON public.wineries;

CREATE POLICY "No direct insert on wineries" ON public.wineries FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on wineries" ON public.wineries FOR UPDATE USING (false);
CREATE POLICY "No direct delete on wineries" ON public.wineries FOR DELETE USING (false);

-- ═══════════════════════════════════════════════════════════
-- REVOKE direct RPC access from anon/authenticated roles
-- Login RPCs should only be callable via edge functions (service_role)
-- ═══════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.admin_login FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.master_login FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hash_password FROM anon, authenticated;
