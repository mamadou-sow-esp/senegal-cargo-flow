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
// Lancer un paiement en ligne — Kivvi Pay (encaisse par Wave sans
// qu'ORUS TRANSIT ait besoin d'un compte Wave Business / NINEA / RCCM).
// Inerte tant que KIVVI_SECRET_KEY n'est pas dans l'environnement.
//
// L'activation réelle se fait via le webhook Kivvi
// (src/routes/api.webhooks.kivvi.ts), pas au retour du navigateur :
// c'est ce qui rend le paiement "automatique" même si le client ferme
// l'onglet avant de revenir sur success_url.
// ------------------------------------------------------------
const KIVVI_BASE = "https://kivvi.tech/api/v1";

function kivviHeaders() {
  const key = process.env.KIVVI_SECRET_KEY;
  if (!key) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

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

    const headers = kivviHeaders();
    if (!headers)
      throw new Error(
        "Le paiement en ligne n'est pas encore activé. Contactez ORUS TRANSIT.",
      );

    const origin = process.env.PUBLIC_APP_URL || "";
    // Référence unique par tentative : si le client double-clique, Kivvi
    // renvoie le paiement déjà créé pour cette même reference au lieu
    // d'en ouvrir un second.
    const reference = `sub-${companyId}-${plan.id}-${Date.now()}`;

    const res = await fetch(`${KIVVI_BASE}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        amount: plan.price,
        currency: "XOF",
        reference,
        description: `Abonnement ORUS TRANSIT, formule ${plan.name}`,
        success_url: `${origin}/abonnement?paiement=retour`,
        error_url: `${origin}/abonnement?paiement=annule`,
        metadata: {
          company_id: companyId,
          plan: plan.id,
          user_id: context.userId,
        },
      }),
    });
    const json = (await res.json()) as {
      id?: string;
      payment_url?: string;
      error?: { type?: string; code?: string; message?: string };
    };
    if (!res.ok || !json.id || !json.payment_url)
      throw new Error(
        json.error?.message || "Impossible d'initier le paiement. Réessayez.",
      );

    // Trace du paiement en attente. L'activation se fera au webhook
    // `payment.completed` (voir src/routes/api.webhooks.kivvi.ts).
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin.from("payments").insert({
      company_id: companyId,
      plan: plan.id,
      amount: plan.price,
      provider: "kivvi",
      provider_ref: json.id,
      status: "pending",
      created_by: context.userId,
    });

    return { url: json.payment_url, token: json.id };
  });

// ------------------------------------------------------------
// Vérification manuelle de secours (au retour du navigateur sur
// success_url). Le webhook est la source de vérité ; cette fonction
// sert juste à rafraîchir l'écran immédiatement si le webhook est
// déjà passé, sans jamais faire confiance à la seule redirection.
// ------------------------------------------------------------
export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, companyId, isAdmin } = await requireCompany(
      context.userId,
    );
    if (!isAdmin) throw new Error("Accès refusé");

    const headers = kivviHeaders();
    if (!headers) throw new Error("Paiement en ligne non configuré.");

    const res = await fetch(
      `${KIVVI_BASE}/payments/${encodeURIComponent(data.token)}`,
      { headers },
    );
    const json = (await res.json()) as {
      id?: string;
      status?: "pending" | "completed" | "failed" | "expired";
      metadata?: { company_id?: string; plan?: string } | null;
    };
    if (!res.ok || !json.id) return { ok: false, status: "pending" as const };

    if (json.status !== "completed")
      return { ok: false, status: json.status ?? "pending" };

    // Sécurité : le paiement doit concerner CE cabinet.
    if (
      json.metadata?.company_id &&
      json.metadata.company_id !== companyId
    )
      throw new Error("Paiement associé à un autre cabinet.");
    const planId = isPlanId(json.metadata?.plan ?? "")
      ? (json.metadata!.plan as PlanId)
      : null;
    if (!planId) throw new Error("Formule du paiement introuvable.");

    // Le webhook a probablement déjà tout activé ; on relit l'état actuel
    // plutôt que d'écraser current_period_end une seconde fois.
    const { data: comp } = await supabaseAdmin
      .from("companies")
      .select("subscription_status")
      .eq("id", companyId)
      .maybeSingle();

    if (comp?.subscription_status !== "active") {
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
    }

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
