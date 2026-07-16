-- =====================================================================
--  Circuit compagnie / consignataire (parallèle au circuit douane)
--  Suivi des étapes d'obtention du Bon à Délivrer (BAD) et de la
--  restitution du conteneur. Stocké en JSONB sur le dossier.
--  À exécuter dans : Supabase → SQL Editor → Run
-- =====================================================================

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS carrier_steps JSONB NOT NULL DEFAULT '{}'::jsonb;
