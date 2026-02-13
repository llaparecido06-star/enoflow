
-- Replace permissive policy with restrictive one
DROP POLICY IF EXISTS "Automations are readable" ON public.automations;
CREATE POLICY "No direct select on automations" ON public.automations FOR SELECT USING (false);
