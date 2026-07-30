// ============================================================
// Webhook GeniusPay — activation automatique de l'abonnement
// ------------------------------------------------------------
// GeniusPay appelle cette URL en POST à chaque événement de paiement.
// C'est ICI que se fait la validation "automatique" (pas au retour
// du navigateur, qui n'est qu'un confort d'affichage — voir
// confirmPayment dans src/lib/subscription.functions.ts).
//
// À configurer dans le dashboard GeniusPay :
//   Paramètres → Webhooks → Créer un webhook
//   URL   : https://<votre-domaine>/api/webhooks/geniuspay
//   Events: payment.success, payment.failed
// Le secret retourné à la création (whsec_...) va dans
// GENIUSPAY_WEBHOOK_SECRET (.env), jamais dans le code.
// ============================================================
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isPlanId, type PlanId } from "@/lib/plans";

interface GeniusPayWebhookPayload {
  id: string;
  event: string;
  timestamp: number;
  data: {
    reference: string;
    amount: number;
    status: string;
    metadata?: {
      company_id?: string;
      plan?: string;
      user_id?: string;
    };
  };
  environment: "sandbox" | "live";
}

function verifySignature(rawBody: string, timestamp: string, signature: string) {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  // Protection anti-rejeu : refuse tout webhook vieux de plus de 5 min.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/webhooks/geniuspay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Webhook-Signature") ?? "";
        const timestamp = request.headers.get("X-Webhook-Timestamp") ?? "";

        if (!signature || !timestamp || !verifySignature(rawBody, timestamp, signature)) {
          return Response.json(
            { status: 401, detail: "Invalid signature" },
            { status: 401 },
          );
        }

        let payload: GeniusPayWebhookPayload;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return Response.json({ status: 400, detail: "Invalid JSON" }, { status: 400 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // On journalise toujours la référence pour idempotence, même
        // si l'event n'est pas payment.success (failed, cancelled...).
        const reference = payload.data?.reference;
        if (!reference) {
          return Response.json({ received: true });
        }

        if (payload.event === "payment.failed" || payload.event === "payment.cancelled" || payload.event === "payment.expired") {
          await supabaseAdmin
            .from("payments")
            .update({ status: "failed" })
            .eq("provider_ref", reference)
            .eq("status", "pending");
          return Response.json({ received: true });
        }

        if (payload.event !== "payment.success") {
          // payment.initiated, cashout.*, webhook.test, etc. : rien à faire.
          return Response.json({ received: true });
        }

        const companyId = payload.data.metadata?.company_id;
        const planIdRaw = payload.data.metadata?.plan ?? "";
        if (!companyId || !isPlanId(planIdRaw)) {
          console.error("[geniuspay-webhook] metadata manquant", payload.data.metadata);
          return Response.json({ received: true });
        }
        const planId = planIdRaw as PlanId;

        // Idempotence : si ce paiement est déjà "completed", on ne
        // réactive rien (évite un double webhook de repousser la date).
        const { data: existing } = await supabaseAdmin
          .from("payments")
          .select("status")
          .eq("provider_ref", reference)
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
          .eq("provider_ref", reference);

        return Response.json({ received: true });
      },
    },
  },
});
