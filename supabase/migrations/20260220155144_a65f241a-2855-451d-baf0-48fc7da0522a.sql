-- Grant EXECUTE on login RPCs back to service_role so edge functions can call them
GRANT EXECUTE ON FUNCTION public.admin_login(text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.master_login(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.hash_password(text) TO service_role;