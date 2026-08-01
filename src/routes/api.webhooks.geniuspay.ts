// ============================================================
// DÉPRÉCIÉ — on est passé de GeniusPay à Kivvi Pay.
// Voir src/routes/api.webhooks.kivvi.ts pour le webhook actif.
// Ce fichier reste en place (route morte) plutôt que d'être supprimé
// pour ne pas casser la génération de routeTree si des références
// traînent ; il ne fait plus rien d'actif.
// ============================================================
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/geniuspay")({
  server: {
    handlers: {
      POST: async () =>
        Response.json({ status: 410, detail: "Ce webhook n'est plus utilisé." }, { status: 410 }),
    },
  },
});
