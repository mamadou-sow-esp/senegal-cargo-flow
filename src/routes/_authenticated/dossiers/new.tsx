import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

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
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

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
                className="w-full rounded border border-input bg-white px-3 py-2 text-sm"
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
                className="w-full rounded border border-input bg-white px-3 py-2 text-sm"
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
              className="w-full rounded border border-input bg-white px-3 py-2 text-sm"
            />
          </label>
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
        className="w-full rounded border border-input bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
