
-- Add status to wineries for Kill Switch
ALTER TABLE public.wineries ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add is_active to admin_users for staff management
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- SSO login function: finds user by email+password across all wineries
CREATE OR REPLACE FUNCTION public.sso_login(p_email text, p_password text)
RETURNS TABLE(id uuid, winery_id uuid, email text, name text, role admin_role, winery_slug text, winery_name text, winery_status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT a.id, a.winery_id, a.email, a.name, a.role, 
         w.slug as winery_slug, w.name as winery_name, w.status as winery_status
  FROM public.admin_users a
  JOIN public.wineries w ON w.id = a.winery_id
  WHERE a.email = p_email
    AND a.password_hash = crypt(p_password, a.password_hash)
    AND a.is_active = true
  LIMIT 1;
$$;
