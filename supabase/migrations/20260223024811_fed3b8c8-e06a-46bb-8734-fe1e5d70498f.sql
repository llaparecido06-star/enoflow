-- Add enabled_modules column to wineries
ALTER TABLE public.wineries
ADD COLUMN enabled_modules text[] NOT NULL DEFAULT ARRAY['tasting', 'restaurant', 'shop'];