-- ============================================================
-- ORUS TRANSIT — Rétrogradation automatique des abonnements expirés
-- Marque quotidiennement en "past_due" les Pro dont la période est dépassée.
-- ⚠️  Nécessite l'extension pg_cron :
--     Supabase → Database → Extensions → activer "pg_cron".
-- À exécuter ensuite dans : Supabase → SQL Editor → New query → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Fonction de rétrogradation.
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.companies
     SET subscription_status = 'past_due'
   WHERE subscription_status = 'active'
     AND current_period_end IS NOT NULL
     AND current_period_end < now();
$$;

-- Planification quotidienne (03:00 UTC). cron.schedule remplace si le job existe.
SELECT cron.schedule(
  'expire-subscriptions-daily',
  '0 3 * * *',
  $$ SELECT public.expire_subscriptions(); $$
);
