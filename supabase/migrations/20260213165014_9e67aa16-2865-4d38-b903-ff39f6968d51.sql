
-- Drop overly permissive INSERT/UPDATE/DELETE policies

-- admin_users: only accessed via edge functions (service role bypasses RLS)
DROP POLICY IF EXISTS "Allow insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow update admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow delete admin_users" ON public.admin_users;

-- automations: only written via edge functions
DROP POLICY IF EXISTS "Insert automations" ON public.automations;
DROP POLICY IF EXISTS "Update automations" ON public.automations;

-- ratings: now handled via tourist-actions edge function
DROP POLICY IF EXISTS "Insert ratings" ON public.ratings;
DROP POLICY IF EXISTS "Update ratings" ON public.ratings;

-- vouchers: now handled via edge functions
DROP POLICY IF EXISTS "Insert vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Update vouchers" ON public.vouchers;

-- tasting_packages: now handled via admin-packages edge function
DROP POLICY IF EXISTS "Insert tasting_packages" ON public.tasting_packages;
DROP POLICY IF EXISTS "Update tasting_packages" ON public.tasting_packages;
DROP POLICY IF EXISTS "Delete tasting_packages" ON public.tasting_packages;

-- users_leads: INSERT only via tourist-login edge function
DROP POLICY IF EXISTS "Anyone can create a lead" ON public.users_leads;
