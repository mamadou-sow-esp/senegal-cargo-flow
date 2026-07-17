import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlan } from "@/lib/plans";

const Input = z.object({
  to: z.string().min(6).max(20),
  message: z.string().min(1).max(480),
  shipmentId: z.string().uuid().optional(),
});

export const sendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    // Tables récentes non typées : cast souple.
    const sb = (context as { supabase: unknown }).supabase as {
      from: (t: string) => any;
    };
    const userId = (context as { userId: string }).userId;

    // 1) Cabinet + plan
    const { data: prof } = await sb
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();
    const companyId = prof?.company_id;
    if (!companyId) throw new Error("Aucune entreprise associée à ce compte.");

    const { data: comp } = await sb
      .from("companies")
      .select("subscription_plan")
      .eq("id", companyId)
      .single();
    const plan = getPlan(comp?.subscription_plan);
    if (plan.smsQuota <= 0)
      throw new Error(
        `Les notifications SMS ne sont pas incluses dans la formule ${plan.name}. Passez à la formule Cabinet pour les activer.`,
      );

    // 2) Quota du mois en cours
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const { count } = await sb
      .from("sms_log")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "sent")
      .gte("created_at", start.toISOString());
    if ((count ?? 0) >= plan.smsQuota)
      throw new Error(
        `Quota mensuel de ${plan.smsQuota} SMS atteint. Rechargez ou passez à une formule supérieure pour continuer.`,
      );

    // 3) Envoi via Africa's Talking
    const apiKey = process.env.AT_API_KEY;
    const username = process.env.AT_USERNAME;
    if (!apiKey || !username)
      throw new Error(
        "Service SMS non configuré (clés Africa's Talking manquantes).",
      );

    const sandbox = username === "sandbox" || process.env.AT_SANDBOX === "true";
    const url = sandbox
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";

    const form = new URLSearchParams({
      username,
      to: data.to,
      message: data.message,
    });
    const senderId = process.env.AT_SENDER_ID;
    if (senderId) form.set("from", senderId);

    let status = "sent";
    let error: string | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form.toString(),
      });
      const bodyText = await res.text();
      console.error(
        `[AT] status=${res.status} username=${username} endpoint=${sandbox ? "sandbox" : "live"} body=${bodyText}`,
      );
      let json: any = {};
      try {
        json = JSON.parse(bodyText);
      } catch {
        // réponse non-JSON (souvent le cas des erreurs d'auth)
      }
      const r0 = json?.SMSMessageData?.Recipients?.[0];
      if (!res.ok || !r0 || (r0.status && r0.status !== "Success")) {
        status = "failed";
        error =
          r0?.status ||
          json?.SMSMessageData?.Message ||
          bodyText.slice(0, 200) ||
          `Erreur HTTP ${res.status}`;
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : "Erreur réseau";
    }

    // 4) Journalisation (compteur + audit)
    await sb.from("sms_log").insert({
      company_id: companyId,
      shipment_id: data.shipmentId ?? null,
      recipient: data.to,
      message: data.message,
      status,
      error,
      created_by: userId,
    });

    if (status === "failed")
      throw new Error(`Échec de l'envoi SMS : ${error ?? "inconnu"}`);
    return { ok: true };
  });
