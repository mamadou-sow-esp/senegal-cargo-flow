import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  statusTone,
  type ShipmentStatus,
} from "@/lib/status";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  MessageSquare,
} from "lucide-react";

const sora = { fontFamily: "var(--font-label)" } as const;
const DOT: Record<ReturnType<typeof statusTone>, string> = {
  done: "bg-emerald-500",
  progress: "bg-blue-500",
  blocked: "bg-amber-500",
  neutral: "bg-slate-400",
};

export const Route = createFileRoute("/portail/dossier/$id")({
  component: PortailDetail,
});

function PortailDetail() {
  const { id } = Route.useParams();

  const { data: shipment } = useQuery({
    queryKey: ["portail-shipment", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select(
          "id, reference, status, vessel_name, shipping_company, bl_number, container_number, origin_country, origin_port, arrival_date, goods_description",
        )
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["portail-docs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, name, category, storage_path, created_at")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["portail-comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, body, created_at")
        .eq("shipment_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const download = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 120);
    if (error) {
      toast.error(error.message);
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  if (!shipment) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Chargement…
      </div>
    );
  }

  const status = shipment.status as ShipmentStatus;
  const currIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="space-y-5">
      <Link
        to="/portail"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Retour à mes dossiers
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-lg font-extrabold" style={sora}>
            {shipment.reference}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {shipment.vessel_name || "Navire ?"} ·{" "}
            {shipment.shipping_company || "Compagnie ?"}
          </p>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-white px-4 py-2.5 shadow-sm">
          <span className={`size-2.5 rounded-full ${DOT[statusTone(status)]}`} />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Étape actuelle
            </div>
            <div className="text-sm font-semibold">{STATUS_LABEL[status]}</div>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Avancement du dédouanement
        </h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {STATUS_ORDER.map((s, i) => {
            const state = i < currIdx ? "done" : i === currIdx ? "current" : "todo";
            return (
              <li key={s} className="flex items-center gap-2.5 text-sm">
                {state === "done" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : state === "current" ? (
                  <span className="grid size-4 shrink-0 place-items-center">
                    <span className="size-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_1px_rgba(59,130,246,0.6)]" />
                  </span>
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                )}
                <span
                  className={
                    state === "todo"
                      ? "text-muted-foreground"
                      : state === "current"
                        ? "font-semibold"
                        : ""
                  }
                >
                  {STATUS_LABEL[s]}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Documents */}
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <FileText className="size-3.5" /> Documents ({(docs ?? []).length})
        </h2>
        {(docs ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucun document partagé pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {(docs ?? []).map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5 text-sm">
                <FileText className="size-4 shrink-0 text-foreground/40" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {d.name}
                </span>
                <span className="hidden text-[10px] text-muted-foreground sm:inline">
                  {d.category || ""}
                </span>
                <button
                  onClick={() => download(d.storage_path, d.name)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 hover:text-hero-blue"
                  title="Télécharger"
                >
                  <Download className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Commentaires */}
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <MessageSquare className="size-3.5" /> Messages
        </h2>
        {(comments ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun message.</p>
        ) : (
          <ul className="space-y-3">
            {(comments ?? []).map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-muted/30 px-4 py-3"
              >
                <div className="text-sm">{c.body}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleString("fr-FR")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
