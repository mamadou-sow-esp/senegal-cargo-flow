import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Les données restent « fraîches » 1 min : revenir sur une page déjà
        // visitée n'entraîne plus de rechargement réseau → navigation instantanée.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Précharge le code de la route au survol / focus → navigation quasi instantanée.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
