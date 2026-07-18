-- ============================================================
-- ORUS TRANSIT — Portail client sans connexion (lien de suivi)
-- Chaque client a un jeton unique et non devinable qui lui donne
-- accès en lecture seule au suivi de SES dossiers, via un lien
-- envoyé par email. Aucun compte, aucun mot de passe.
-- À exécuter dans : Supabase → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS clients_portal_token_idx
  ON public.clients (portal_token);

-- (Optionnel) date d'envoi du dernier lien de suivi, pour l'affichage.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS portal_invited_at TIMESTAMPTZ;
