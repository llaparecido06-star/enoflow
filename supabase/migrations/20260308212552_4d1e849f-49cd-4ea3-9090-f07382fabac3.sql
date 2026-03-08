
CREATE TABLE public.staff_login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  winery_id uuid NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'login',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_login_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct select on staff_login_activity" ON public.staff_login_activity FOR SELECT USING (false);
CREATE POLICY "No direct insert on staff_login_activity" ON public.staff_login_activity FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on staff_login_activity" ON public.staff_login_activity FOR UPDATE USING (false);
CREATE POLICY "No direct delete on staff_login_activity" ON public.staff_login_activity FOR DELETE USING (false);

CREATE INDEX idx_staff_login_activity_winery ON public.staff_login_activity(winery_id, created_at DESC);
CREATE INDEX idx_staff_login_activity_admin ON public.staff_login_activity(admin_id, created_at DESC);
