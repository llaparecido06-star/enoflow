CREATE TABLE public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  winery_id uuid NOT NULL,
  lead_id uuid,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct select" ON public.quiz_responses FOR SELECT USING (false);
CREATE POLICY "no direct insert" ON public.quiz_responses FOR INSERT WITH CHECK (false);
CREATE POLICY "no direct update" ON public.quiz_responses FOR UPDATE USING (false);
CREATE POLICY "no direct delete" ON public.quiz_responses FOR DELETE USING (false);
CREATE INDEX idx_quiz_responses_winery_created ON public.quiz_responses (winery_id, created_at DESC);
CREATE INDEX idx_quiz_responses_lead ON public.quiz_responses (lead_id);