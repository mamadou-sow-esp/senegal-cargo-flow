-- ==============================================================
-- Clear Flower — Schéma complet à exécuter sur un projet vierge
-- À coller dans : Supabase Dashboard → SQL Editor → New query → Run
-- ==============================================================

-- ##############################################################
-- # PARTIE 1 : tables, enums, RLS, triggers
-- ##############################################################

-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'company_admin', 'employee', 'client');

CREATE TYPE public.shipment_status AS ENUM (
  'cree',
  'documents_attente',
  'documents_complets',
  'declaration_preparee',
  'declaration_deposee',
  'attente_validation',
  'controle_documentaire',
  'controle_physique',
  'paiement_droits',
  'bon_a_enlever',
  'marchandise_sortie',
  'cloture'
);

CREATE TYPE public.shipment_priority AS ENUM ('basse', 'standard', 'haute', 'critique');

-- =========================
-- COMPANIES (transitaires)
-- =========================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  subscription_plan TEXT DEFAULT 'trial',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =========================
-- PROFILES (extends auth.users)
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  job_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, company_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security-definer role checker
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- =========================
-- CLIENTS (importateurs)
-- =========================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  ninea TEXT,
  rccm TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- =========================
-- SHIPMENTS (dossiers)
-- =========================
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reference TEXT NOT NULL,
  vessel_name TEXT,
  shipping_company TEXT,
  bl_number TEXT,
  container_number TEXT,
  origin_country TEXT,
  origin_port TEXT,
  arrival_date DATE,
  goods_description TEXT,
  goods_value NUMERIC(14,2),
  customs_regime TEXT,
  priority public.shipment_priority NOT NULL DEFAULT 'standard',
  status public.shipment_status NOT NULL DEFAULT 'cree',
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, reference)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- =========================
-- STATUS HISTORY
-- =========================
CREATE TABLE public.shipment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  from_status public.shipment_status,
  to_status public.shipment_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.shipment_status_history TO authenticated;
GRANT ALL ON public.shipment_status_history TO service_role;
ALTER TABLE public.shipment_status_history ENABLE ROW LEVEL SECURITY;

-- =========================
-- DOCUMENTS
-- =========================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_client_visible BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- =========================
-- COMMENTS
-- =========================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =========================
-- ACTIVITY LOG
-- =========================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- =========================
-- POLICIES
-- =========================

-- profiles
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = public.get_user_company(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- user_roles (read-only from client; managed via server)
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- companies
CREATE POLICY "read own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "insert company at signup" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "update own company" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'))
  WITH CHECK (id = public.get_user_company(auth.uid()));

-- clients
CREATE POLICY "clients same company" ON public.clients FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- shipments
CREATE POLICY "shipments same company" ON public.shipments FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- shipment_status_history
CREATE POLICY "status hist same company" ON public.shipment_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.company_id = public.get_user_company(auth.uid())));
CREATE POLICY "status hist insert" ON public.shipment_status_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.company_id = public.get_user_company(auth.uid())));

-- documents
CREATE POLICY "docs same company" ON public.documents FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- comments
CREATE POLICY "comments read" ON public.comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.company_id = public.get_user_company(auth.uid())));
CREATE POLICY "comments write" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.company_id = public.get_user_company(auth.uid())));
CREATE POLICY "comments update own" ON public.comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments delete own" ON public.comments FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- notifications
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- activity logs
CREATE POLICY "logs read same company" ON public.activity_logs FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE POLICY "logs insert" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()) AND user_id = auth.uid());

-- =========================
-- TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER trg_shipments_updated BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-record status changes
CREATE OR REPLACE FUNCTION public.tg_shipment_status_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.shipment_status_history (shipment_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.shipment_status_history (shipment_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_shipment_status AFTER INSERT OR UPDATE OF status ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.tg_shipment_status_history();

-- Storage policies for documents bucket (same-company access)
CREATE POLICY "docs storage read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
  );
CREATE POLICY "docs storage insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
  );
CREATE POLICY "docs storage delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
  );

-- ##############################################################
-- # PARTIE 2 : durcissement des fonctions + policy signup
-- ##############################################################

ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;
ALTER FUNCTION public.tg_shipment_status_history() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_company(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company(uuid) TO authenticated;

DROP POLICY IF EXISTS "insert company at signup" ON public.companies;
CREATE POLICY "insert company at signup" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.get_user_company(auth.uid()) IS NULL);

-- ##############################################################
-- # PARTIE 3 : bucket de stockage 'documents' (privé)
-- ##############################################################
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
