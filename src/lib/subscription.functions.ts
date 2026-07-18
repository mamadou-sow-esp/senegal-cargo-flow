import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlan, PLANS, isPlanId, type PlanId } from "@/lib/plans";

// ------------------------------------------------------------
// Contexte cabinet + rôles (service_role)
// ------------------------------------------------------------
async function requireCompany(userId: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.company_id) throw new Error("Aucune entreprise associée");

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("company_id", profile.company_id);
  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  return {
    supabaseAdmin,
    companyId: profile.company_id as string,
    isAdmin: roleList.some(
      (r) => r === "company_admin" || r === "super_admin",
    ),
    isSuperAdmin: roleList.includes("super_admin"),
  };
}

// ------------------------------------------------------------
// État de l'abonnement + usage courant
// ------------------------------------------------------------
export const getSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin, companyId, isAdmin } = await requireCompany(
      context.userId,
    );

    const { data: comp } = await supabaseAdmin
      .from("companies")
      .select(
        "subscription_plan, subscription_status, trial_ends_at, current_period_end, plan_selected, pending_plan",
      )
      .eq("id", companyId)
      .maybeSingle();

    const plan = getPlan(comp?.subscription_plan);

    // Usage : nombre d'utilisateurs
    const { count: users } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    // Usage : SMS envoyés ce mois-ci
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const { count: smsUsed } = await supabaseAdmin
      .from("sms_log")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "sent")
      .gte("created_at", start.toISOString());

    // Usage : dossiers actifs (non clôturés)
    const { count: dossiers } = await supabaseAdmin
      .from("shipments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_deleted", false)
      .neq("status", "cloture");

    // Verrouillage : essai expiré, ou Pro dont la période est dépassée.
    const status = comp?.subscription_status ?? "trialing";
    const now = Date.now();
    const trialEnd = comp?.trial_ends_at
      ? new Date(comp.trial_ends_at).getTime()
      : null;
    const periodEnd = comp?.current_period_end
      ? new Date(comp.current_period_end).getTime()
      : null;
    let locked = false;
    if (status === "trialing" && trialEnd) locked = trialEnd < now;
    else if ((status === "active" || status === "past_due") && periodEnd)
      locked = periodEnd < now;
    const trialDaysLeft =
      status === "trialing" && trialEnd
        ? Math.ceil((trialEnd - now) / 86400000)
        : null;

    return {
      planId: plan.id,
      status,
      trialEndsAt: comp?.trial_ends_at ?? null,
      currentPeriodEnd: comp?.current_period_end ?? null,
      planSelected: comp?.plan_selected ?? false,
      pendingPlan: (comp?.pending_plan as string | null) ?? null,
      locked,
      trialDaysLeft,
      isAdmin,
      usage: {
        users: users ?? 0,
        smsUsed: smsUsed ?? 0,
        dossiers: dossiers ?? 0,
      },
    };
  });

// ------------------------------------------------------------
// Choix de formule (écran post-connexion).
//  - Essai       → activé immédiatement (14 jours).
//  - Payant      → passé "en attente" ; l'accès reste en essai jusqu'à
//                  validation manuelle du paiement par le super-admin.
// ------------------------------------------------------------
export const selectPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ planId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, companyId, isAdmin } = await requireCompany(
      context.userId,
    );
    if (!isAdmin)
      throw new Error(
        "Seul l'administrateur du cabinet peut choisir la formule.",
      );
    if (!isPlanId(data.planId)) throw new Error("Formule inconnue");
    const plan = PLANS[data.planId as PlanId];

    // Essai gratuit → activation directe
    if (plan.id === "trial") {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      await supabaseAdmin
        .from("companies")
        .update({
          subscription_plan: "trial",
          subscription_status: "trialing",
          trial_ends_at: trialEnd.toISOString(),
          plan_selected: true,
          pending_plan: null,
          pending_since: null,
        })
        .eq("id", companyId);
      return { manual: false as const, planId: plan.id };
    }

    // Formule payante → mise en attente de validation (accès essai conservé)
    await supabaseAdmin
      .from("companies")
      .update({
        subscription_status: "pending",
        plan_selected: true,
        pending_plan: plan.id,
        pending_since: new Date().toISOString(),
      })
      .eq("id", companyId);

    return {
      manual: true as const,
      planId: plan.id,
      amount: plan.price,
      contactOnly: plan.price === null,
    };
  });

