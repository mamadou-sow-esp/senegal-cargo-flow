import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getSubscription,
  createCheckout,
  confirmPayment,
} from "@/lib/subscription.functions";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { CONTACT_EMAIL } from "@/lib/billing";
import {
  PLANS,
  PAID_PLAN_ORDER,
  getPlan,
  priceLabel,
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

export const Route = createFileRoute("/_authenticated/abonnement")({
  component: AbonnementPage,
});

const sora = { fontFamily: "var(--font-label)" };

function AbonnementPage() {
  const qc = useQueryClient();
  const getSub = useServerFn(getSubscription);
  const checkoutFn = useServerFn(createCheckout);
  const confirmFn = useServerFn(confirmPayment);
  const [redirecting, setRedirecting] = useState<PlanId | null>(null);

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => getSub(),
  });

  // Arrivée depuis « Choisir Pro » à l'inscription → lance direct le paiement
  // automatique Wave (même chemin que le bouton "Passer à Pro").
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
      if (intent === "pro") void choose("pro");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retour depuis la page de checkout Wave (success_url). Le webhook
  // a normalement déjà activé l'abonnement ; on relit l'état pour affichage
  // immédiat, sans jamais se fier uniquement à cette redirection.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statutPaiement = params.get("paiement");
    if (!statutPaiement) return;

    window.history.replaceState(null, "", window.location.pathname);
    const ref = localStorage.getItem("orus_pay_ref");

    if (statutPaiement === "annule") {
      toast.info("Paiement annulé.");
      localStorage.removeItem("orus_pay_ref");
      return;
    }

    if (statutPaiement === "retour" && ref) {
      void (async () => {
        try {
          const res = await confirmFn({ data: { token: ref } });
          if (res.ok) {
            toast.success("Paiement confirmé, votre formule Pro est active !");
          } else {
            toast.info(
              "Paiement en cours de vérification, cela peut prendre quelques instants.",
            );
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erreur de vérification du paiement");
        } finally {
          localStorage.removeItem("orus_pay_ref");
          qc.invalidateQueries({ queryKey: ["subscription"] });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lance le paiement automatique via Kivvi Pay et redirige vers
  // payment_url (page de paiement Wave hébergée par Kivvi).
  const choose = async (planId: PlanId) => {
    setRedirecting(planId);
    try {
      const res = await checkoutFn({ data: { planId } });
      localStorage.setItem("orus_pay_ref", res.token);
      window.location.href = res.url;
    } catch (e) {
      setRedirecting(null);
      toast.error(
        e instanceof Error
          ? e.message
          : "Paiement en ligne indisponible pour le moment.",
      );
    }
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
              onClick={() => choose(pendingPlan.id)}
              disabled={redirecting === pendingPlan.id}
              className="font-semibold underline underline-offset-2"
            >
              {redirecting === pendingPlan.id ? "Redirection…" : "Reprendre le paiement"}
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
                      href={`mailto:${CONTACT_EMAIL}?subject=Formule Entreprise`}
                      className="block rounded-xl border border-hero-blue py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-hero-blue hover:bg-hero-blue/5"
                    >
                      Nous contacter
                    </a>
                  ) : (
                    <button
                      onClick={() => choose(id)}
                      disabled={redirecting === id}
                      className="w-full rounded-xl bg-hero-blue py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {redirecting === id ? "Redirection…" : `Passer à ${p.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Paiement sécurisé par Wave. Activation automatique dès la
          confirmation du paiement.
        </p>
      </div>
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
