ALTER TABLE public.wineries
  ADD COLUMN IF NOT EXISTS quiz_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiz_config JSONB NOT NULL DEFAULT '{"questions":[]}'::jsonb;