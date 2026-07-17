-- ============================================================
-- ORUS TRANSIT — Abonnements
-- État de l'abonnement d'un cabinet + journal des paiements.
-- À exécuter dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Colonnes d'état sur companies -----------------------------
-- subscription_plan existe déjà (TEXT DEFAULT 'trial').
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Valeurs possibles pour subscription_status :
--   'trialing'  → période d'essai en cours
--   'active'    → abonnement payant en cours
--   'past_due'  → paiement échu / à renouveler
--   'canceled'  → résilié

-- 2) Journal des paiements ------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,                 -- FCFA
  currency TEXT NOT NULL DEFAULT 'XOF',
  provider TEXT,                           -- 'paydunya', 'manuel', ...
  provider_ref TEXT,                       -- token / invoice de l'agrégateur
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | completed | failed
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_company_idx ON public.payments (company_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Un membre du cabinet peut lire l'historique de paiement de SON cabinet.
DROP POLICY IF EXISTS "payments_select_own_company" ON public.payments;
CREATE POLICY "payments_select_own_company"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Les écritures se font côté serveur (service_role) uniquement :
-- pas de policy INSERT/UPDATE pour les utilisateurs finaux.
