import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  companyName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
});

export const createCompanyAndAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    // Check if user already has a company
    const { data: existing } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    if (existing?.company_id) return { companyId: existing.company_id };

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Essai gratuit de 7 jours activé directement (aucun choix de formule).
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const { data: company, error: cErr } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.companyName,
        subscription_plan: "trial",
        subscription_status: "trialing",
        trial_ends_at: trialEnd.toISOString(),
        plan_selected: true,
      })
      .select("id")
      .single();
    if (cErr || !company) throw new Error(cErr?.message || "company insert failed");

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        company_id: company.id,
        full_name: data.fullName,
      });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "company_admin",
      company_id: company.id,
    });
    if (rErr) throw new Error(rErr.message);

    return { companyId: company.id };
  });
