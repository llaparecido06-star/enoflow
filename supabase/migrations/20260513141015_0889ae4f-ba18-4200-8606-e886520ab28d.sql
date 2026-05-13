ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS enabled_modules text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS capture_point_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'voucher_separation',
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  voucher_id uuid,
  capture_point_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  done_at timestamptz,
  done_by uuid
);

CREATE INDEX IF NOT EXISTS staff_notifications_admin_status_idx
  ON public.staff_notifications (admin_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS staff_notifications_winery_idx
  ON public.staff_notifications (winery_id, created_at DESC);

ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no direct select staff_notifications" ON public.staff_notifications
  FOR SELECT USING (false);
CREATE POLICY "no direct insert staff_notifications" ON public.staff_notifications
  FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update staff_notifications" ON public.staff_notifications
  FOR UPDATE USING (false);
CREATE POLICY "no direct delete staff_notifications" ON public.staff_notifications
  FOR DELETE USING (false);

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_notifications;
ALTER TABLE public.staff_notifications REPLICA IDENTITY FULL;