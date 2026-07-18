-- ============================================================
-- ORUS TRANSIT — Fermeture réelle de l'essai
-- Le trigger de création de dossier refuse aussi si l'essai est expiré.
-- À exécuter dans : Supabase → SQL Editor → New query → Run
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_trial_dossier_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan TEXT;
  t_end TIMESTAMPTZ;
  actifs INTEGER;
BEGIN
  SELECT subscription_plan, trial_ends_at
    INTO plan, t_end
    FROM public.companies WHERE id = NEW.company_id;

  IF plan = 'trial' THEN
    -- Essai expiré → aucune création possible.
    IF t_end IS NOT NULL AND t_end < now() THEN
      RAISE EXCEPTION 'Votre essai gratuit est termine. Activez le mode Pro pour creer de nouveaux dossiers.';
    END IF;
    -- Sinon, plafond de 2 dossiers actifs.
    SELECT count(*) INTO actifs
      FROM public.shipments
      WHERE company_id = NEW.company_id
        AND is_deleted = false
        AND status <> 'cloture';
    IF actifs >= 2 THEN
      RAISE EXCEPTION 'Limite de l''essai atteinte : 2 dossiers maximum. Activez le mode Pro pour creer plus de dossiers.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
