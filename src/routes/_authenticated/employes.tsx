import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employes")({
  component: () => <ComingSoon title="Employés" />,
});

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Construction className="mx-auto size-8 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cette section arrive bientôt. Vos données sont déjà en place — l'interface
        de gestion est en cours de finalisation.
      </p>
    </div>
  );
}
