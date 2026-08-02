import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2, UserRound } from "lucide-react";
import {
  inviteEmployee,
  listEmployees,
  removeEmployee,
  updateEmployeeRole,
} from "@/lib/employees.functions";

export const Route = createFileRoute("/_authenticated/employes")({
  component: EmployeesPage,
});

type Role = "company_admin" | "employee";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  company_admin: "Administrateur",
  employee: "Employé",
};

function EmployeesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listEmployees);
  const invite = useServerFn(inviteEmployee);
  const updateRole = useServerFn(updateEmployeeRole);
  const remove = useServerFn(removeEmployee);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    jobTitle: "",
    phone: "",
    role: "employee" as Role,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => list(),
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(needle) ||
        r.email?.toLowerCase().includes(needle) ||
        r.job_title?.toLowerCase().includes(needle),
    );
  }, [data, q]);

  const inviteM = useMutation({
    mutationFn: () => invite({ data: form }),
    onSuccess: () => {
      toast.success("Invitation envoyée");
      setForm({ email: "", fullName: "", jobTitle: "", phone: "", role: "employee" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const roleM = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => updateRole({ data: v }),
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const removeM = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      toast.success("Employé retiré");
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const total = data?.length ?? 0;
  const admins = (data ?? []).filter((e) => e.roles.includes("company_admin")).length;
  const employees = (data ?? []).filter((e) => e.roles.includes("employee")).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
            Ressources humaines
          </div>
          <h1
            className="mt-1 text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-label)" }}
          >
            Employés
          </h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-hero-blue px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm shadow-hero-blue/25 hover:opacity-90"
        >
          <Plus className="size-3.5" /> Inviter un employé
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total" value={total} />
        <Stat label="Administrateurs" value={admins} />
        <Stat label="Employés" value={employees} />
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 shadow-sm">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un employé…"
          className="w-full bg-transparent text-base outline-none sm:text-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <Th>Nom</Th>
              <Th>Poste</Th>
              <Th>Email</Th>
              <Th>Téléphone</Th>
              <Th>Rôle</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  Aucun employé. Invitez votre première recrue.
                </td>
              </tr>
            )}
            {filtered.map((e) => {
              const primaryRole =
                (e.roles.find((r) => r === "company_admin" || r === "employee") as
                  | Role
                  | undefined) ?? "employee";
              return (
                <tr key={e.id} className="hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="grid size-7 place-items-center rounded-full bg-muted text-[10px] font-bold uppercase text-muted-foreground">
                        {(e.full_name || e.email || "?").slice(0, 2)}
                      </span>
                      {e.full_name || <span className="text-muted-foreground">Sans nom</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.job_title || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.email || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {e.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {e.roles.includes("super_admin") ? (
                      <span className="font-label rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                        {ROLE_LABEL.super_admin}
                      </span>
                    ) : (
                      <select
                        value={primaryRole}
                        onChange={(ev) =>
                          roleM.mutate({
                            userId: e.id,
                            role: ev.target.value as Role,
                          })
                        }
                        className="font-label rounded border border-border bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                      >
                        <option value="company_admin">Administrateur</option>
                        <option value="employee">Employé</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm(`Retirer ${e.full_name || e.email} ?`))
                          removeM.mutate(e.id);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3" /> Retirer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-extrabold tracking-tight">
                Inviter un employé
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Un email d'invitation lui sera envoyé pour créer son mot de passe.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!form.email.trim() || !form.fullName.trim()) return;
                inviteM.mutate();
              }}
            >
              <F label="Nom complet *" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} />
              <F label="Email *" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
              <F label="Poste" value={form.jobTitle} onChange={(v) => setForm((f) => ({ ...f, jobTitle: v }))} />
              <F label="Téléphone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
              <label className="block">
                <span className="font-label mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Rôle
                </span>
                <select
                  value={form.role}
                  onChange={(ev) =>
                    setForm((f) => ({ ...f, role: ev.target.value as Role }))
                  }
                  className="w-full rounded border border-input bg-white px-3 py-1.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring sm:text-sm"
                >
                  <option value="employee">Employé</option>
                  <option value="company_admin">Administrateur</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  disabled={inviteM.isPending}
                  className="rounded bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
                >
                  {inviteM.isPending ? "…" : "Inviter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border bg-white p-4">
      <div className="font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="font-label px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </th>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="font-label mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-input bg-white px-3 py-1.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring sm:text-sm"
      />
    </label>
  );
}
