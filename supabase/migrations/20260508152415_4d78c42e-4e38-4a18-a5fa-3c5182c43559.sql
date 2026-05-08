
-- crm_tasks: follow-ups e lembretes
CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  lead_id uuid,
  admin_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  type text NOT NULL DEFAULT 'followup',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_crm_tasks_admin_due ON public.crm_tasks(admin_id, due_at) WHERE status = 'pendente';
CREATE INDEX idx_crm_tasks_winery ON public.crm_tasks(winery_id, due_at);
CREATE INDEX idx_crm_tasks_lead ON public.crm_tasks(lead_id);
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_tasks FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_tasks FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_tasks FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_tasks FOR DELETE USING (false);

-- crm_scheduled_messages: fila de envios agendados
CREATE TABLE public.crm_scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  template_id uuid,
  body_resolved text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX idx_crm_sched_winery ON public.crm_scheduled_messages(winery_id, scheduled_for);
CREATE INDEX idx_crm_sched_status ON public.crm_scheduled_messages(status, scheduled_for);
ALTER TABLE public.crm_scheduled_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.crm_scheduled_messages FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.crm_scheduled_messages FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.crm_scheduled_messages FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.crm_scheduled_messages FOR DELETE USING (false);

-- motivo de perda no estado do lead
ALTER TABLE public.crm_lead_state ADD COLUMN IF NOT EXISTS lost_reason text;
ALTER TABLE public.crm_lead_state ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz NOT NULL DEFAULT now();
