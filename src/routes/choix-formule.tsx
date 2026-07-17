import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { selectPlan } from "@/lib/subscription.functions";
import { MANUAL_PAYMENT, WAVE_PLAN_LINKS } from "@/lib/billing";
import {
  PLANS,
  PLAN_ORDER,
  priceLabel,
  formatFcfa,
  type PlanId,
} from "@/lib/plans";
import { Check, LogOut, Clock } from "lucide-react";
import logoAsset from "@/assets/newlogo.png";
import waveLogo from "@/assets/wave-logo.jpg";

export const Route = createFileRoute("/choix-formule")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, companies(plan_selected)")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile?.company_id) throw redirect({ to: "/onboarding" });
    const selected = (
      profile.companies as { plan_selected?: boolean } | null
    )?.plan_selected;
    if (selected) throw redirect({ to: "/dashboard" });
  },
  component: ChoixFormule,
});

const sora = { fontFamily: "var(--font-label)" };

function ChoixFormule() {
  const navigate = useNavigate();
  const select = useServerFn(selectPlan);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [paying, setPaying] = useState<{ planId: PlanId; amount: number } | null>(
    null,
  );
  const [verifying, setVerifying] = useState(false);

  const [confirming, setConfirming] = useState(false);

  // Choix d'une formule : n'ACTIVE rien (sauf l'essai gratuit).
  // Pour une formule payante, on ouvre juste le panneau de paiement.
  const choose = async (planId: PlanId) => {
    if (planId === "trial") {
      setBusy("trial");
      try {
        await select({ data: { planId: "trial" } });
        toast.success("Essai activé — bienvenue !");
        navigate({ to: "/dashboard" });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      } finally {
        setBusy(null);
      }
      return;
    }
    setPaying({ planId, amount: PLANS[planId].price ?? 0 });
  };

  // Confirmé APRÈS paiement : c'est seulement ici que l'abonnement passe
  // "en attente de validation" (évite les changements sur simple misclic).
  const confirmPaid = async () => {
    if (!paying) return;
    setConfirming(true);
    try {
      await select({ data: { planId: paying.planId } });
      setVerifying(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setConfirming(false);
    }
  };

  // Entreprise : on marque l'intérêt (en attente) et on entre en essai.
  const contactContinue = async () => {
    if (!paying) return;
    try {
      await select({ data: { planId: paying.planId } });
    } catch {
      /* on entre quand même en essai */
    }
    navigate({ to: "/dashboard" });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-[1100px] items-center justify-between px-4 sm:px-8">
          <img
            src={logoAsset}
            alt="ORUS TRANSIT"
            className="h-14 w-auto object-contain"
          />
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-4 py-12 sm:px-8 sm:py-16">
        {verifying ? (
          <VerificationScreen onContinue={() => navigate({ to: "/dashboard" })} />
        ) : paying ? (
          <PaymentPanel
            planId={paying.planId}
            amount={paying.amount}
            busy={confirming}
            onPaid={confirmPaid}
            onContinue={contactContinue}
            onBack={() => setPaying(null)}
          />
        ) : (
          <>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
                Bienvenue
              </p>
              <h1
                className="mt-3 text-3xl font-extrabold tracking-tighter sm:text-4xl"
                style={sora}
              >
                Choisissez votre formule
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Démarrez gratuitement 14 jours, ou choisissez directement une
                formule payante (activée après paiement mobile money).
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {PLAN_ORDER.map((id) => {
                const p = PLANS[id];
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
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.price ? "par mois" : id === "trial" ? "14 jours" : " "}
                    </div>
                    <ul className="mt-4 flex-1 space-y-2 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                          <span className="text-foreground/80">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => choose(id)}
                      disabled={busy === id}
                      className={`mt-6 w-full rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-widest disabled:opacity-60 ${
                        p.highlight
                          ? "bg-hero-blue text-white hover:opacity-90"
                          : "border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {busy === id
                        ? "…"
                        : id === "trial"
                          ? "Commencer l'essai"
                          : id === "entreprise"
                            ? "Nous contacter"
                            : "Choisir"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PaymentPanel({
  planId,
  amount,
  busy,
  onPaid,
  onContinue,
  onBack,
}: {
  planId: PlanId;
  amount: number;
  busy: boolean;
  onPaid: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const plan = PLANS[planId];
  const isEnterprise = planId === "entreprise";
  const waveLink = WAVE_PLAN_LINKS[planId];

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-8 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-widest text-hero-blue">
        {isEnterprise ? "Formule Entreprise" : "Paiement"}
      </div>
      <h2 className="mt-1 text-2xl font-extrabold" style={sora}>
        {isEnterprise
          ? "Nous vous recontactons"
          : `Activez la formule ${plan.name}`}
      </h2>

      {isEnterprise ? (
        <p className="mt-3 text-sm text-muted-foreground">
          La formule Entreprise est sur devis. Écrivez-nous à{" "}
          <a
            href={`mailto:${MANUAL_PAYMENT.contactEmail}`}
            className="font-semibold text-hero-blue underline underline-offset-4"
          >
            {MANUAL_PAYMENT.contactEmail}
          </a>{" "}
          et nous préparons votre accès. En attendant, votre essai reste actif.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Cliquez pour payer{" "}
            <strong className="text-foreground">{formatFcfa(amount)}</strong>{" "}
            avec Wave. Précisez le nom de votre cabinet si demandé.
          </p>

          {waveLink ? (
            <a
              href={waveLink}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center justify-center gap-2.5 rounded-xl bg-hero-blue py-3 text-center text-xs font-bold uppercase tracking-widest text-white hover:opacity-90"
            >
              <span className="grid size-6 place-items-center overflow-hidden rounded-md bg-white">
                <img src={waveLogo} alt="Wave" className="size-6 object-cover" />
              </span>
              Payer {formatFcfa(amount)} sur Wave
            </a>
          ) : (
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
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
                className="size-52 rounded-2xl border border-border bg-white object-contain p-2"
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
        </>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Retour
        </button>
        {isEnterprise ? (
          <button
            onClick={onContinue}
            className="rounded-xl bg-hero-blue px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90"
          >
            Continuer vers l'app
          </button>
        ) : (
          <button
            onClick={onPaid}
            disabled={busy}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "…" : "J'ai effectué le paiement"}
          </button>
        )}
      </div>
    </div>
  );
}

function VerificationScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100">
        <Clock className="size-7 text-emerald-600" />
      </div>
      <h2 className="mt-5 text-2xl font-extrabold" style={sora}>
        Paiement en cours de vérification
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
        Merci ! Nous vérifions votre paiement. L'activation intervient
        généralement <strong className="text-foreground">sous 30 minutes</strong>
        . Vous recevrez un <strong className="text-foreground">email</strong> avec
        le lien d'accès dès que votre formule est activée.
      </p>
      <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
        En attendant, vous pouvez déjà utiliser votre espace en mode essai.
      </p>
      <button
        onClick={onContinue}
        className="mt-6 rounded-xl bg-hero-blue px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:opacity-90"
      >
        Continuer vers le tableau de bord
      </button>
    </div>
  );
}

function PayLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}
