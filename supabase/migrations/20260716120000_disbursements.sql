-- =====================================================================
--  Module Débours / Facturation client
--  Table des frais avancés par le transitaire pour un dossier.
--  À exécuter dans : Supabase → SQL Editor → Run
-- =====================================================================

CREATE TABLE public.disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  billable BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.disbursements TO authenticated;
GRANT ALL ON public.disbursements TO service_role;
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;

-- Accès limité au cabinet de l'utilisateur (même logique que les autres tables).
CREATE POLICY "disbursements same company" ON public.disbursements FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE INDEX idx_disbursements_shipment ON public.disbursements(shipment_id);
