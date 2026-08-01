import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { adminCabinets, adminCabinetEmployees } from "@/lib/admin.functions";
import { adminSetPlan } from "@/lib/subscription.functions";
import { getPlan, formatFcfa, PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";
import { StatusBadge } from "@/components/status-badge";
import { Check, ChevronRight, Clock, UserCog } from "lucide-react";

export const Route = createFileRoute("/console/cabinets")({
  component: ConsoleCabinets,
});

const sora = { fontFamily: "var(--font-label)" };

interface Cabinet {
  id: string;
  name: string;
  email: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  pending_plan: string | null;
  users: number;
  dossiers: number;
  revenue: number;
}

function ConsoleCabinets() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminCabinets);
  const setPlanFn = useServerFn(adminSetPlan);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-cabinets"],
    queryFn: () => listFn() as Promise<Cabinet[]>,
    retry: false,
  });

  const setPlan = useMutation({
    mutationFn: (v: { companyId: string; planId: PlanId }) =>
      setPlanFn({ data: v }),
    onSuccess: () => {
      toast.success("Formule mise à jour.");
      qc.invalidateQueries({ queryKey: ["admin-cabinets"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  if (error)
    return (
      <p className="text-sm text-muted-foreground">
        Accès réservé à l'administrateur ORUS TRANSIT.
      </p>
    );

  const cabinets = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Gestion
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight" style={sora}>
          Cabinets & abonnements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cabinets.length} cabinet{cabinets.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <Th></Th>
              <Th>Cabinet</Th>
              <Th>Formule</Th>
              <Th>Statut</Th>
              <Th>Employés</Th>
              <Th>Dossiers</Th>
              <Th>CA</Th>
              <Th>Attribuer</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {cabinets.map((c) => {
              const plan = getPlan(c.subscription_plan);
              const pending = c.pending_plan ? PLANS[c.pending_plan as PlanId] : null;
              const open = openId === c.id;
              return (
                <Fragment key={c.id}>
                  <tr className="hover:bg-primary/5">
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setOpenId(open ? null : c.id)}
                        className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted"
                        aria-label="Détails"
                      >
                        <ChevronRight
                          className={`size-4 transition-transform ${open ? "rotate-90" : ""}`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      {c.email && (
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{plan.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.subscription_status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.users}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.dossiers}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      {formatFcfa(c.revenue)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {pending && (
                          <button
                            disabled={setPlan.isPending}
                            onClick={() =>
                              setPlan.mutate({ companyId: c.id, planId: pending.id })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
                          >
                            <Check className="size-3" /> Valider
                          </button>
                        )}
                        <select
                          value={plan.id}
                          disabled={setPlan.isPending}
                          onChange={(e) =>
                            setPlan.mutate({
                              companyId: c.id,
                              planId: e.target.value as PlanId,
                            })
                          }
                          className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs outline-none focus:border-hero-blue"
                        >
                          {PLAN_ORDER.map((id) => (
                            <option key={id} value={id}>
                              {PLANS[id].name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {pending && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-orange-600">
                          <Clock className="size-3" /> demande : {pending.name}
                        </div>
                      )}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={8} className="bg-muted/30 px-6 py-4">
                        <Employees companyId={c.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!isLoading && cabinets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  Aucun cabinet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Emp {
  id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  roles: string[];
  dossiers: number;
}

function Employees({ companyId }: { companyId: string }) {
  const fn = useServerFn(adminCabinetEmployees);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-cabinet-emp", companyId],
    queryFn: () => fn({ data: { companyId } }) as Promise<Emp[]>,
    retry: false,
  });

  if (isLoading)
    return <p className="text-xs text-muted-foreground">Chargement des employés…</p>;
  const emps = data ?? [];
  if (!emps.length)
    return <p className="text-xs text-muted-foreground">Aucun employé.</p>;

  const roleLabel = (r: string[]) =>
    r.includes("super_admin")
      ? "Super-admin"
      : r.includes("company_admin")
        ? "Administrateur"
        : r.includes("client")
          ? "Client"
          : "Employé";

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <UserCog className="size-3.5" /> Employés
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <tbody className="divide-y divide-border">
            {emps.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{e.full_name || "—"}</div>
                  {e.email && (
                    <div className="text-xs text-muted-foreground">{e.email}</div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {roleLabel(e.roles)}
                  {e.job_title ? ` · ${e.job_title}` : ""}
                </td>
                <td className="px-4 py-2.5 text-right text-xs">
                  <span className="font-mono font-semibold">{e.dossiers}</span>{" "}
                  <span className="text-muted-foreground">dossier{e.dossiers > 1 ? "s" : ""}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </th>
  );
}
