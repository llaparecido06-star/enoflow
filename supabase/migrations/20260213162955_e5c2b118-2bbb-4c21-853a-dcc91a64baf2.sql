
-- Add new role values to the enum (must be committed first)
ALTER TYPE public.admin_role ADD VALUE IF NOT EXISTS 'master';
ALTER TYPE public.admin_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.admin_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.admin_role ADD VALUE IF NOT EXISTS 'staff';
