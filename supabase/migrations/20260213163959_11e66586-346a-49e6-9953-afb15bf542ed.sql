
-- Allow service role to insert, update and delete admin_users (edge function uses service role key)
-- Add INSERT policy
CREATE POLICY "Allow insert admin_users" ON public.admin_users FOR INSERT WITH CHECK (true);

-- Add UPDATE policy
CREATE POLICY "Allow update admin_users" ON public.admin_users FOR UPDATE USING (true);

-- Add DELETE policy  
CREATE POLICY "Allow delete admin_users" ON public.admin_users FOR DELETE USING (true);
