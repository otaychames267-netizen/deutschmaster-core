REVOKE EXECUTE ON FUNCTION public.expire_overdue_subscriptions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO service_role;