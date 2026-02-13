
-- Migrate existing data to new roles
UPDATE public.admin_users SET role = 'staff' WHERE role = 'funcionario';
UPDATE public.admin_users SET role = 'manager' WHERE role = 'gerente';
UPDATE public.admin_users SET role = 'owner' WHERE role = 'dono';

-- Create a master_login function (no winery_id required)
CREATE OR REPLACE FUNCTION public.master_login(p_email text, p_password text)
 RETURNS TABLE(id uuid, winery_id uuid, email text, name text, role admin_role)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.winery_id, a.email, a.name, a.role
  FROM public.admin_users a
  WHERE a.email = p_email
    AND a.password_hash = p_password
    AND a.role = 'master'
  LIMIT 1;
$function$;
