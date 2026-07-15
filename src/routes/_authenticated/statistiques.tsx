import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
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
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/statistiques")({
  component: Stats,
});

const COLORS = ["#0f172a", "#f97316", "#10b981", "#3b82f6", "#a855f7", "#eab308"];

function Stats() {
  const { data } = useQuery({
    queryKey: ["stats-shipments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("id, status, created_at")
        .eq("is_deleted", false);
      return data ?? [];
    },
  });

  const byMonth = new Map<string, number>();
  const byStatus = new Map<string, number>();
  (data ?? []).forEach((s) => {
    const m = new Date(s.created_at).toLocaleDateString("fr-FR", {
      month: "short",
      year: "2-digit",
    });
    byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
    byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
  });

  const monthly = Array.from(byMonth.entries()).map(([month, n]) => ({
    month,
    dossiers: n,
  }));
  const statusData = STATUS_ORDER.map((s) => ({
    name: STATUS_LABEL[s],
    value: byStatus.get(s) ?? 0,
  })).filter((d) => d.value > 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Analytique
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
          Statistiques
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded border border-border bg-white p-6">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Dossiers par mois
          </h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="dossiers" fill="#0f172a" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded border border-border bg-white p-6">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Répartition par étape
          </h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  innerRadius={45}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
