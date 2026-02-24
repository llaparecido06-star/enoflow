
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Wineries are publicly readable" ON public.wineries;
CREATE POLICY "Wineries are publicly readable"
  ON public.wineries FOR SELECT
  USING (true);

-- Same fix for wines
DROP POLICY IF EXISTS "Wines are publicly readable" ON public.wines;
CREATE POLICY "Wines are publicly readable"
  ON public.wines FOR SELECT
  USING (true);

-- Same fix for menu_items
DROP POLICY IF EXISTS "Menu items are publicly readable" ON public.menu_items;
CREATE POLICY "Menu items are publicly readable"
  ON public.menu_items FOR SELECT
  USING (true);

-- Same fix for tasting_packages
DROP POLICY IF EXISTS "Tasting packages are publicly readable" ON public.tasting_packages;
CREATE POLICY "Tasting packages are publicly readable"
  ON public.tasting_packages FOR SELECT
  USING (true);
