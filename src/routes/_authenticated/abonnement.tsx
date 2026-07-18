import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getSubscription, selectPlan } from "@/lib/subscription.functions";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { MANUAL_PAYMENT, WAVE_PLAN_LINKS } from "@/lib/billing";
import {
  PLANS,
  PAID_PLAN_ORDER,
  getPlan,
  priceLabel,
  formatFcfa,
  limitLabel,
  type PlanId,
} from "@/lib/plans";
import {
  Check,
  Crown,
  FolderKanban,
  MessageSquare,
  Sparkles,
  Clock,
} from "lucide-react";
import waveLogo from "@/assets/wave-logo.jpg";

export const Route = createFileRoute("/_authenticated/abonnement")({
  component: AbonnementPage,
});

const sora = { fontFamily: "var(--font-label)" };

function AbonnementPage() {
  const qc = useQueryClient();
  const getSub = useServerFn(getSubscription);
  const selectFn = useServerFn(selectPlan);
  const [pay, setPay] = useState<{ planId: PlanId; amount: number } | null>(
    null,
  );

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => getSub(),
  });

  // Arrivée depuis « Choisir Pro » à l'inscription → ouvre direct le paiement.
  useEffect(() => {
    void (async () => {
      let intent: string | null = null;
      try {
        intent = localStorage.getItem("orus_pay_intent");
        if (intent === "pro") localStorage.removeItem("orus_pay_intent");
      } catch {
        /* ignore */
      }
      if (intent !== "pro") {
        // Repli fiable : métadonnées du compte (survit au changement de navigateur).
        const { data } = await supabase.auth.getUser();
        if (data.user?.user_metadata?.pay_intent === "pro") {
          intent = "pro";
          // On consomme le flag pour ne pas rouvrir le paiement à chaque visite.
          await supabase.auth.updateUser({ data: { pay_intent: null } });
        }
      }
      if (intent === "pro") setPay({ planId: "pro", amount: PLANS.pro.price ?? 0 });
    })();
  }, []);

  // Ouvre simplement le panneau de paiement : rien n'est modifié tant que
  // l'utilisateur n'a pas confirmé son paiement (évite les misclics).
  const choose = (planId: PlanId) => {
    setPay({ planId, amount: PLANS[planId].price ?? 0 });
  };

  // Confirmé après paiement → passe la formule "en attente de validation".
  const confirmPaid = async () => {
    if (!pay) return;
    await selectFn({ data: { planId: pay.planId } });
    qc.invalidateQueries({ queryKey: ["subscription"] });
  };

  const current = getPlan(sub?.planId);
  const pendingPlan = sub?.pendingPlan
    ? PLANS[sub.pendingPlan as PlanId]
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-8">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Facturation
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight" style={sora}>
          Abonnement
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre formule et votre consommation.
        </p>
      </div>

      {/* Bandeau abonnement expiré / essai terminé */}
      {sub?.locked && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>
            {sub.status === "trialing"
              ? "Votre essai gratuit est terminé."
              : "Votre abonnement a expiré."}
          </strong>{" "}
          L'accès à votre espace est suspendu. Passez au mode Pro ci-dessous pour
          le réactiver immédiatement.
        </div>
      )}

      {/* Bandeau paiement en attente */}
      {sub?.status === "pending" && pendingPlan && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <Clock className="mt-0.5 size-5 shrink-0 text-orange-500" />
          <div className="text-sm text-orange-800">
            <strong>Formule {pendingPlan.name} en attente.</strong> Votre accès
            reste en essai jusqu'à la validation de votre paiement.{" "}
            <button
              onClick={() =>
                setPay({
                  planId: pendingPlan.id,
                  amount: pendingPlan.price ?? 0,
                })
              }
              className="font-semibold underline underline-offset-2"
            >
              Revoir les instructions de paiement
            </button>
          </div>
        </div>
      )}

      {/* Formule actuelle + usage */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Crown className="size-6 text-hero-blue" />
                <div>
                  <div className="text-lg font-extrabold" style={sora}>
                    Formule {current.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {current.price === null
                      ? "Sur devis"
                      : current.price === 0
                        ? "Gratuit"
                        : `${priceLabel(current)} / mois`}
                  </div>
                </div>
              </div>
              <StatusBadge status={sub?.status} />
            </div>

            {sub?.status === "trialing" && sub?.trialEndsAt && (
              <p className="text-xs text-muted-foreground">
                Essai jusqu'au{" "}
                <strong className="text-foreground">
                  {new Date(sub.trialEndsAt).toLocaleDateString("fr-FR")}
                </strong>
                .
              </p>
            )}
            {sub?.status === "active" && sub?.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Prochain renouvellement le{" "}
                <strong className="text-foreground">
                  {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
                </strong>
                .
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <UsageBar
                icon={FolderKanban}
                label="Dossiers actifs"
                used={sub?.usage.dossiers ?? 0}
                max={current.maxActiveDossiers}
              />
              <UsageBar
                icon={MessageSquare}
                label="SMS ce mois"
                used={sub?.usage.smsUsed ?? 0}
                max={current.smsQuota || null}
                disabled={current.smsQuota === 0}
              />
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Sparkles className="size-4 text-hero-blue" /> Assistant IA
                </div>
                <div className="mt-2 text-sm font-bold" style={sora}>
                  {current.aiPerDay === null
                    ? "Illimité"
                    : `${current.aiPerDay} / jour`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Choix de formule */}
      <div>
        <h2 className="text-lg font-extrabold tracking-tight" style={sora}>
          Passer au mode Pro
        </h2>
        <div className="mt-4 grid max-w-md gap-4">
          {PAID_PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const isCurrent = current.id === id;
            return (
              <div
                key={id}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                  p.highlight
                    ? "border-hero-blue bg-white ring-1 ring-hero-blue/30"
                    : "border-border bg-white"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-hero-blue px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                    Populaire
                  </span>
                )}
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {p.name}
                </div>
                <div className="mt-2 text-2xl font-extrabold" style={sora}>
                  {priceLabel(p)}
                  {p.price ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      {" "}
                      / mois
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <div className="rounded-xl border border-border bg-muted/50 py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Formule actuelle
                    </div>
                  ) : p.price === null ? (
                    <a
                      href={`mailto:${MANUAL_PAYMENT.contactEmail}?subject=Formule Entreprise`}
                      className="block rounded-xl border border-hero-blue py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-hero-blue hover:bg-hero-blue/5"
                    >
                      Nous contacter
                    </a>
                  ) : (
                    <button
                      onClick={() => choose(id)}
                      className="w-full rounded-xl bg-hero-blue py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90"
                    >
                      Passer à {p.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Paiement par Wave. Après paiement, l'activation est vérifiée puis
          validée sous 30 minutes maximum.
        </p>
      </div>

      {pay && (
        <PaymentModal
          planId={pay.planId}
          amount={pay.amount}
          onConfirm={confirmPaid}
          onClose={() => setPay(null)}
        />
      )}
    </div>
  );
}

function UsageBar({
  icon: Icon,
  label,
  used,
  max,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used: number;
  max: number | null;
  disabled?: boolean;
}) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="size-4 text-hero-blue" /> {label}
      </div>
      <div className="mt-2 text-sm font-bold" style={sora}>
        {disabled ? "Non inclus" : `${used} / ${limitLabel(max)}`}
      </div>
      {!disabled && max !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-hero-blue"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PaymentModal({
  planId,
  amount,
  onConfirm,
  onClose,
}: {
  planId: PlanId;
  amount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const plan = PLANS[planId];
  const waveLink = WAVE_PLAN_LINKS[planId];
  const [paid, setPaid] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const confirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
      setPaid(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setConfirming(false);
    }
  };

  if (paid) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100">
            <Clock className="size-7 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-xl font-extrabold" style={sora}>
            Paiement en cours de vérification
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            Nous vérifions votre paiement. L'activation intervient généralement{" "}
            <strong className="text-foreground">sous 30 minutes</strong>. Vous
            recevrez un <strong className="text-foreground">email</strong> avec le
            lien d'accès dès l'activation.
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-xl bg-hero-blue px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl">
        <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
          Paiement — formule {plan.name}
        </div>
        <h2 className="mt-1 text-xl font-extrabold" style={sora}>
          {formatFcfa(amount)} / mois
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Payez avec Wave en cliquant sur le bouton ci-dessous. Précisez le nom
          de votre cabinet si demandé.
        </p>

        {waveLink ? (
          <a
            href={waveLink}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2.5 rounded-xl bg-hero-blue py-3 text-center text-xs font-bold uppercase tracking-widest text-white hover:opacity-90"
          >
            <span className="grid size-6 place-items-center overflow-hidden rounded-md bg-white">
              <img src={waveLogo} alt="Wave" className="size-6 object-cover" />
            </span>
            Payer {formatFcfa(amount)} sur Wave
          </a>
        ) : (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Lien de paiement bientôt disponible. Écrivez-nous à{" "}
            <a
              href={`mailto:${MANUAL_PAYMENT.contactEmail}`}
              className="font-semibold underline"
            >
              {MANUAL_PAYMENT.contactEmail}
            </a>
            .
          </p>
        )}

        {MANUAL_PAYMENT.waveQrImage && (
          <div className="mt-4 flex justify-center">
            <img
              src={MANUAL_PAYMENT.waveQrImage}
              alt="QR code de paiement Wave"
              className="size-48 rounded-2xl border border-border bg-white object-contain p-2"
            />
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Bénéficiaire : </span>
          <strong>{MANUAL_PAYMENT.beneficiary}</strong>
        </div>

        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {MANUAL_PAYMENT.note}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Fermer
          </button>
          <button
            onClick={confirm}
            disabled={confirming}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-60"
          >
            {confirming ? "…" : "J'ai effectué le paiement"}
          </button>
        </div>
      </div>
    </div>
  );
}
