-- ============================================================
-- ORUS TRANSIT — Modèle à formule unique (Essai 7 j → Pro)
-- À exécuter dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Essai ramené à 7 jours pour les nouveaux comptes -----------
ALTER TABLE public.companies
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');

-- Tous les cabinets existants sont considérés comme ayant leur formule
-- (plus d'écran de choix forcé).
UPDATE public.companies SET plan_selected = true WHERE plan_selected = false;

-- 2) Journal des requêtes IA (pour le quota journalier en essai) --
CREATE TABLE IF NOT EXISTS public.ai_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_log_company_day_idx
  ON public.ai_log (company_id, created_at);

GRANT SELECT, INSERT ON public.ai_log TO authenticated;
GRANT ALL ON public.ai_log TO service_role;
ALTER TABLE public.ai_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_log_select_own_company" ON public.ai_log;
CREATE POLICY "ai_log_select_own_company"
  ON public.ai_log FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- 3) Limite de 2 dossiers « traitables » pendant l'essai ----------
CREATE OR REPLACE FUNCTION public.enforce_trial_dossier_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan TEXT;
  actifs INTEGER;
BEGIN
  SELECT subscription_plan INTO plan FROM public.companies WHERE id = NEW.company_id;
  IF plan = 'trial' THEN
    SELECT count(*) INTO actifs
      FROM public.shipments
      WHERE company_id = NEW.company_id
        AND is_deleted = false
        AND status <> 'cloture';
    IF actifs >= 2 THEN
      RAISE EXCEPTION 'Limite de l''essai atteinte : 2 dossiers maximum. Activez le mode Pro pour créer plus de dossiers.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trial_dossier_limit ON public.shipments;
CREATE TRIGGER trg_trial_dossier_limit
  BEFORE INSERT ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trial_dossier_limit();
