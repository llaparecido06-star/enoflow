INSERT INTO public.admin_users (name, email, password_hash, role, winery_id, is_active)
VALUES (
  'Lucas',
  'lucasla925@gmail.com',
  public.hash_password('master123'),
  'master',
  '680d2017-661f-4fcf-87ad-2b79dab7c0d5',
  true
)
ON CONFLICT DO NOTHING;