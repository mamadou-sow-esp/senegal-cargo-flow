import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  priorityTone,
  statusProgress,
  statusTone,
  type ShipmentStatus,
} from "@/lib/status";
import {
  Plus,
  Search,
  Ship,
  Package,
  FileText,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dossiers/")({
  component: DossiersList,
});

// Palette par état d'avancement du dossier.
const TONE: Record<
  ReturnType<typeof statusTone>,
  { bar: string; track: string; pill: string; grad: string; glow: string }
> = {
  done: {
    bar: "bg-emerald-500",
    track: "bg-emerald-100",
    pill: "bg-emerald-100 text-emerald-700",
    grad: "from-emerald-300 to-emerald-600",
    glow: "shadow-[0_0_16px_1px_rgba(16,185,129,0.55)]",
  },
  progress: {
    bar: "bg-blue-500",
    track: "bg-blue-100",
    pill: "bg-blue-100 text-blue-700",
    grad: "from-sky-300 to-blue-600",
    glow: "shadow-[0_0_16px_1px_rgba(59,130,246,0.55)]",
  },
  blocked: {
    bar: "bg-amber-500",
    track: "bg-amber-100",
    pill: "bg-amber-100 text-amber-700",
    grad: "from-amber-300 to-amber-600",
    glow: "shadow-[0_0_16px_1px_rgba(245,158,11,0.6)]",
  },
  neutral: {
    bar: "bg-slate-400",
    track: "bg-slate-100",
    pill: "bg-slate-100 text-slate-600",
    grad: "from-slate-300 to-slate-500",
    glow: "shadow-[0_0_14px_1px_rgba(148,163,184,0.5)]",
  },
};

function DossiersList() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">(
    "all",
  );

  const { data } = useQuery({
    queryKey: ["shipments", q, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("shipments")
        .select(
          "id, reference, vessel_name, bl_number, container_number, status, priority, arrival_date, created_at, clients(name)",
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (q.trim()) {
        query = query.or(
          `reference.ilike.%${q}%,bl_number.ilike.%${q}%,container_number.ilike.%${q}%,vessel_name.ilike.%${q}%`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-label text-[10px] font-bold uppercase tracking-widest text-hero-blue">
            Opérations
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tighter">
            Dossiers d'importation
          </h1>
        </div>
        <Link
          to="/dossiers/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-hero-blue px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm shadow-hero-blue/25 transition hover:opacity-90"
        >
          <Plus className="size-3.5" /> Nouveau dossier
        </Link>
      </div>

      {/* Recherche + filtre */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 shadow-sm">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher BL, conteneur, navire, référence…"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/60 sm:text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ShipmentStatus | "all")
          }
          className="rounded-lg border border-border bg-white px-3 py-2.5 text-base shadow-sm sm:text-sm"
        >
          <option value="all">Toutes les étapes</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Grille de cartes */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
          Aucun dossier trouvé.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((s) => {
            const status = s.status as ShipmentStatus;
            const tone = TONE[statusTone(status)];
            const step = STATUS_ORDER.indexOf(status) + 1;
            return (
              <Link
                key={s.id}
                to="/dossiers/$id"
                params={{ id: s.id }}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`pointer-events-none absolute inset-y-3 left-1 w-1 rounded-full bg-gradient-to-b ${tone.grad} ${tone.glow} transition-all duration-300 group-hover:inset-y-2 group-hover:w-1.5`}
                />
                <div className="flex flex-col gap-2.5 p-4 pl-5">
                  {/* Réf + client + priorité */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-bold tracking-tight">
                        {s.reference}
                      </div>
                      <div className="mt-0.5 truncate text-sm font-semibold text-foreground/90">
                        {s.clients?.name || "—"}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityTone(
                        s.priority as never,
                      )}`}
                    >
                      {s.priority}
                    </span>
                  </div>

                  {/* Infos transport */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-foreground/80">
                      <Ship className="size-3.5 shrink-0 text-foreground/40" />
                      <span className="truncate">{s.vessel_name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="size-3.5 shrink-0 text-foreground/40" />
                      <span className="truncate font-mono">
                        {s.bl_number || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="size-3.5 shrink-0 text-foreground/40" />
                      <span className="truncate font-mono">
                        {s.container_number || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Progression */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span
                        className={`truncate rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.pill}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
                        {step}/12
                      </span>
                    </div>
                    <div
                      className={`h-2 w-full overflow-hidden rounded-full ${tone.track}`}
                    >
                      <div
                        className={`h-full rounded-full ${tone.bar} transition-all`}
                        style={{ width: `${statusProgress(status)}%` }}
                      />
                    </div>
                  </div>

                  {/* Pied de carte */}
                  <div className="flex items-center justify-between border-t border-border pt-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      <span>
                        {s.arrival_date
                          ? new Date(s.arrival_date).toLocaleDateString("fr-FR")
                          : "—"}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-hero-blue opacity-0 transition group-hover:opacity-100">
                      Ouvrir <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
