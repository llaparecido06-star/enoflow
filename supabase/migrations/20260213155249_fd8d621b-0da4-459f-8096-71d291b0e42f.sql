
-- Create admin role enum
CREATE TYPE public.admin_role AS ENUM ('funcionario', 'gerente', 'dono');

-- Create admin_users table for email/password admin auth
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  winery_id UUID NOT NULL REFERENCES public.wineries(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role admin_role NOT NULL DEFAULT 'funcionario',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_admin_users_email_winery ON public.admin_users(email, winery_id);

CREATE POLICY "Admin users are readable" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admin_users" ON public.admin_users FOR UPDATE USING (true);

-- Seed a default admin for Vinícola Góes
INSERT INTO public.admin_users (winery_id, email, password_hash, name, role)
SELECT id, 'admin@goes.com', 'admin123', 'Admin Góes', 'dono'
FROM public.wineries WHERE slug = 'vinicola-goes';
