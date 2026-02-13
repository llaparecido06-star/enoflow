
-- Lock down wines write operations - only service_role (edge functions) can write
DROP POLICY IF EXISTS "Insert wines" ON public.wines;
DROP POLICY IF EXISTS "Update wines" ON public.wines;
DROP POLICY IF EXISTS "Delete wines" ON public.wines;

-- No public write access - writes go through admin-wines edge function
-- SELECT remains public for tourists to browse wines
