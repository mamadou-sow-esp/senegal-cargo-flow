
ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.tg_shipment_status_history() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company(uuid) TO authenticated;

DROP POLICY IF EXISTS "insert company at signup" ON public.companies;
CREATE POLICY "insert company at signup" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.get_user_company(auth.uid()) IS NULL);
