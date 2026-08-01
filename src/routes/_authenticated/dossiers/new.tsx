import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractDossier } from "@/lib/ai.functions";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dossiers/new")({
  component: NewDossier,
});

function NewDossier() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    reference: "",
    client_id: "",
    vessel_name: "",
    shipping_company: "",
    bl_number: "",
    container_number: "",
    origin_country: "",
    origin_port: "",
    arrival_date: "",
    goods_description: "",
    goods_value: "",
    customs_regime: "",
    priority: "standard",
    free_time_end: "",
    storage_free_end: "",
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── Pré-remplissage IA depuis un bloc de texte ──
  const extract = useServerFn(extractDossier);
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);

  const handleExtract = async () => {
    const text = rawText.trim();
    if (!text || extracting) return;
    setExtracting(true);
    try {
      const { fields } = await extract({ data: { text } });

      // Tente d'associer le client par son nom.
      let matchedId = "";
      if (fields.client_name && clients?.length) {
        const target = fields.client_name.toLowerCase();
        const found = clients.find(
          (c) =>
            c.name.toLowerCase().includes(target) ||
            target.includes(c.name.toLowerCase()),
        );
        if (found) matchedId = found.id;
      }

      setForm((f) => ({
        ...f,
        reference: fields.reference || f.reference,
        vessel_name: fields.vessel_name || f.vessel_name,
        shipping_company: fields.shipping_company || f.shipping_company,
        bl_number: fields.bl_number || f.bl_number,
        container_number: fields.container_number || f.container_number,
        origin_country: fields.origin_country || f.origin_country,
        origin_port: fields.origin_port || f.origin_port,
        arrival_date: fields.arrival_date || f.arrival_date,
        goods_description: fields.goods_description || f.goods_description,
        goods_value:
          fields.goods_value != null
            ? String(fields.goods_value)
            : f.goods_value,
        customs_regime: fields.customs_regime || f.customs_regime,
        priority: fields.priority || f.priority,
        notes: fields.notes || f.notes,
        client_id: matchedId || f.client_id,
      }));

      if (fields.client_name && !matchedId) {
        toast.success(
          `Champs pré-remplis. Client « ${fields.client_name} » introuvable, sélectionne-le manuellement.`,
        );
      } else {
        toast.success("Champs pré-remplis. Vérifie puis crée le dossier.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'extraction");
    } finally {
      setExtracting(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", u.user!.id)
        .single();
      if (!prof?.company_id) throw new Error("Aucune entreprise");
      const payload = {
        company_id: prof.company_id,
        created_by: u.user!.id,
        reference: form.reference.trim(),
        client_id: form.client_id || null,
        vessel_name: form.vessel_name || null,
        shipping_company: form.shipping_company || null,
        bl_number: form.bl_number || null,
        container_number: form.container_number || null,
        origin_country: form.origin_country || null,
        origin_port: form.origin_port || null,
        arrival_date: form.arrival_date || null,
        goods_description: form.goods_description || null,
        goods_value: form.goods_value ? Number(form.goods_value) : null,
        customs_regime: form.customs_regime || null,
        priority: form.priority as never,
        free_time_end: form.free_time_end || null,
        storage_free_end: form.storage_free_end || null,
        notes: form.notes || null,
      };
      const { data, error } = await supabase
        .from("shipments")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (id) => {
      await qc.invalidateQueries();
      toast.success("Dossier créé");
      navigate({ to: "/dossiers/$id", params: { id } });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6 md:p-8">
      <Link
        to="/dossiers"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour aux dossiers
      </Link>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Opérations
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Nouveau dossier
        </h1>
      </div>

      {/* Pré-remplissage IA */}
      <div className="rounded border border-hero-blue/30 bg-hero-blue/5 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-hero-blue" />
          <h2 className="text-sm font-bold">Pré-remplir avec l'IA</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Colle un email, un connaissement (BL) ou un message contenant les infos
          du dossier. L'IA extrait les champs, tu vérifies avant d'enregistrer.
        </p>
        <textarea
          rows={5}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Ex : Bonjour, merci d'ouvrir un dossier pour le client Teranga Électro. Navire CMA CGM Dakar, BL CMDUSH8812340, conteneur CMAU5567012, 600 climatiseurs split en provenance de Ningbo (Chine), arrivée le 28/07/2026, valeur 27 300 000 FCFA."
          className="mt-3 w-full rounded border border-input bg-white px-3 py-2 text-base outline-none focus:border-hero-blue focus:ring-2 focus:ring-hero-blue/25 sm:text-sm"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || !rawText.trim()}
            className="inline-flex items-center gap-2 rounded bg-hero-blue px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
          >
            {extracting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {extracting ? "Analyse…" : "Analyser et pré-remplir"}
          </button>
        </div>
      </div>

      <form
        className="space-y-6 rounded border border-border bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.reference.trim()) {
            toast.error("Référence requise");
            return;
          }
          mutation.mutate();
        }}
      >
        <Section title="Identification">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Référence interne *" required
              value={form.reference} onChange={(v) => set("reference", v)} />
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Client
              </span>
              <select
                value={form.client_id}
                onChange={(e) => set("client_id", e.target.value)}
                className="w-full rounded border border-input bg-white px-3 py-2 text-base sm:text-sm"
              >
                <option value="">—</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Priorité
              </span>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="w-full rounded border border-input bg-white px-3 py-2 text-base sm:text-sm"
              >
                <option value="basse">Basse</option>
                <option value="standard">Standard</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </label>
          </div>
        </Section>

        <Section title="Maritime">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Navire" value={form.vessel_name} onChange={(v) => set("vessel_name", v)} />
            <Field label="Compagnie maritime" value={form.shipping_company} onChange={(v) => set("shipping_company", v)} />
            <Field label="Numéro BL" value={form.bl_number} onChange={(v) => set("bl_number", v)} />
            <Field label="Numéro conteneur" value={form.container_number} onChange={(v) => set("container_number", v)} />
            <Field label="Pays d'origine" value={form.origin_country} onChange={(v) => set("origin_country", v)} />
            <Field label="Port d'origine" value={form.origin_port} onChange={(v) => set("origin_port", v)} />
            <Field label="Date d'arrivée" type="date" value={form.arrival_date} onChange={(v) => set("arrival_date", v)} />
          </div>
        </Section>

        <Section title="Marchandises">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nature des marchandises" value={form.goods_description} onChange={(v) => set("goods_description", v)} />
            <Field label="Valeur (FCFA)" type="number" value={form.goods_value} onChange={(v) => set("goods_value", v)} />
            <Field label="Régime douanier" value={form.customs_regime} onChange={(v) => set("customs_regime", v)} />
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Notes internes
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="w-full rounded border border-input bg-white px-3 py-2 text-base sm:text-sm"
            />
          </label>
        </Section>

        <Section title="Surestaries & échéances">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Fin de franchise conteneur"
              type="date"
              value={form.free_time_end}
              onChange={(v) => set("free_time_end", v)}
            />
            <Field
              label="Fin de franchise magasinage"
              type="date"
              value={form.storage_free_end}
              onChange={(v) => set("storage_free_end", v)}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Au-delà de ces dates, les surestaries (conteneur) et le magasinage
            commencent à courir. Un compte à rebours s'affiche alors sur le
            dossier et sur le portail client.
          </p>
        </Section>

        <div className="flex justify-end gap-2">
          <Link
            to="/dossiers"
            className="rounded border border-border bg-white px-4 py-2 text-xs font-semibold hover:bg-muted"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded bg-primary px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? "…" : "Créer le dossier"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-input bg-white px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring sm:text-sm"
      />
    </label>
  );
}
