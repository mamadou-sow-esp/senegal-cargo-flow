import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inviteClient } from "@/lib/employees.functions";
import { Plus, Search, Send, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    ninea: "",
    rccm: "",
    address: "",
  });

  const { data } = useQuery({
    queryKey: ["clients", q],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (q.trim()) query = query.ilike("name", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const resetForm = () =>
    setForm({
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      ninea: "",
      rccm: "",
      address: "",
    });

  const openNew = () => {
    resetForm();
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (c: {
    id: string;
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    ninea: string | null;
    rccm: string | null;
    address: string | null;
  }) => {
    setForm({
      name: c.name || "",
      contact_name: c.contact_name || "",
      email: c.email || "",
      phone: c.phone || "",
      ninea: c.ninea || "",
      rccm: c.rccm || "",
      address: c.address || "",
    });
    setEditId(c.id);
    setOpen(true);
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", u.user!.id)
        .single();
      if (!prof?.company_id) throw new Error("Aucune entreprise");
      if (editId) {
        const { error } = await supabase
          .from("clients")
          .update({ ...form })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clients")
          .insert({ ...form, company_id: prof.company_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Client mis à jour" : "Client créé");
      resetForm();
      setEditId(null);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const inviteFn = useServerFn(inviteClient);
  const [inviting, setInviting] = useState<string | null>(null);

  const handleInvite = async (c: {
    id: string;
    email: string | null;
    name: string;
    contact_name: string | null;
  }) => {
    if (!c.email) {
      toast.error("Ajoutez d'abord un email à ce client pour lui envoyer son suivi.");
      return;
    }
    setInviting(c.id);
    try {
      const res = await inviteFn({
        data: {
          clientId: c.id,
          email: c.email,
          fullName: c.contact_name || c.name,
          origin: window.location.origin,
        },
      });
      qc.invalidateQueries({ queryKey: ["clients"] });
      if (res?.sent) {
        toast.success(`Lien de suivi envoyé à ${c.email}.`);
      } else if (res?.reason === "no_key") {
        toast.error(
          "Clé Resend absente côté serveur. Ajoute RESEND_API_KEY dans Vercel (env Production) puis redéploie.",
        );
      } else if (res?.reason === "http") {
        toast.error(
          "Resend a refusé l'envoi. Vérifie que RESEND_FROM utilise ton domaine vérifié (ex. no-reply@orustransit.com).",
        );
      } else {
        toast.error("Email non envoyé. Vérifie la configuration Resend.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setInviting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
            Contacts
          </div>
          <h1
            className="mt-1 text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-label)" }}
          >
            Clients importateurs
          </h1>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-hero-blue px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm shadow-hero-blue/25 hover:opacity-90"
        >
          <Plus className="size-3.5" /> Nouveau client
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 shadow-sm">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un client…"
          className="w-full bg-transparent text-base outline-none sm:text-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <Th>Nom</Th>
              <Th>Contact</Th>
              <Th>Email</Th>
              <Th>Téléphone</Th>
              <Th>NINEA</Th>
              <Th>Portail</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {(data ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-primary/5">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.contact_name || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.email || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {c.phone || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {c.ninea || "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleInvite(c)}
                    disabled={inviting === c.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-hero-blue hover:text-hero-blue disabled:opacity-50"
                  >
                    <Send className="size-3" />
                    {inviting === c.id
                      ? "Envoi…"
                      : (c as { portal_invited_at?: string | null })
                            .portal_invited_at
                        ? "Renvoyer"
                        : "Envoyer le suivi"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-hero-blue hover:text-hero-blue"
                  >
                    <Pencil className="size-3" /> Modifier
                  </button>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-xs text-muted-foreground"
                >
                  Aucun client. Créez votre premier client importateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <h2
              className="text-lg font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-label)" }}
            >
              {editId ? "Modifier le client" : "Nouveau client"}
            </h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim()) return;
                create.mutate();
              }}
            >
              <F label="Raison sociale *" required value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              <F label="Contact" value={form.contact_name} onChange={(v) => setForm((f) => ({ ...f, contact_name: v }))} />
              <F label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
              <F label="Téléphone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
              <F label="NINEA" value={form.ninea} onChange={(v) => setForm((f) => ({ ...f, ninea: v }))} />
              <F label="RCCM" value={form.rccm} onChange={(v) => setForm((f) => ({ ...f, rccm: v }))} />
              <F label="Adresse" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setEditId(null);
                  }}
                  className="rounded border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  disabled={create.isPending}
                  className="rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
                >
                  {create.isPending ? "…" : editId ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </th>
  );
}
function F({
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
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-input bg-white px-3 py-1.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring sm:text-sm"
      />
    </label>
  );
}
