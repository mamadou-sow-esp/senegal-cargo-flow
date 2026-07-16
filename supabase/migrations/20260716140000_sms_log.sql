-- =====================================================================
--  Journal des SMS (notifications) — compteur & audit par cabinet
--  À exécuter dans : Supabase → SQL Editor → Run
-- =====================================================================

CREATE TABLE public.sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',   -- sent | failed
  error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sms_log TO authenticated;
GRANT ALL ON public.sms_log TO service_role;
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_log same company read" ON public.sms_log FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "sms_log same company insert" ON public.sms_log FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE INDEX idx_sms_log_company_created ON public.sms_log(company_id, created_at);
CREATE INDEX idx_sms_log_shipment ON public.sms_log(shipment_id);