// ------------------------------------------------------------
// Lancer un paiement en ligne (PayDunya — mobile money)
// Inerte tant que les clés PAYDUNYA_* ne sont pas dans .env :
// renvoie une erreur claire au lieu de planter.
// ------------------------------------------------------------
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ planId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { companyId, isAdmin } = await requireCompany(context.userId);
    if (!isAdmin) throw new Error("Accès refusé");
    if (!isPlanId(data.planId)) throw new Error("Formule inconnue");
    const plan = PLANS[data.planId as PlanId];
    if (plan.price === null)
      throw new Error(
        "La formule Entreprise est sur devis : contactez-nous pour l'activer.",
      );
    if (plan.price === 0) throw new Error("Cette formule ne se paie pas.");

    const master = process.env.PAYDUNYA_MASTER_KEY;
    const priv = process.env.PAYDUNYA_PRIVATE_KEY;
    const token = process.env.PAYDUNYA_TOKEN;
    if (!master || !priv || !token)
      throw new Error(
        "Le paiement en ligne n'est pas encore activé. Contactez ORUS TRANSIT pour régler par Wave ou Orange Money.",
      );

    const mode = process.env.PAYDUNYA_MODE === "live" ? "live" : "test";
    const base =
      mode === "live"
        ? "https://app.paydunya.com/api/v1"
        : "https://app.paydunya.com/sandbox-api/v1";
    const origin = process.env.PUBLIC_APP_URL || "";

    const res = await fetch(`${base}/checkout-invoice/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": master,
        "PAYDUNYA-PRIVATE-KEY": priv,
        "PAYDUNYA-TOKEN": token,
      },
      body: JSON.stringify({
        invoice: {
          total_amount: plan.price,
          description: `Abonnement ORUS TRANSIT — formule ${plan.name}`,
        },
        store: { name: "ORUS TRANSIT" },
        actions: {
          return_url: `${origin}/abonnement?paiement=retour`,
          cancel_url: `${origin}/abonnement?paiement=annule`,
        },
        custom_data: { company_id: companyId, plan: plan.id },
      }),
    });
    const json = (await res.json()) as {
      response_code?: string;
      response_text?: string;
      token?: string;
    };
    if (json.response_code !== "00" || !json.token)
      throw new Error(
        json.response_text || "Impossible d'initier le paiement. Réessayez.",
      );

    // Trace du paiement en attente
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin.from("payments").insert({
      company_id: companyId,
      plan: plan.id,
      amount: plan.price,
      provider: "paydunya",
      provider_ref: json.token,
      status: "pending",
      created_by: context.userId,
    });

    return { url: json.response_text as string, token: json.token };
  });

// ------------------------------------------------------------
// Confirmer un paiement au retour PayDunya et activer la formule
// ------------------------------------------------------------
export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, companyId, isAdmin } = await requireCompany(
      context.userId,
    );
    if (!isAdmin) throw new Error("Accès refusé");

    const master = process.env.PAYDUNYA_MASTER_KEY;
    const priv = process.env.PAYDUNYA_PRIVATE_KEY;
    const tok = process.env.PAYDUNYA_TOKEN;
    if (!master || !priv || !tok)
      throw new Error("Paiement en ligne non configuré.");

    const mode = process.env.PAYDUNYA_MODE === "live" ? "live" : "test";
    const base =
      mode === "live"
        ? "https://app.paydunya.com/api/v1"
        : "https://app.paydunya.com/sandbox-api/v1";

    const res = await fetch(
      `${base}/checkout-invoice/confirm/${data.token}`,
      {
        headers: {
          "PAYDUNYA-MASTER-KEY": master,
          "PAYDUNYA-PRIVATE-KEY": priv,
          "PAYDUNYA-TOKEN": tok,
        },
      },
    );
    const json = (await res.json()) as {
      status?: string;
      custom_data?: { company_id?: string; plan?: string };
    };
    if (json.status !== "completed")
      return { ok: false, status: json.status ?? "pending" };

    // Sécurité : le paiement doit concerner CE cabinet.
    if (json.custom_data?.company_id && json.custom_data.company_id !== companyId)
      throw new Error("Paiement associé à un autre cabinet.");
    const planId = isPlanId(json.custom_data?.plan ?? "")
      ? (json.custom_data!.plan as PlanId)
      : null;
    if (!planId) throw new Error("Formule du paiement introuvable.");

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabaseAdmin
      .from("companies")
      .update({
        subscription_plan: planId,
        subscription_status: "active",
        current_period_end: periodEnd.toISOString(),
      })
      .eq("id", companyId);

    await supabaseAdmin
      .from("payments")
      .update({
        status: "completed",
        period_start: new Date().toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .eq("provider_ref", data.token);

    return { ok: true, planId };
  });

// ------------------------------------------------------------
// Changement manuel de formule (encaissement hors-ligne / super-admin)
// Utile pour Wave/Orange Money en direct, ou pour tester.
// ------------------------------------------------------------
export const setCompanyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ planId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, companyId, isSuperAdmin } = await requireCompany(
      context.userId,
    );
    if (!isSuperAdmin)
      throw new Error("Réservé à l'administrateur ORUS TRANSIT.");
    if (!isPlanId(data.planId)) throw new Error("Formule inconnue");
    const plan = PLANS[data.planId as PlanId];

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabaseAdmin
      .from("companies")
      .update({
        subscription_plan: plan.id,
        subscription_status: plan.id === "trial" ? "trialing" : "active",
        current_period_end:
          plan.id === "trial" ? null : periodEnd.toISOString(),
      })
      .eq("id", companyId);

    if (plan.price && plan.price > 0)
      await supabaseAdmin.from("payments").insert({
        company_id: companyId,
        plan: plan.id,
        amount: plan.price,
        provider: "manuel",
        status: "completed",
        period_start: new Date().toISOString(),
        period_end: periodEnd.toISOString(),
        created_by: context.userId,
      });

    return { ok: true, planId: plan.id };
  });

// ============================================================
// PLATEFORME SUPER-ADMIN (propriétaire ORUS TRANSIT)
// ============================================================

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

// Liste tous les cabinets avec leur abonnement (pour la plateforme admin).
export const adminListCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await requireSuperAdmin(context.userId);

    const { data: companies } = await supabaseAdmin
      .from("companies")
      .select(
        "id, name, email, subscription_plan, subscription_status, pending_plan, pending_since, current_period_end, created_at",
      )
      .order("created_at", { ascending: false });

    const list = companies ?? [];

    // Nombre d'utilisateurs par cabinet
    const counts = new Map<string, number>();
    if (list.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("company_id")
        .in(
          "company_id",
          list.map((c: { id: string }) => c.id),
        );
      for (const p of profs ?? []) {
        const id = (p as { company_id: string }).company_id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    return list.map((c: { id: string }) => ({
      ...c,
      users: counts.get(c.id) ?? 0,
    }));
  });

// Attribue / valide une formule pour un cabinet donné.
export const adminSetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({ companyId: z.string().uuid(), planId: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requireSuperAdmin(context.userId);
    if (!isPlanId(data.planId)) throw new Error("Formule inconnue");
    const plan = PLANS[data.planId as PlanId];

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const paid = plan.id !== "trial";

    await supabaseAdmin
      .from("companies")
      .update({
        subscription_plan: plan.id,
        subscription_status: paid ? "active" : "trialing",
        current_period_end: paid ? periodEnd.toISOString() : null,
        plan_selected: true,
        pending_plan: null,
        pending_since: null,
      })
      .eq("id", data.companyId);

    if (plan.price && plan.price > 0)
      await supabaseAdmin.from("payments").insert({
        company_id: data.companyId,
        plan: plan.id,
        amount: plan.price,
        provider: "manuel",
        status: "completed",
        period_start: new Date().toISOString(),
        period_end: periodEnd.toISOString(),
        created_by: context.userId,
      });

    // Email d'activation au responsable du cabinet (formules payantes).
    if (plan.price && plan.price > 0) {
      try {
        const { data: adminRoles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("company_id", data.companyId)
          .eq("role", "company_admin")
          .limit(1);
        let email: string | null = null;
        const adminId = adminRoles?.[0]?.user_id;
        if (adminId) {
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("id", adminId)
            .maybeSingle();
          email = prof?.email ?? null;
        }
        if (!email) {
          const { data: comp } = await supabaseAdmin
            .from("companies")
            .select("email")
            .eq("id", data.companyId)
            .maybeSingle();
          email = comp?.email ?? null;
        }
        if (email) {
          const { sendEmail, activationEmailHtml } = await import(
            "@/lib/email.server"
          );
          const appUrl = `${process.env.PUBLIC_APP_URL || ""}/dashboard`;
          await sendEmail({
            to: email,
            subject: `Votre abonnement ${plan.name} est activé`,
            html: activationEmailHtml({ planName: plan.name, appUrl }),
          });
        }
      } catch (e) {
        console.error("[abonnement] email d'activation:", e);
      }
    }

    return { ok: true, planId: plan.id };
  });

// Indique au client courant s'il est super-admin (pour afficher le lien Admin).
export const amISuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "super_admin");
    return { superAdmin: !!roles && roles.length > 0 };
  });
