
-- Lock down users_leads table completely - all access goes through edge functions with service role
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can read own lead only" ON public.users_leads;
DROP POLICY IF EXISTS "Users can update own lead" ON public.users_leads;

-- Deny all direct access - edge functions use service role which bypasses RLS
CREATE POLICY "No direct select on users_leads"
  ON public.users_leads FOR SELECT
  USING (false);
