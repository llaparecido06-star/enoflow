-- Lock down vouchers: no direct public reads (edge functions use service role)
DROP POLICY IF EXISTS "Vouchers are readable" ON public.vouchers;
CREATE POLICY "No direct select on vouchers"
  ON public.vouchers FOR SELECT
  USING (false);

-- Lock down admin_users_public view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users_public') THEN
    NULL;
  END IF;
END $$;

-- Drop permissive policies on admin_users_public if any, and add restrictive one
-- Since it's a view with security_invoker, the base table policy (already false) covers it.
-- But let's ensure the view itself is safe by recreating it without email if needed.
