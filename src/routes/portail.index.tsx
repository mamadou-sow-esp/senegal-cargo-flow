import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  statusProgress,
  statusTone,
  type ShipmentStatus,
} from "@/lib/status";
import { ArrowUpRight, Ship, CalendarDays } from "lucide-react";

const sora = { fontFamily: "var(--font-label)" } as const;
const TONE: Record<
  ReturnType<typeof statusTone>,
  { bar: string; track: string; pill: string }
> = {
  done: { bar: "bg-emerald-500", track: "bg-emerald-100", pill: "bg-emerald-100 text-emerald-700" },
  progress: { bar: "bg-blue-500", track: "bg-blue-100", pill: "bg-blue-100 text-blue-700" },
  blocked: { bar: "bg-amber-500", track: "bg-amber-100", pill: "bg-amber-100 text-amber-700" },
  neutral: { bar: "bg-slate-400", track: "bg-slate-100", pill: "bg-slate-100 text-slate-600" },
};

export const Route = createFileRoute("/portail/")({
  component: PortailList,
});

function PortailList() {
  const { data } = useQuery({
    queryKey: ["portail-shipments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select(
          "id, reference, status, priority, arrival_date, vessel_name, container_number, bl_number",
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Vos importations
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight" style={sora}>
          Suivi de vos dossiers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivez l'avancement du dédouanement de vos marchandises en temps réel.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
          Aucun dossier pour le moment.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((s) => {
            const status = s.status as ShipmentStatus;
            const tone = TONE[statusTone(status)];
            const step = STATUS_ORDER.indexOf(status) + 1;
            return (
              <Link
                key={s.id}
                to="/portail/dossier/$id"
                params={{ id: s.id }}
                className="group rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold">
                    {s.reference}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Ship className="size-3.5 shrink-0 text-foreground/40" />
                    <span className="truncate">{s.vessel_name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-3.5 shrink-0 text-foreground/40" />
                    <span>
                      {s.arrival_date
                        ? `Arrivée ${new Date(s.arrival_date).toLocaleDateString("fr-FR")}`
                        : "Date d'arrivée à confirmer"}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
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
                  <div className={`h-2 w-full overflow-hidden rounded-full ${tone.track}`}>
                    <div
                      className={`h-full rounded-full ${tone.bar}`}
                      style={{ width: `${statusProgress(status)}%` }}
                    />
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
