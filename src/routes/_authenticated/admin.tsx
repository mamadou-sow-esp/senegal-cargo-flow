import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminListCompanies, adminSetPlan } from "@/lib/subscription.functions";
import { getPlan, PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";
import { ShieldCheck, Clock, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const sora = { fontFamily: "var(--font-label)" };

const STATUS: Record<string, { label: string; cls: string }> = {
  trialing: { label: "Essai", cls: "bg-amber-100 text-amber-700" },
  pending: { label: "En attente", cls: "bg-orange-100 text-orange-700" },
  active: { label: "Actif", cls: "bg-emerald-100 text-emerald-700" },
  past_due: { label: "Échu", cls: "bg-red-100 text-red-700" },
  canceled: { label: "Résilié", cls: "bg-muted text-muted-foreground" },
};

interface Company {
  id: string;
  name: string;
  email: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  pending_plan: string | null;
  current_period_end: string | null;
  users: number;
}

function AdminPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCompanies);
  const setPlanFn = useServerFn(adminSetPlan);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: () => listFn() as Promise<Company[]>,
    retry: false,
  });

  const setPlan = useMutation({
    mutationFn: (v: { companyId: string; planId: PlanId }) =>
      setPlanFn({ data: v }),
    onSuccess: () => {
      toast.success("Formule mise à jour.");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  if (error) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-extrabold" style={sora}>
          Accès réservé
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cette page est réservée à l'administrateur ORUS TRANSIT.
        </p>
      </div>
    );
  }

  const companies = data ?? [];
  const pendingCount = companies.filter((c) => c.pending_plan).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          <ShieldCheck className="size-3.5" /> Administration ORUS TRANSIT
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight" style={sora}>
          Cabinets & abonnements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {companies.length} cabinet{companies.length > 1 ? "s" : ""}
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700">
              <Clock className="size-3" /> {pendingCount} paiement
              {pendingCount > 1 ? "s" : ""} à valider
            </span>
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <Th>Cabinet</Th>
              <Th>Utilisateurs</Th>
              <Th>Formule</Th>
              <Th>Statut</Th>
              <Th>En attente</Th>
              <Th>Attribuer une formule</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {companies.map((c) => {
              const plan = getPlan(c.subscription_plan);
              const st = STATUS[c.subscription_status ?? "trialing"] ?? STATUS.trialing;
              const pending = c.pending_plan
                ? PLANS[c.pending_plan as PlanId]
                : null;
              return (
                <tr key={c.id} className="hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    {c.email && (
                      <div className="text-xs text-muted-foreground">
                        {c.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.users}</td>
                  <td className="px-4 py-3 font-semibold">{plan.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {pending ? (
                      <button
                        disabled={setPlan.isPending}
                        onClick={() =>
                          setPlan.mutate({
                            companyId: c.id,
                            planId: pending.id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
                      >
                        <Check className="size-3" /> Valider {pending.name}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={plan.id}
                      disabled={setPlan.isPending}
                      onChange={(e) =>
                        setPlan.mutate({
                          companyId: c.id,
                          planId: e.target.value as PlanId,
                        })
                      }
                      className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs outline-none focus:border-hero-blue"
                    >
                      {PLAN_ORDER.map((id) => (
                        <option key={id} value={id}>
                          {PLANS[id].name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!isLoading && companies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  Aucun cabinet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        L'activation se fait normalement automatiquement via GeniusPay (Wave /
        Orange Money / MTN MoMo). « Valider » sert de filet de secours si un
        paiement doit être forcé manuellement. Le menu déroulant permet de
        forcer n'importe quelle formule (mise à niveau, geste commercial,
        rétrogradation).
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </th>
  );
}
