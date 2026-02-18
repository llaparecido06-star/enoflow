
DROP VIEW IF EXISTS public.users_leads_public;
CREATE VIEW public.users_leads_public WITH (security_invoker=on) AS
  SELECT id, name, preferences_summary, winery_id, created_at
  FROM public.users_leads;
