import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  priorityTone,
  type ShipmentStatus,
} from "@/lib/status";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  MessageSquare,
  Trash2,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dossiers/$id")({
  component: DossierDetail,
});

type Shipment = {
  id: string;
  company_id: string;
  reference: string;
  vessel_name: string | null;
  shipping_company: string | null;
  bl_number: string | null;
  container_number: string | null;
  origin_country: string | null;
  origin_port: string | null;
  arrival_date: string | null;
  goods_description: string | null;
  goods_value: number | null;
  customs_regime: string | null;
  status: ShipmentStatus;
  priority: "basse" | "standard" | "haute" | "critique";
  notes: string | null;
  created_at: string;
  clients: { name: string } | null;
};

function DossierDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: shipment } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async (): Promise<Shipment> => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, clients(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Shipment;
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["docs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (s: ShipmentStatus) => {
      const { error } = await supabase
        .from("shipments")
        .update({ status: s })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipment", id] });
      toast.success("Étape mise à jour");
    },
  });

  if (!shipment) {
    return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
      <Link
        to="/dossiers"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour aux dossiers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-extrabold text-primary">
              {shipment.reference}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${priorityTone(shipment.priority)}`}
            >
              {shipment.priority}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {shipment.clients?.name || "Client non renseigné"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {shipment.vessel_name || "Navire ?"} ·{" "}
            {shipment.shipping_company || "Compagnie ?"} · BL{" "}
            <span className="font-mono">{shipment.bl_number || "—"}</span>
          </p>
        </div>
        <div className="rounded border border-border bg-white px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Statut actuel
          </div>
          <div className="mt-1 text-sm font-semibold">
            {STATUS_LABEL[shipment.status]}
          </div>
        </div>
      </div>

      <section className="rounded border border-border bg-white p-6">
        <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Pipeline de dédouanement
        </h2>
        <ol className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {STATUS_ORDER.map((s, i) => {
            const currIdx = STATUS_ORDER.indexOf(shipment.status);
            const state =
              i < currIdx ? "done" : i === currIdx ? "current" : "todo";
            return (
              <li key={s}>
                <button
                  onClick={() => setStatus.mutate(s)}
                  className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left text-xs transition-colors ${
                    state === "current"
                      ? "border-accent bg-accent/5 font-semibold text-accent"
                      : state === "done"
                        ? "border-border bg-muted/50 text-muted-foreground line-through"
                        : "border-border bg-white text-foreground hover:bg-muted"
                  }`}
                >
                  {state === "done" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle
                      className={`size-4 shrink-0 ${state === "current" ? "text-accent" : "text-muted-foreground"}`}
                    />
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{STATUS_LABEL[s]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded border border-border bg-white p-6 lg:col-span-2">
          <DocumentsPanel
            shipmentId={id}
            companyId={shipment.company_id}
            docs={docs ?? []}
            onChange={() => qc.invalidateQueries({ queryKey: ["docs", id] })}
          />
        </section>

        <section className="rounded border border-border bg-white p-6">
          <CommentsPanel
            shipmentId={id}
            comments={comments ?? []}
            onChange={() =>
              qc.invalidateQueries({ queryKey: ["comments", id] })
            }
          />
        </section>
      </div>

      <section className="rounded border border-border bg-white p-6">
        <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Informations générales
        </h2>
        <dl className="grid gap-4 text-sm md:grid-cols-3">
          <Info label="Conteneur" value={shipment.container_number} mono />
          <Info label="Pays d'origine" value={shipment.origin_country} />
          <Info label="Port d'origine" value={shipment.origin_port} />
          <Info
            label="Date d'arrivée"
            value={
              shipment.arrival_date
                ? new Date(shipment.arrival_date).toLocaleDateString("fr-FR")
                : null
            }
          />
          <Info label="Régime douanier" value={shipment.customs_regime} />
          <Info
            label="Valeur"
            value={
              shipment.goods_value
                ? `${shipment.goods_value.toLocaleString("fr-FR")} FCFA`
                : null
            }
          />
          <Info
            label="Marchandises"
            value={shipment.goods_description}
            wide
          />
          <Info label="Notes" value={shipment.notes} wide />
        </dl>
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
  wide,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-3" : ""}>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function DocumentsPanel({
  shipmentId,
  companyId,
  docs,
  onChange,
}: {
  shipmentId: string;
  companyId: string;
  docs: Array<{
    id: string;
    name: string;
    category: string | null;
    storage_path: string;
    is_client_visible: boolean;
    created_at: string;
  }>;
  onChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Facture commerciale");

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = `${companyId}/${shipmentId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("documents").insert({
        shipment_id: shipmentId,
        company_id: companyId,
        name: file.name,
        category,
        storage_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: u.user?.id,
      });
      if (error) throw error;
      toast.success("Document ajouté");
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60);
    if (error) {
      toast.error(error.message);
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.click();
  };

  const handleDelete = async (id: string, path: string) => {
    await supabase.storage.from("documents").remove([path]);
    await supabase.from("documents").delete().eq("id", id);
    toast.success("Document supprimé");
    onChange();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Documents ({docs.length})
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-border bg-white px-2 py-1 text-xs"
          >
            {[
              "Facture commerciale",
              "Packing List",
              "Connaissement",
              "Certificat d'origine",
              "Certificat sanitaire",
              "Quitus",
              "Autres",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90">
            <Upload className="size-3.5" />
            {uploading ? "…" : "Téléverser"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
          Aucun document. Téléversez PDF, image, Excel, Word.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <div className="grid size-8 place-items-center rounded bg-muted text-[10px] font-mono font-bold">
                DOC
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {d.category || "Non catégorisé"} ·{" "}
                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <button
                onClick={() => handleDownload(d.storage_path, d.name)}
                className="rounded p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
                title="Télécharger"
              >
                <Download className="size-4" />
              </button>
              <button
                onClick={() => handleDelete(d.id, d.storage_path)}
                className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                title="Supprimer"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentsPanel({
  shipmentId,
  comments,
  onChange,
}: {
  shipmentId: string;
  comments: Array<{
    id: string;
    body: string;
    is_public: boolean;
    author_id: string;
    created_at: string;
  }>;
  onChange: () => void;
}) {
  const [body, setBody] = useState("");
  const [isPublic, setPublic] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("comments").insert({
      shipment_id: shipmentId,
      body: body.trim(),
      is_public: isPublic,
      author_id: u.user!.id,
    });
    if (error) toast.error(error.message);
    else {
      setBody("");
      onChange();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <MessageSquare className="size-3.5" /> Fil de discussion
      </h2>
      <div className="flex-1 space-y-3 overflow-auto">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucun commentaire pour l'instant.
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded bg-muted/50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {new Date(c.created_at).toLocaleString("fr-FR")}
              </span>
              {c.is_public && (
                <span className="rounded bg-emerald-100 px-1.5 text-[9px] font-bold uppercase text-emerald-700">
                  Public
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-xs">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ajouter un commentaire…"
          className="w-full rounded border border-input bg-white px-3 py-2 text-xs"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setPublic(e.target.checked)}
            />
            Visible client
          </label>
          <button
            onClick={send}
            className="rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
