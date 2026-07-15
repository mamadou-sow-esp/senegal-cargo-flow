import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  priorityTone,
  statusProgress,
  type ShipmentStatus,
} from "@/lib/status";
import { ArrowUpRight, CircleAlert, Clock, FolderKanban, PackageCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type ShipmentRow = {
  id: string;
  reference: string;
  vessel_name: string | null;
  bl_number: string | null;
  container_number: string | null;
  status: ShipmentStatus;
  priority: "basse" | "standard" | "haute" | "critique";
  created_at: string;
  clients: { name: string } | null;
};

function Dashboard() {
  const { data: shipments } = useQuery({
    queryKey: ["dashboard-shipments"],
    queryFn: async (): Promise<ShipmentRow[]> => {
      const { data, error } = await supabase
        .from("shipments")
        .select(
          "id, reference, vessel_name, bl_number, container_number, status, priority, created_at, clients(name)",
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ShipmentRow[];
    },
  });

  const all = shipments ?? [];
  const active = all.filter(
    (s) => !["cloture", "marchandise_sortie"].includes(s.status),
  );
  const done = all.filter((s) => s.status === "cloture");
  const blocked = all.filter((s) => s.status === "documents_attente");
  const waiting = all.filter((s) =>
    ["cree", "documents_attente", "declaration_preparee"].includes(s.status),
  );

  const kpis = [
    { label: "Actifs", value: active.length, hint: "En traitement" },
    { label: "Terminés", value: done.length, hint: "Historique" },
    { label: "En attente", value: waiting.length, hint: "Étape initiale" },
    { label: "Bloqués", value: blocked.length, hint: "Action requise", accent: true },
    { label: "Délai moyen", value: "—", hint: "À venir" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6 md:p-8">
      <div>
        <div className="font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Vue d'ensemble
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Tableau de bord opérations
        </h1>
      </div>


      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={`animate-in-up rounded border border-border bg-white p-5 ${
              k.accent ? "border-l-4 border-l-accent" : ""
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div
              className={`font-label text-[10px] font-bold uppercase tracking-widest ${
                k.accent ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {k.label}
            </div>
            <div className="mt-2 font-mono text-3xl font-extrabold tabular-nums">
              {k.value}
            </div>
            <div className="font-label mt-1 text-[10px] text-muted-foreground">{k.hint}</div>

          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="animate-in-up space-y-4 lg:col-span-9">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight">
              Dossiers récents
            </h2>
            <Link
              to="/dossiers"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Tout voir <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="overflow-hidden rounded border border-border bg-white">
            {all.length === 0 ? (
              <EmptyDossiers />
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <Th>N° / Conteneur</Th>
                    <Th>Client</Th>
                    <Th>Étape</Th>
                    <Th>Priorité</Th>
                    <Th className="text-right">Créé</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {all.slice(0, 8).map((s) => (
                    <tr
                      key={s.id}
                      className={`group transition-colors hover:bg-primary/5 ${
                        s.status === "documents_attente"
                          ? "border-l-2 border-l-accent"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to="/dossiers/$id"
                          params={{ id: s.id }}
                          className="block"
                        >
                          <div className="font-mono text-xs font-semibold text-primary">
                            {s.reference}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {s.container_number || s.bl_number || "—"}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {s.clients?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full ${
                                s.status === "documents_attente"
                                  ? "bg-accent"
                                  : s.status === "cloture"
                                    ? "bg-emerald-500"
                                    : "bg-primary"
                              }`}
                              style={{ width: `${statusProgress(s.status)}%` }}
                            />
                          </div>
                          <span className="font-label text-[11px] font-semibold text-muted-foreground">
                            {STATUS_ORDER.indexOf(s.status) + 1}/12
                          </span>
                        </div>
                        <div className="font-label mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {STATUS_LABEL[s.status]}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-label rounded px-2 py-0.5 text-[10px] font-bold uppercase ${priorityTone(s.priority)}`}
                        >
                          {s.priority}
                        </span>

                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <aside className="animate-in-up space-y-6 lg:col-span-3">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Résumé
            </h3>
            <SummaryTile icon={FolderKanban} label="Dossiers actifs" value={active.length} />
            <SummaryTile icon={PackageCheck} label="Clôturés" value={done.length} />
            <SummaryTile icon={Clock} label="En attente" value={waiting.length} />
            <SummaryTile
              icon={CircleAlert}
              label="Bloqués"
              value={blocked.length}
              accent
            />
          </div>

          <div className="rounded border border-accent/20 bg-accent/5 p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-accent">
              Assistance IA active
            </div>
            <p className="mt-1 text-xs leading-relaxed text-foreground/80">
              L'assistant ClearFlow IA est à votre disposition. Posez-lui vos
              questions sur les procédures douanières, les taxes, les
              documents requis ou le suivi d'un dossier.
            </p>
          </div>
        </aside>
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
      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded border border-border bg-white p-3">
      <div className="flex items-center gap-2.5">
        <div
          className={`grid size-8 place-items-center rounded ${
            accent ? "bg-accent/10 text-accent" : "bg-muted text-foreground"
          }`}
        >
          <Icon className="size-4" />
        </div>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span
        className={`font-mono text-lg font-extrabold tabular-nums ${accent ? "text-accent" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyDossiers() {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
      <FolderKanban className="size-8 text-muted-foreground" />
      <div className="text-sm font-semibold">Aucun dossier pour l'instant</div>
      <p className="max-w-sm text-xs text-muted-foreground">
        Créez votre premier dossier d'importation pour démarrer le suivi.
      </p>
      <Link
        to="/dossiers/new"
        className="mt-2 rounded bg-primary px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
      >
        Créer un dossier
      </Link>
    </div>
  );
}
