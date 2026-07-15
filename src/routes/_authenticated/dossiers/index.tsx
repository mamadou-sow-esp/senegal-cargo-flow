import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  priorityTone,
  statusProgress,
  type ShipmentStatus,
} from "@/lib/status";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dossiers/")({
  component: DossiersList,
});

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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Opérations
          </div>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            Dossiers d'importation
          </h1>
        </div>
        <Link
          to="/dossiers/new"
          className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
        >
          <Plus className="size-3.5" /> Nouveau dossier
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded border border-border bg-white p-3">
        <div className="flex flex-1 items-center gap-2 rounded border border-border bg-muted/50 px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher BL, conteneur, navire, référence…"
            className="w-full bg-transparent text-xs outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ShipmentStatus | "all")
          }
          className="rounded border border-border bg-white px-2 py-1.5 text-xs"
        >
          <option value="all">Toutes les étapes</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded border border-border bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <Th>Référence</Th>
              <Th>Client</Th>
              <Th>Navire / BL</Th>
              <Th>Étape</Th>
              <Th>Priorité</Th>
              <Th className="text-right">Arrivée</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {(data ?? []).map((s) => (
              <tr
                key={s.id}
                className="group cursor-pointer transition-colors hover:bg-primary/5"
              >
                <td className="px-4 py-3">
                  <Link to="/dossiers/$id" params={{ id: s.id }}>
                    <div className="font-mono text-xs font-semibold text-primary">
                      {s.reference}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {s.container_number || "—"}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">
                  {s.clients?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs">{s.vessel_name || "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {s.bl_number || "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${statusProgress(s.status as ShipmentStatus)}%`,
                        }}
                      />
                    </div>
                    <span className="font-label text-[11px] font-semibold text-muted-foreground">
                      {STATUS_ORDER.indexOf(s.status as ShipmentStatus) + 1}/12
                    </span>
                  </div>
                  <div className="font-label mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {STATUS_LABEL[s.status as ShipmentStatus]}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-label rounded px-2 py-0.5 text-[10px] font-bold uppercase ${priorityTone(s.priority as never)}`}
                  >
                    {s.priority}
                  </span>

                </td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">
                  {s.arrival_date
                    ? new Date(s.arrival_date).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Aucun dossier trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-label ${className}`}
    >
      {children}
    </th>
  );
}

