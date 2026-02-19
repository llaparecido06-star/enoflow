-- Revoke public execute on sensitive auth functions
-- Only service_role (used by edge functions) should call these
REVOKE EXECUTE ON FUNCTION public.admin_login(text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.master_login(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hash_password(text) FROM PUBLIC, anon, authenticated;