import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------------------------------------------------------------
// Garde super-admin (propriétaire ORUS TRANSIT)
// ------------------------------------------------------------
async function requireSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin");
  if (!roles || roles.length === 0)
    throw new Error("Réservé à l'administrateur ORUS TRANSIT.");
  return supabaseAdmin;
}

// ------------------------------------------------------------
// Vue d'ensemble business
// ------------------------------------------------------------
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await requireSuperAdmin(
      (context as { userId: string }).userId,
    );

    const { data: pays } = await supabaseAdmin
      .from("payments")
      .select("amount, created_at, plan, company_id")
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    const payments = (pays ?? []) as Array<{
      amount: number;
      created_at: string;
      plan: string;
      company_id: string;
    }>;

    const revenueTotal = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const revenueMonth = payments
      .filter((p) => new Date(p.created_at) >= monthStart)
      .reduce((s, p) => s + (p.amount ?? 0), 0);

    // CA par mois (6 derniers mois)
    const months: { label: string; total: number }[] = [];
    const keyIndex = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keyIndex.set(`${d.getFullYear()}-${d.getMonth()}`, months.length);
      months.push({
        label: d.toLocaleDateString("fr-FR", { month: "short" }),
        total: 0,
      });
    }
    for (const p of payments) {
      const d = new Date(p.created_at);
      const i = keyIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i != null) months[i].total += p.amount ?? 0;
    }

    const { data: comps } = await supabaseAdmin
      .from("companies")
      .select("id, name, subscription_plan, pending_plan");
    const companies = (comps ?? []) as Array<{
      id: string;
      name: string;
      subscription_plan: string | null;
      pending_plan: string | null;
    }>;
    const totalCabinets = companies.length;
    const proCount = companies.filter(
      (c) => c.subscription_plan === "pro",
    ).length;
    const trialCount = companies.filter(
      (c) => c.subscription_plan !== "pro",
    ).length;
    const pending = companies.filter((c) => c.pending_plan).length;

    // Volume d'affaires traité via la plateforme (valeur des marchandises).
    const { data: gv } = await supabaseAdmin
      .from("shipments")
      .select("goods_value, created_at")
      .eq("is_deleted", false);
    const shipments = (gv ?? []) as Array<{
      goods_value: number | string | null;
      created_at: string;
    }>;
    const num = (v: number | string | null) => (v ? Number(v) || 0 : 0);
    const volumeTotal = shipments.reduce((s, r) => s + num(r.goods_value), 0);
    const volumeMonth = shipments
      .filter((r) => new Date(r.created_at) >= monthStart)
      .reduce((s, r) => s + num(r.goods_value), 0);
    const dossiers = shipments.length;

    const { count: users } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // Paiements récents (nom du cabinet)
    const recent = payments.slice(0, 12);
    const nameMap = new Map(companies.map((c) => [c.id, c.name]));
    const recentPayments = recent.map((p) => ({
      company: nameMap.get(p.company_id) ?? "—",
      amount: p.amount,
      plan: p.plan,
      date: p.created_at,
    }));

    return {
      revenueTotal,
      revenueMonth,
      volumeTotal,
      volumeMonth,
      months,
      totalCabinets,
      proCount,
      trialCount,
      pending,
      dossiers,
      users: users ?? 0,
      recentPayments,
    };
  });

// ------------------------------------------------------------
// Liste enrichie des cabinets
// ------------------------------------------------------------
export const adminCabinets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await requireSuperAdmin(
      (context as { userId: string }).userId,
    );

    const { data: comps } = await supabaseAdmin
      .from("companies")
      .select(
        "id, name, email, subscription_plan, subscription_status, pending_plan, current_period_end, created_at",
      )
      .order("created_at", { ascending: false });
    const list = (comps ?? []) as Array<{ id: string }>;
    const ids = list.map((c) => c.id);

    const users = new Map<string, number>();
    const dossiers = new Map<string, number>();
    const revenue = new Map<string, number>();
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("company_id")
        .in("company_id", ids);
      for (const p of profs ?? []) {
        const id = (p as { company_id: string }).company_id;
        if (id) users.set(id, (users.get(id) ?? 0) + 1);
      }
      const { data: ships } = await supabaseAdmin
        .from("shipments")
        .select("company_id")
        .eq("is_deleted", false)
        .in("company_id", ids);
      for (const s of ships ?? []) {
        const id = (s as { company_id: string }).company_id;
        dossiers.set(id, (dossiers.get(id) ?? 0) + 1);
      }
      const { data: pays } = await supabaseAdmin
        .from("payments")
        .select("company_id, amount")
        .eq("status", "completed")
        .in("company_id", ids);
      for (const p of pays ?? []) {
        const row = p as { company_id: string; amount: number };
        revenue.set(row.company_id, (revenue.get(row.company_id) ?? 0) + (row.amount ?? 0));
      }
    }

    return list.map((c) => ({
      ...(c as Record<string, unknown>),
      users: users.get(c.id) ?? 0,
      dossiers: dossiers.get(c.id) ?? 0,
      revenue: revenue.get(c.id) ?? 0,
    }));
  });

// ------------------------------------------------------------
// Employés d'un cabinet + nombre de dossiers gérés
// ------------------------------------------------------------
export const adminCabinetEmployees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requireSuperAdmin(
      (context as { userId: string }).userId,
    );

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, job_title")
      .eq("company_id", data.companyId);
    const employees = (profs ?? []) as Array<{ id: string }>;
    const ids = employees.map((e) => e.id);

    const roleMap = new Map<string, string[]>();
    const dossierMap = new Map<string, number>();
    if (ids.length) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .eq("company_id", data.companyId)
        .in("user_id", ids);
      for (const r of roles ?? []) {
        const row = r as { user_id: string; role: string };
        const l = roleMap.get(row.user_id) ?? [];
        l.push(row.role);
        roleMap.set(row.user_id, l);
      }
      const { data: ships } = await supabaseAdmin
        .from("shipments")
        .select("created_by")
        .eq("company_id", data.companyId)
        .eq("is_deleted", false)
        .in("created_by", ids);
      for (const s of ships ?? []) {
        const id = (s as { created_by: string }).created_by;
        if (id) dossierMap.set(id, (dossierMap.get(id) ?? 0) + 1);
      }
    }

    return employees.map((e) => ({
      ...(e as Record<string, unknown>),
      roles: roleMap.get(e.id) ?? [],
      dossiers: dossierMap.get(e.id) ?? 0,
    }));
  });
