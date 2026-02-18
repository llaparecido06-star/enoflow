
-- Replace admin_login to use bcrypt verification via extensions schema
CREATE OR REPLACE FUNCTION public.admin_login(p_email text, p_password text, p_winery_id uuid)
 RETURNS TABLE(id uuid, winery_id uuid, email text, name text, role admin_role)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT a.id, a.winery_id, a.email, a.name, a.role
  FROM public.admin_users a
  WHERE a.email = p_email
    AND a.password_hash = crypt(p_password, a.password_hash)
    AND a.winery_id = p_winery_id
  LIMIT 1;
$function$;

-- Replace master_login to use bcrypt verification
CREATE OR REPLACE FUNCTION public.master_login(p_email text, p_password text)
 RETURNS TABLE(id uuid, winery_id uuid, email text, name text, role admin_role)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT a.id, a.winery_id, a.email, a.name, a.role
  FROM public.admin_users a
  WHERE a.email = p_email
    AND a.password_hash = crypt(p_password, a.password_hash)
    AND a.role = 'master'
  LIMIT 1;
$function$;

-- Create a helper function for edge functions to hash passwords
CREATE OR REPLACE FUNCTION public.hash_password(p_password text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  SELECT crypt(p_password, gen_salt('bf'));
$function$;

-- Rehash all existing plaintext passwords with bcrypt
UPDATE public.admin_users
SET password_hash = extensions.crypt(password_hash, extensions.gen_salt('bf'));
