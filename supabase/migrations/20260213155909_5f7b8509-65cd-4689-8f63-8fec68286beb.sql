
-- Restrict direct SELECT on users_leads - hide contact info
DROP POLICY IF EXISTS "Users can read own lead" ON public.users_leads;

-- Create a public view that only exposes non-sensitive fields (for tourist auth lookup)
CREATE VIEW public.users_leads_public
WITH (security_invoker = on) AS
  SELECT id, winery_id, name, created_at, preferences_summary
  FROM public.users_leads;

-- Only allow SELECT for rows matching the tourist's own auth_user_id
CREATE POLICY "Users can read own lead only" ON public.users_leads
  FOR SELECT USING (
    auth.uid() = auth_user_id
  );
