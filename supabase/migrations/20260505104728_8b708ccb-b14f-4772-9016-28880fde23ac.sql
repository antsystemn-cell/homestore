REVOKE EXECUTE ON FUNCTION public.admin_list_orders_light() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_orders_light() TO authenticated;