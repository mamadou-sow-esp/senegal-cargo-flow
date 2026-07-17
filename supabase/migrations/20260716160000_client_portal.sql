-- =====================================================================
--  Portail client : lien fiche client ↔ compte, et accès restreint
--  Un importateur invité ne voit QUE ses dossiers + docs/commentaires
--  marqués « visible client ». À exécuter dans Supabase → SQL Editor.
-- =====================================================================

-- 1) Lien entre la fiche client et le compte auth de l'importateur
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients(user_id);

-- 2) Renvoie l'id de la fiche client liée à l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.my_client_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.my_client_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_client_id() TO authenticated;

-- 3) Politiques d'accès en LECTURE pour l'importateur (additives)

-- Sa propre fiche
CREATE POLICY "client reads own record" ON public.clients FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Ses dossiers
CREATE POLICY "client reads own shipments" ON public.shipments FOR SELECT TO authenticated
  USING (client_id = public.my_client_id());

-- Les documents de ses dossiers marqués visibles
CREATE POLICY "client reads visible docs" ON public.documents FOR SELECT TO authenticated
  USING (
    is_client_visible
    AND EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.client_id = public.my_client_id()
    )
  );

-- Les commentaires publics de ses dossiers
CREATE POLICY "client reads public comments" ON public.comments FOR SELECT TO authenticated
  USING (
    is_public
    AND EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.client_id = public.my_client_id()
    )
  );

-- L'historique de statut de ses dossiers
CREATE POLICY "client reads own status history" ON public.shipment_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = shipment_id AND s.client_id = public.my_client_id()
    )
  );

-- 4) Storage : téléchargement des documents visibles de ses dossiers
CREATE POLICY "client reads own visible storage" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.shipments s ON s.id = d.shipment_id
      WHERE d.storage_path = storage.objects.name
        AND d.is_client_visible
        AND s.client_id = public.my_client_id()
    )
  );
