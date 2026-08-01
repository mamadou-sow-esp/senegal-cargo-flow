// ============================================================
// DÉPRÉCIÉ — on est passé de l'API Wave directe à Kivvi Pay (qui
// encaisse via Wave sans compte Wave Business / NINEA / RCCM côté
// ORUS TRANSIT). Voir src/routes/api.webhooks.kivvi.ts pour le
// webhook actif. Ce fichier reste en place (route morte) plutôt que
// d'être supprimé pour ne pas casser la génération de routeTree.
// ============================================================
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/wave")({
  server: {
    handlers: {
      POST: async () =>
        Response.json({ status: 410, detail: "Ce webhook n'est plus utilisé." }, { status: 410 }),
    },
  },
});
