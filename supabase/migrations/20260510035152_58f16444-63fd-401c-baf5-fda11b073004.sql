-- 1. New role values
ALTER TYPE public.admin_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.admin_role ADD VALUE IF NOT EXISTS 'atendente';

-- 2. Scheduled messages: status tracking
ALTER TABLE public.crm_scheduled_messages
  ADD COLUMN IF NOT EXISTS error_reason text,
  ADD COLUMN IF NOT EXISTS attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_change_by uuid;

-- 3. Assignment queue (winery-level config)
CREATE TABLE IF NOT EXISTS public.crm_assignment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'round_robin',
  last_assigned_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_assignment_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_assignment_queue FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_assignment_queue FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_assignment_queue FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_assignment_queue FOR DELETE USING (false);

-- 4. Queue members
CREATE TABLE IF NOT EXISTS public.crm_assignment_queue_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  position int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (winery_id, admin_id)
);
CREATE INDEX IF NOT EXISTS idx_caqm_winery ON public.crm_assignment_queue_members(winery_id, position);
ALTER TABLE public.crm_assignment_queue_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_assignment_queue_members FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_assignment_queue_members FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_assignment_queue_members FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_assignment_queue_members FOR DELETE USING (false);

-- 5. Notification preferences per admin
CREATE TABLE IF NOT EXISTS public.crm_notification_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL UNIQUE,
  winery_id uuid NOT NULL,
  digest_frequency text NOT NULL DEFAULT '15min',
  quiet_hours_start int,
  quiet_hours_end int,
  notify_overdue boolean NOT NULL DEFAULT true,
  notify_scheduled_ready boolean NOT NULL DEFAULT true,
  notify_new_lead boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_notification_prefs FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_notification_prefs FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_notification_prefs FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_notification_prefs FOR DELETE USING (false);

-- 6. Helpful index for lead-state ownership filter
CREATE INDEX IF NOT EXISTS idx_crm_lead_state_assigned ON public.crm_lead_state(winery_id, assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_admin_due ON public.crm_tasks(admin_id, due_at) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_crm_scheduled_status ON public.crm_scheduled_messages(winery_id, status, scheduled_for);