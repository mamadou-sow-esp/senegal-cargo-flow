import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCompanyAndAdmin } from "@/lib/onboarding.functions";
import logoAsset from "@/assets/newlogo.png";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(createCompanyAndAdmin);
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");

  const mutation = useMutation({
    mutationFn: async () =>
      fn({ data: { companyName, fullName } }),
    onSuccess: async () => {
      await qc.invalidateQueries();
      toast.success("Espace ORUS TRANSIT prêt.");
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

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
        Une seule étape avant d'accéder à votre poste de commande.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!companyName.trim() || !fullName.trim()) return;
          mutation.mutate();
        }}
      >
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Nom du transitaire
          </span>
          <input
            className="w-full rounded border border-input bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
            placeholder="Ex. Transit Dakar Pro"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Votre nom complet
          </span>
          <input
            className="w-full rounded border border-input bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring"
            placeholder="Ex. Abdoulaye Diallo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-primary py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {mutation.isPending ? "…" : "Créer mon espace"}
        </button>
      </form>
    </div>
  );
}
