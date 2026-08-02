import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createCompanyAndAdmin } from "@/lib/onboarding.functions";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/newlogo.png";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const STEPS = [
  { label: "Cabinet" },
  { label: "Téléphone" },
  { label: "Adresse" },
];

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(createCompanyAndAdmin);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const mutation = useMutation({
    mutationFn: async () =>
      fn({ data: { companyName, fullName, phone, address } }),
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success("Espace ORUS TRANSIT prêt.");
      // Si l'utilisateur avait choisi le Pro à l'inscription, on l'emmène
      // directement au paiement (l'écran Abonnement lance le checkout
      // automatique Wave).
      let intent: string | null = null;
      try {
        intent = localStorage.getItem("orus_pay_intent");
      } catch {
        /* ignore */
      }
      if (intent !== "pro") {
        // Repli fiable (survit à un changement de navigateur) : métadonnées.
        const { data } = await supabase.auth.getUser();
        if (data.user?.user_metadata?.pay_intent === "pro") intent = "pro";
      }
      navigate({ to: intent === "pro" ? "/abonnement" : "/dashboard" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const step1Valid = companyName.trim().length >= 2 && fullName.trim().length >= 2;
  const step2Valid = phone.trim().length >= 6;
  const step3Valid = address.trim().length >= 4;

  const goNext = () => {
    if (step === 1 && !step1Valid) return;
    if (step === 2 && !step2Valid) return;
    setStep((s) => Math.min(3, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      goNext();
      return;
    }
    if (!step1Valid || !step2Valid || !step3Valid) return;
    mutation.mutate();
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-2.5">
        <img src={logoAsset} alt="ORUS TRANSIT" className="size-10 object-contain" />
        <span className="text-lg font-extrabold tracking-tighter">
          ORUS TRANSIT
        </span>
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">
        Configurez votre entreprise
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Étape {step} sur 3 avant d'accéder à votre poste de commande.
      </p>

      {/* Repères d'étapes */}
      <div className="mt-5 flex items-center gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const state = n === step ? "current" : n < step ? "done" : "todo";
          return (
            <div key={s.label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  state === "done"
                    ? "bg-hero-blue text-white"
                    : state === "current"
                      ? "border-2 border-hero-blue text-hero-blue"
                      : "border border-border text-muted-foreground"
                }`}
              >
                {n}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded-full ${
                    n < step ? "bg-hero-blue" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <form className="mt-6" onSubmit={handleSubmit}>
        <div className="min-h-[168px] space-y-4">
          {step === 1 && (
            <>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Nom du transitaire
                </span>
                <input
                  className="w-full rounded border border-input bg-white px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring sm:text-sm"
                  placeholder="Ex. Transit Dakar Pro"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoFocus
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Votre nom complet
                </span>
                <input
                  className="w-full rounded border border-input bg-white px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring sm:text-sm"
                  placeholder="Ex. Abdoulaye Diallo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </label>
            </>
          )}

          {step === 2 && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Numéro de téléphone
              </span>
              <input
                type="tel"
                className="w-full rounded border border-input bg-white px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring sm:text-sm"
                placeholder="Ex. 77 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
                required
              />
              <span className="mt-1.5 block text-xs text-muted-foreground">
                Utilisé pour les notifications importantes sur vos dossiers.
              </span>
            </label>
          )}

          {step === 3 && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Adresse
              </span>
              <input
                className="w-full rounded border border-input bg-white px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-ring sm:text-sm"
                placeholder="Ex. Cité Keur Gorgui, Dakar"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoFocus
                required
              />
            </label>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-white px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
            >
              <ArrowLeft className="size-3.5" /> Retour
            </button>
          )}
          {step < 3 ? (
            <button
              type="submit"
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded bg-primary py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Suivant <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={mutation.isPending || !step3Valid}
              className="flex-1 rounded bg-primary py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {mutation.isPending ? "…" : "Créer mon espace"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
