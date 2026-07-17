import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STATUS_LABEL, STATUS_ORDER, type ShipmentStatus } from "@/lib/status";
import {
  FolderKanban,
  PackageCheck,
  Banknote,
  CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/statistiques")({
  component: Stats,
});

const sora = { fontFamily: "var(--font-label)" } as const;
const AXIS = "#94a3b8";
const GRID = "rgba(148,163,184,0.18)";
const PIE_COLORS = [
  "#64748b",
  "#38bdf8",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#f59e0b",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#10b981",
  "#0ea5e9",
  "#a855f7",
];
const PRIO_COLOR: Record<string, string> = {
  critique: "#ef4444",
  haute: "#f97316",
  standard: "#3b82f6",
  basse: "#94a3b8",
};

type Row = {
  status: ShipmentStatus;
  priority: "basse" | "standard" | "haute" | "critique";
  created_at: string;
  goods_value: number | null;
  clients: { name: string } | null;
};

function Stats() {
  const { data } = useQuery({
    queryKey: ["stats-shipments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("status, priority, created_at, goods_value, clients(name)")
        .eq("is_deleted", false);
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = data ?? [];
  const total = rows.length;
  const closed = rows.filter((s) =>
    ["cloture", "marchandise_sortie"].includes(s.status),
  ).length;
  const closeRate = total ? Math.round((closed / total) * 100) : 0;
  const totalValue = rows.reduce((a, s) => a + (Number(s.goods_value) || 0), 0);
  const now = new Date();
  const thisMonth = rows.filter((s) => {
    const d = new Date(s.created_at);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const monthMap = new Map<string, { label: string; n: number }>();
  rows.forEach((s) => {
    const d = new Date(s.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", {
      month: "short",
      year: "2-digit",
    });
    const cur = monthMap.get(key) ?? { label, n: 0 };
    cur.n += 1;
    monthMap.set(key, cur);
  });
  const monthly = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => ({ month: v.label, dossiers: v.n }));

  const statusData = STATUS_ORDER.map((s, i) => ({
    name: STATUS_LABEL[s],
    value: rows.filter((r) => r.status === s).length,
    color: PIE_COLORS[i % PIE_COLORS.length],
  })).filter((d) => d.value > 0);

  const prioData = (["critique", "haute", "standard", "basse"] as const)
    .map((p) => ({ name: p, value: rows.filter((r) => r.priority === p).length }))
    .filter((d) => d.value > 0);

  const clientMap = new Map<string, number>();
  rows.forEach((s) => {
    const n = s.clients?.name || "Sans client";
    clientMap.set(n, (clientMap.get(n) ?? 0) + 1);
  });
  const topClients = Array.from(clientMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const fmtValue =
    totalValue >= 1_000_000
      ? `${(totalValue / 1_000_000).toFixed(1)} M`
      : totalValue.toLocaleString("fr-FR");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 md:p-8">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Analytique
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight" style={sora}>
          Statistiques
        </h1>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
          Pas encore de données. Créez des dossiers pour voir vos statistiques.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={FolderKanban} value={total} label="Dossiers" tone="text-hero-blue" />
            <Kpi
              icon={PackageCheck}
              value={`${closeRate} %`}
              label="Taux de clôture"
              tone="text-emerald-500"
            />
            <Kpi
              icon={Banknote}
              value={fmtValue}
              label="Valeur déclarée (FCFA)"
              tone="text-violet-500"
            />
            <Kpi
              icon={CalendarDays}
              value={thisMonth}
              label="Ce mois-ci"
              tone="text-amber-500"
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Courbe mensuelle douce */}
            <Card title="Évolution des dossiers" full>
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart
                    data={monthly}
                    margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2f6bed" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#2f6bed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke={GRID}
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.25)",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="dossiers"
                      stroke="#2f6bed"
                      strokeWidth={2.5}
                      fill="url(#areaBlue)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Donut + légende lisible */}
            <Card title="Répartition par étape" full>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        innerRadius={58}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {statusData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid rgba(148,163,184,0.25)",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full flex-1 space-y-1.5">
                  {statusData.map((d) => (
                    <li key={d.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="flex-1 truncate text-muted-foreground">
                        {d.name}
                      </span>
                      <span className="font-bold tabular-nums">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card title="Répartition par priorité">
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart
                    data={prioData}
                    layout="vertical"
                    margin={{ left: 8, right: 12 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      stroke={GRID}
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={66}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.1)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.25)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
                      {prioData.map((d, i) => (
                        <Cell key={i} fill={PRIO_COLOR[d.name] ?? "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {prioData.map((d) => (
                  <span
                    key={d.name}
                    className="flex items-center gap-1.5 text-[11px] capitalize text-muted-foreground"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: PRIO_COLOR[d.name] }}
                    />
                    {d.name}
                  </span>
                ))}
              </div>
            </Card>

            <Card title="Top clients (par dossiers)">
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart
                    data={topClients}
                    layout="vertical"
                    margin={{ left: 8, right: 12 }}
                  >
                    <CartesianGrid
                      horizontal={false}
                      stroke={GRID}
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: AXIS, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: AXIS, fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={104}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.1)" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.25)",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#14b8a6"
                      radius={[0, 8, 8, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof FolderKanban;
  value: string | number;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <Icon className={`size-5 ${tone}`} />
      <div
        className="mt-4 text-2xl font-extrabold tracking-tight tabular-nums"
        style={sora}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Card({
  title,
  children,
  full,
}: {
  title: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-white p-5 shadow-sm ${
        full ? "" : ""
      }`}
    >
      <h2 className="mb-4 text-base font-bold tracking-tight" style={sora}>
        {title}
      </h2>
      {children}
    </div>
  );
}
