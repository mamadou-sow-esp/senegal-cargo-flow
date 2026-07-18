import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlan } from "@/lib/plans";

const roleEnum = z.enum(["company_admin", "employee", "client"]);

async function requireAdminContext(userId: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data: profile, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile?.company_id) throw new Error("Aucune entreprise associée");

  const { data: roles, error: rErr } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("company_id", profile.company_id);
  if (rErr) throw new Error(rErr.message);
  const isAdmin = (roles ?? []).some(
    (r) => r.role === "company_admin" || r.role === "super_admin",
  );
  return { supabaseAdmin, companyId: profile.company_id, isAdmin };
}

/** Renvoie la formule active d'un cabinet. */
async function companyPlan(
  supabaseAdmin: { from: (t: string) => any },
  companyId: string,
) {
  const { data } = await supabaseAdmin
    .from("companies")
    .select("subscription_plan")
    .eq("id", companyId)
    .maybeSingle();
  return getPlan((data as { subscription_plan?: string } | null)?.subscription_plan);
}

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin, companyId } = await requireAdminContext(
      context.userId,
    );

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, job_title, avatar_url, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = ids.length
      ? await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .eq("company_id", companyId)
          .in("user_id", ids)
      : { data: [] as { user_id: string; role: string }[] };

    const byUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r.role);
      byUser.set(r.user_id, list);
    }

    return (profiles ?? []).map((p) => ({
      ...p,
      roles: byUser.get(p.id) ?? [],
    }));
  });

export const inviteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        email: z.string().trim().email(),
        fullName: z.string().trim().min(2).max(120),
        jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
        role: roleEnum,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, companyId, isAdmin } = await requireAdminContext(
      context.userId,
    );
    if (!isAdmin) throw new Error("Accès refusé");

    // Try to find existing user by email via listUsers filter
    const { data: existing, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw new Error(listErr.message);
    let userId = existing.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    )?.id;

    // Limite d'utilisateurs selon la formule (on ne compte pas un membre déjà présent).
    const plan = await companyPlan(supabaseAdmin, companyId);
    if (plan.maxUsers !== null) {
      const alreadyMember =
        !!userId &&
        !!(
          await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .eq("company_id", companyId)
            .maybeSingle()
        ).data;
      if (!alreadyMember) {
        const { count } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId);
        if ((count ?? 0) >= plan.maxUsers)
          throw new Error(
            `Votre formule ${plan.name} est limitée à ${plan.maxUsers} utilisateur${plan.maxUsers > 1 ? "s" : ""}. Passez à une formule supérieure pour ajouter des membres.`,
          );
      }
    }

    if (!userId) {
      const { data: created, error: cErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
          data: { full_name: data.fullName },
        });
      if (cErr || !created.user) throw new Error(cErr?.message || "Invitation échouée");
      userId = created.user.id;
    }

    const { error: upErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      company_id: companyId,
      full_name: data.fullName,
      email: data.email,
      job_title: data.jobTitle || null,
      phone: data.phone || null,
    });
    if (upErr) throw new Error(upErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, company_id: companyId, role: data.role },
        { onConflict: "user_id,role,company_id" },
      );
    if (rErr) throw new Error(rErr.message);

    return { ok: true, userId };
  });

// Invite un client importateur à accéder à son portail.
export const inviteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        clientId: z.string().uuid(),
        email: z.string().trim().email(),
        fullName: z.string().trim().max(120).optional().or(z.literal("")),
        redirectTo: z.string().url(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, companyId, isAdmin } = await requireAdminContext(
      context.userId,
    );
    if (!isAdmin) throw new Error("Accès refusé");

    const plan = await companyPlan(supabaseAdmin, companyId);
    if (!plan.clientPortal)
      throw new Error(
        `Le portail client n'est pas inclus dans la formule ${plan.name}. Passez à la formule Cabinet pour inviter vos clients.`,
      );

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, company_id, name")
      .eq("id", data.clientId)
      .maybeSingle();
    if (!client || client.company_id !== companyId)
      throw new Error("Client introuvable");

    // Nom du cabinet pour personnaliser l'email.
    const { data: comp } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle();
    const cabinetName = comp?.name || "Votre transitaire";

    const { data: existing, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw new Error(listErr.message);
    const found = existing.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );

    // On GÉNÈRE le lien (sans passer par l'email Supabase), puis on l'envoie
    // nous-mêmes via l'API Resend (email au design maison).
    let userId: string;
    let actionLink: string;
    if (found) {
      userId = found.id;
      const { data: gen, error: gErr } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: data.email,
          options: { redirectTo: data.redirectTo },
        });
      if (gErr || !gen?.properties?.action_link)
        throw new Error(gErr?.message || "Lien non généré");
      actionLink = gen.properties.action_link;
    } else {
      const { data: gen, error: gErr } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email: data.email,
          options: {
            redirectTo: data.redirectTo,
            data: { full_name: data.fullName || client.name, role: "client" },
          },
        });
      if (gErr || !gen?.user || !gen?.properties?.action_link)
        throw new Error(gErr?.message || "Lien non généré");
      userId = gen.user.id;
      actionLink = gen.properties.action_link;
    }

    // Profil sans company_id (le client n'est pas un membre du cabinet).
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.fullName || client.name,
      email: data.email,
    });

    // Lie la fiche client au compte.
    const { error: linkErr } = await supabaseAdmin
      .from("clients")
      .update({ user_id: userId })
      .eq("id", data.clientId);
    if (linkErr) throw new Error(linkErr.message);

    // Envoi de l'email d'invitation via Resend.
    const { sendEmail, inviteClientEmailHtml } = await import(
      "@/lib/email.server"
    );
    const res = await sendEmail({
      to: data.email,
      subject: `${cabinetName} vous invite sur votre portail ORUS TRANSIT`,
      html: inviteClientEmailHtml({
        clientName: data.fullName || client.name,
        cabinetName,
        actionLink,
      }),
    });

    // sent=false si Resend n'est pas configuré → le front proposera le lien.
    return { ok: true, sent: res.sent, actionLink };
  });

export const updateEmployeeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z.object({ userId: z.string().uuid(), role: roleEnum }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, companyId, isAdmin } = await requireAdminContext(
      context.userId,
    );
    if (!isAdmin) throw new Error("Accès refusé");
    if (data.userId === context.userId)
      throw new Error("Vous ne pouvez pas modifier votre propre rôle");

    const { error: dErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("company_id", companyId);
    if (dErr) throw new Error(dErr.message);

    const { error: iErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, company_id: companyId, role: data.role });
    if (iErr) throw new Error(iErr.message);
    return { ok: true };
  });

export const removeEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, companyId, isAdmin } = await requireAdminContext(
      context.userId,
    );
    if (!isAdmin) throw new Error("Accès refusé");
    if (data.userId === context.userId)
      throw new Error("Vous ne pouvez pas vous retirer vous-même");

    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("company_id", companyId);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ company_id: null })
      .eq("id", data.userId)
      .eq("company_id", companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
