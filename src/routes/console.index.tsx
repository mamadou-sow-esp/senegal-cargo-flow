import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview } from "@/lib/admin.functions";
import { formatFcfa } from "@/lib/plans";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  Building2,
  FolderKanban,
  Users,
  Clock,
  ArrowRightLeft,
} from "lucide-react";

export const Route = createFileRoute("/console/")({
  component: ConsoleOverview,
});

const sora = { fontFamily: "var(--font-label)" };

function ConsoleOverview() {
  const fn = useServerFn(adminOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fn(),
    retry: false,
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Console ORUS TRANSIT
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight" style={sora}>
          Vue d'ensemble
        </h1>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={Wallet}
              tone="text-emerald-500"
              label="Chiffre d'affaires ORUS"
              value={formatFcfa(data.revenueTotal)}
              sub={`Abonnements · ce mois : ${formatFcfa(data.revenueMonth)}`}
            />
            <Kpi
              icon={ArrowRightLeft}
              tone="text-hero-blue"
              label="Argent généré via la plateforme"
              value={formatFcfa(data.volumeTotal)}
              sub={`Valeur des dossiers · ce mois : ${formatFcfa(data.volumeMonth)}`}
            />
            <Kpi
              icon={Building2}
              tone="text-indigo-500"
              label="Cabinets"
              value={String(data.totalCabinets)}
              sub={`${data.proCount} Pro · ${data.trialCount} en essai`}
            />
            <Kpi
              icon={Clock}
              tone="text-orange-500"
              label="Paiements à valider"
              value={String(data.pending)}
            />
          </div>

          <p className="-mt-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Chiffre d'affaires ORUS</strong> =
            ce que tu encaisses (abonnements).{" "}
            <strong className="text-foreground">Argent généré via la plateforme</strong>{" "}
            = la valeur marchande totale des dossiers qui transitent par l'appli.
          </p>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* CA dans le temps */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Chiffre d'affaires ORUS · 6 derniers mois
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.months}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(148,163,184,0.18)"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={70}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: number) => formatFcfa(v)}
                      labelStyle={{ fontWeight: 700 }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e6e9f0",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#2f6bed"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Autres chiffres */}
            <div className="space-y-4">
              <MiniStat
                icon={FolderKanban}
                label="Dossiers sur la plateforme"
                value={String(data.dossiers)}
              />
              <MiniStat
                icon={Users}
                label="Utilisateurs au total"
                value={String(data.users)}
              />
            </div>
          </div>

          {/* Paiements récents */}
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Paiements récents
              </h2>
            </div>
            {data.recentPayments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Aucun paiement pour le moment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <tbody className="divide-y divide-border">
                    {data.recentPayments.map((p, i) => (
                      <tr key={i} className="hover:bg-primary/5">
                        <td className="px-5 py-3 font-medium">{p.company}</td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {p.plan === "pro" ? "Pro" : p.plan}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-semibold text-emerald-600">
                          {formatFcfa(p.amount)}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                          {new Date(p.date).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <Icon className={`size-5 ${tone}`} />
      <div className="mt-3 text-2xl font-extrabold" style={sora}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <Icon className="size-6 text-hero-blue" />
      <div>
        <div className="text-2xl font-extrabold" style={sora}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
