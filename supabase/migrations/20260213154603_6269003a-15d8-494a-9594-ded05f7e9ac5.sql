
-- Allow insert/update/delete on wines (admin operations - no auth required for MVP)
CREATE POLICY "Anyone can insert wines" ON public.wines FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update wines" ON public.wines FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete wines" ON public.wines FOR DELETE USING (true);

-- Allow insert/update/delete on tasting_packages
CREATE POLICY "Anyone can insert tasting_packages" ON public.tasting_packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tasting_packages" ON public.tasting_packages FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tasting_packages" ON public.tasting_packages FOR DELETE USING (true);

-- Allow insert on automations
CREATE POLICY "Anyone can insert automations" ON public.automations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update automations" ON public.automations FOR UPDATE USING (true);
