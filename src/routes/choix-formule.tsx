import { createFileRoute, redirect } from "@tanstack/react-router";

// L'essai est désormais activé automatiquement à la création du compte :
// il n'y a plus d'écran de choix de formule. On redirige vers le tableau de bord.
export const Route = createFileRoute("/choix-formule")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
