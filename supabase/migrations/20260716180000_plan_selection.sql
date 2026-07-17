-- ============================================================
-- ORUS TRANSIT — Choix de formule & encaissement manuel
-- À exécuter dans : Supabase → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE public.companies
  -- Le cabinet a-t-il passé l'écran de choix de formule ?
  ADD COLUMN IF NOT EXISTS plan_selected BOOLEAN NOT NULL DEFAULT false,
  -- Formule demandée (payante) en attente de validation du paiement.
  ADD COLUMN IF NOT EXISTS pending_plan TEXT,
  ADD COLUMN IF NOT EXISTS pending_since TIMESTAMPTZ;

-- Rappel des statuts d'abonnement (subscription_status) :
--   'trialing' → essai en cours
--   'pending'  → formule payante choisie, en attente de validation du paiement
--   'active'   → formule payante validée
--   'past_due' → échéance dépassée
--   'canceled' → résilié
