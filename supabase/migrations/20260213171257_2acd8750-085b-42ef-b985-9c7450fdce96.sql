-- Recreate admin_users_public view without email to prevent exposure
DROP VIEW IF EXISTS public.admin_users_public;
CREATE VIEW public.admin_users_public
WITH (security_invoker=on) AS
  SELECT id, name, role, winery_id, created_at
  FROM public.admin_users;
