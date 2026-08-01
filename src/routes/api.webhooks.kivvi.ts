// ============================================================
// Webhook Kivvi Pay — activation automatique de l'abonnement
// ------------------------------------------------------------
// Kivvi appelle cette URL en POST à chaque événement de paiement.
// C'est ICI que se fait la validation "automatique" (pas au retour
// du navigateur, qui n'est qu'un confort d'affichage — voir
// confirmPayment dans src/lib/subscription.functions.ts).
//
// À configurer dans l'espace développeur Kivvi :
//   URL   : https://<votre-domaine>/api/webhooks/kivvi
//   Events: payment.completed, payment.failed
// Le secret affiché à la création du webhook va dans
// KIVVI_WEBHOOK_SECRET (variables d'env Vercel), jamais dans le code.
// ============================================================
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isPlanId, type PlanId } from "@/lib/plans";

interface KivviWebhookPayload {
  event: string;
  created_at: string;
  data: {
    id: string; // "pay_..."
    status: "pending" | "completed" | "failed" | "expired";
    amount: number;
    currency: string;
    reference?: string;
    mode: "test" | "live";
    paid_at?: string | null;
    metadata?: {
      company_id?: string;
      plan?: string;
      user_id?: string;
    } | null;
  };
}

// Format Kivvi : "Kivvi-Signature: t={timestamp},v1={signature}"
// signature = HMAC-SHA256(secret, timestamp + corps brut de la requête).
function verifySignature(rawBody: string, header: string) {
  const secret = process.env.KIVVI_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim() ?? ""];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Protection anti-rejeu : refuse tout webhook vieux de plus de 5 min.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/webhooks/kivvi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("Kivvi-Signature") ?? "";

        if (!verifySignature(rawBody, signature)) {
          return Response.json(
            { status: 401, detail: "Invalid signature" },
            { status: 401 },
          );
        }

        let payload: KivviWebhookPayload;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return Response.json({ status: 400, detail: "Invalid JSON" }, { status: 400 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const paymentId = payload.data?.id;
        if (!paymentId) return Response.json({ received: true });

        if (payload.event === "payment.failed") {
          await supabaseAdmin
            .from("payments")
            .update({ status: "failed" })
            .eq("provider_ref", paymentId)
            .eq("status", "pending");
          return Response.json({ received: true });
        }

        if (payload.event !== "payment.completed" || payload.data.status !== "completed") {
          // événements de test, etc. : rien à faire.
          return Response.json({ received: true });
        }

        const companyId = payload.data.metadata?.company_id;
        const planIdRaw = payload.data.metadata?.plan ?? "";
        if (!companyId || !isPlanId(planIdRaw)) {
          console.error("[kivvi-webhook] metadata manquant", payload.data.metadata);
          return Response.json({ received: true });
        }
        const planId = planIdRaw as PlanId;

        // Idempotence : si ce paiement est déjà "completed", on ne
        // réactive rien (évite un double webhook de repousser la date).
        const { data: existing } = await supabaseAdmin
          .from("payments")
          .select("status")
          .eq("provider_ref", paymentId)
          .maybeSingle();
        if (existing?.status === "completed") {
          return Response.json({ received: true });
        }

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
          .eq("provider_ref", paymentId);

        return Response.json({ received: true });
      },
    },
  },
});
