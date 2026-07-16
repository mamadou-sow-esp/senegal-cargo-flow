-- =====================================================================
--  Échéances conteneur : surestaries (compagnie) & magasinage (port)
--  À exécuter dans : Supabase → SQL Editor → Run
-- =====================================================================

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS free_time_end DATE,      -- fin de franchise conteneur
  ADD COLUMN IF NOT EXISTS storage_free_end DATE;   -- fin de franchise magasinage
