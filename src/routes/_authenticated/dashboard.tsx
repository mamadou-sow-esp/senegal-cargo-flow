import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import aiRobot from "@/assets/ia.png";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  priorityTone,
  statusProgress,
  statusTone,
  type ShipmentStatus,
} from "@/lib/status";
import {
  FolderKanban,
  PackageCheck,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Calculator,
  Users,
  Ship,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

// Sora pour les titres et chiffres (police d'affichage moderne).
const sora = { fontFamily: "var(--font-label)" } as const;

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

const TONE: Record<
  ReturnType<typeof statusTone>,
  { text: string; bar: string; soft: string; chip: string }
> = {
  done: {
    text: "text-emerald-600",
    bar: "bg-emerald-500",
    soft: "bg-emerald-100",
    chip: "bg-emerald-100 text-emerald-700",
  },
  progress: {
    text: "text-blue-600",
    bar: "bg-blue-500",
    soft: "bg-blue-100",
    chip: "bg-blue-100 text-blue-700",
  },
  blocked: {
    text: "text-amber-600",
    bar: "bg-amber-500",
    soft: "bg-amber-100",
    chip: "bg-amber-100 text-amber-700",
  },
  neutral: {
    text: "text-slate-500",
    bar: "bg-slate-400",
    soft: "bg-slate-100",
    chip: "bg-slate-100 text-slate-600",
  },
};

const PHASES: {
  label: string;
  tone: ReturnType<typeof statusTone>;
  statuses: ShipmentStatus[];
}[] = [
  {
    label: "Préparation",
    tone: "neutral",
    statuses: [
      "cree",
      "documents_attente",
      "documents_complets",
      "declaration_preparee",
    ],
  },
  {
    label: "Déclaration & contrôle",
    tone: "progress",
    statuses: [
      "declaration_deposee",
      "attente_validation",
      "controle_documentaire",
      "controle_physique",
    ],
  },
  {
    label: "Paiement & enlèvement",
    tone: "blocked",
    statuses: ["paiement_droits", "bon_a_enlever"],
  },
  {
    label: "Sortie & clôture",
    tone: "done",
    statuses: ["marchandise_sortie", "cloture"],
  },
];

const PRIO: Record<string, { dot: string; label: string }> = {
  critique: { dot: "bg-red-500", label: "Critique" },
  haute: { dot: "bg-orange-500", label: "Haute" },
  standard: { dot: "bg-blue-500", label: "Standard" },
  basse: { dot: "bg-slate-400", label: "Basse" },
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

  const { data: clientCount } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const all = shipments ?? [];
  const active = all.filter(
    (s) => !["cloture", "marchandise_sortie"].includes(s.status),
  );
  const done = all.filter((s) =>
    ["cloture", "marchandise_sortie"].includes(s.status),
  );
  const waitingDocs = all.filter((s) => s.status === "documents_attente");
  const highPrio = active.filter(
    (s) => s.priority === "haute" || s.priority === "critique",
  );

  const prioCounts = {
    critique: all.filter((s) => s.priority === "critique").length,
    haute: all.filter((s) => s.priority === "haute").length,
    standard: all.filter((s) => s.priority === "standard").length,
    basse: all.filter((s) => s.priority === "basse").length,
  };
  const prioMax = Math.max(1, ...Object.values(prioCounts));

  const phaseCounts = PHASES.map((p) => ({
    ...p,
    count: all.filter((s) => p.statuses.includes(s.status)).length,
  }));
  const phaseTotal = Math.max(1, all.length);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 md:p-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
            Vue d'ensemble
          </div>
          <h1
            className="mt-1 text-3xl font-extrabold tracking-tight"
            style={sora}
          >
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {today}
          </p>
        </div>
        <Link
          to="/dossiers/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-hero-blue px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm shadow-hero-blue/25 transition hover:opacity-90"
        >
          <Plus className="size-3.5" /> Nouveau dossier
        </Link>
      </div>

      {/* KPI */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          value={active.length}
          label="Dossiers actifs"
          hint="En cours de traitement"
          tone="progress"
        />
        <StatCard
          icon={PackageCheck}
          value={done.length}
          label="Clôturés"
          hint="Sortis / archivés"
          tone="done"
        />
        <StatCard
          icon={Clock}
          value={waitingDocs.length}
          label="Docs en attente"
          hint="Pièces manquantes"
          tone="blocked"
        />
        <StatCard
          icon={AlertTriangle}
          value={highPrio.length}
          label="Priorité élevée"
          hint="Haute ou critique"
          tone="neutral"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-4 lg:col-span-2">
          {/* Dossiers récents */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight" style={sora}>
                Dossiers récents
              </h2>
              <Link
                to="/dossiers"
                className="inline-flex items-center gap-1 text-xs font-semibold text-hero-blue hover:underline"
              >
                Tout voir <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            {all.length === 0 ? (
              <EmptyDossiers />
            ) : (
              <div className="space-y-0.5">
                {all.slice(0, 6).map((s) => (
                  <RecentRow key={s.id} s={s} />
                ))}
              </div>
            )}
          </div>

          {/* Répartition par étape */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight" style={sora}>
                Répartition par étape
              </h2>
              <Link
                to="/statistiques"
                className="inline-flex items-center gap-1 text-xs font-semibold text-hero-blue hover:underline"
              >
                Statistiques <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {phaseCounts.map((p) =>
                p.count > 0 ? (
                  <div
                    key={p.label}
                    className={TONE[p.tone].bar}
                    style={{ width: `${(p.count / phaseTotal) * 100}%` }}
                    title={`${p.label} : ${p.count}`}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {phaseCounts.map((p) => (
                <div key={p.label} className="flex items-center gap-2.5">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${TONE[p.tone].bar}`}
                  />
                  <span className="flex-1 text-xs text-muted-foreground">
                    {p.label}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={sora}
                  >
                    {p.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4">
          {/* Alertes */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold tracking-tight" style={sora}>
              Alertes
            </h2>
            {waitingDocs.length === 0 && highPrio.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucune alerte. Tout est à jour.
              </p>
            ) : (
              <div className="space-y-1.5">
                {waitingDocs.slice(0, 3).map((s) => (
                  <AlertRow
                    key={s.id}
                    id={s.id}
                    ref_={s.reference}
                    label="Documents en attente"
                    tone="blocked"
                  />
                ))}
                {highPrio.slice(0, 3).map((s) => (
                  <AlertRow
                    key={s.id}
                    id={s.id}
                    ref_={s.reference}
                    label={`Priorité ${s.priority}`}
                    tone="neutral"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Priorités */}
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold tracking-tight" style={sora}>
              Priorités
            </h2>
            <div className="space-y-3">
              {(
                ["critique", "haute", "standard", "basse"] as const
              ).map((k) => (
                <div key={k} className="flex items-center gap-2.5">
                  <span className={`size-2.5 rounded-full ${PRIO[k].dot}`} />
                  <span className="w-16 text-xs text-muted-foreground">
                    {PRIO[k].label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${PRIO[k].dot}`}
                      style={{ width: `${(prioCounts[k] / prioMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-bold tabular-nums">
                    {prioCounts[k]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Aperçu rapide */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat icon={Users} label="Clients" value={clientCount ?? 0} />
            <MiniStat icon={Ship} label="Dossiers" value={all.length} />
          </div>

          {/* Assistant IA */}
          <div className="rounded-2xl border border-hero-blue/20 bg-gradient-to-br from-hero-blue/10 to-hero-blue/5 p-5">
            <div className="flex items-center gap-2 text-hero-blue">
              <img src={aiRobot} alt="" className="size-6 object-contain" />
              <div
                className="text-xs font-bold uppercase tracking-widest"
                style={sora}
              >
                Assistant IA
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">
              ORUS TRANSIT AI répond à vos questions sur les procédures, les
              taxes, les documents et le suivi de dossiers, en bas à droite de
              l'écran.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/calculateur"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold shadow-sm hover:bg-muted"
              >
                <Calculator className="size-3.5 text-hero-blue" /> Calculateur
              </Link>
              <Link
                to="/clients"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold shadow-sm hover:bg-muted"
              >
                <Users className="size-3.5 text-hero-blue" /> Clients
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  hint,
  tone,
}: {
  icon: typeof FolderKanban;
  value: number;
  label: string;
  hint: string;
  tone: ReturnType<typeof statusTone>;
}) {
  const t = TONE[tone];
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Icon className={`size-5 ${t.text}`} />
      <div
        className="mt-4 text-3xl font-extrabold tracking-tight tabular-nums"
        style={sora}
      >
        {value}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{label}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function RecentRow({ s }: { s: ShipmentRow }) {
  const t = TONE[statusTone(s.status)];
  return (
    <Link
      to="/dossiers/$id"
      params={{ id: s.id }}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/50"
    >
      <span className={`size-2.5 shrink-0 rounded-full ${t.bar}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold">{s.reference}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${priorityTone(
              s.priority,
            )}`}
          >
            {s.priority}
          </span>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {s.clients?.name || "—"} ·{" "}
          {s.container_number || s.bl_number || "—"}
        </div>
      </div>
      <div className="hidden w-32 shrink-0 sm:block">
        <div className={`h-1.5 overflow-hidden rounded-full ${t.soft}`}>
          <div
            className={`h-full ${t.bar}`}
            style={{ width: `${statusProgress(s.status)}%` }}
          />
        </div>
        <div className="mt-1 truncate text-[9px] uppercase tracking-wide text-muted-foreground">
          {STATUS_LABEL[s.status]}
        </div>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

function AlertRow({
  id,
  ref_,
  label,
  tone,
}: {
  id: string;
  ref_: string;
  label: string;
  tone: ReturnType<typeof statusTone>;
}) {
  const t = TONE[tone];
  return (
    <Link
      to="/dossiers/$id"
      params={{ id }}
      className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2 transition hover:bg-muted/50"
    >
      <span className={`size-2 shrink-0 rounded-full ${t.bar}`} />
      <span className="font-mono text-xs font-bold">{ref_}</span>
      <span className={`ml-auto text-[10px] font-semibold ${t.text}`}>
        {label}
      </span>
    </Link>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <Icon className="size-4 text-muted-foreground" />
      <div className="mt-2 text-2xl font-extrabold tabular-nums" style={sora}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyDossiers() {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-muted">
        <FolderKanban className="size-6 text-muted-foreground" />
      </div>
      <div className="text-sm font-semibold">Aucun dossier pour l'instant</div>
      <p className="max-w-sm text-xs text-muted-foreground">
        Créez votre premier dossier d'importation pour démarrer le suivi.
      </p>
      <Link
        to="/dossiers/new"
        className="mt-1 rounded-xl bg-hero-blue px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90"
      >
        Créer un dossier
      </Link>
    </div>
  );
}
